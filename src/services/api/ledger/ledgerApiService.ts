import BaseApiService from '../baseApiService';

export interface TallyLedger {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
}

export interface LedgerTransaction {
  date: string;         // YYYYMMDD
  voucherType: string;
  voucherNumber: string;
  narration: string;
  drAmount: number;
  crAmount: number;
}

export default class LedgerApiService extends BaseApiService {

  /** Fetch all ledgers with opening/closing balance */
  async getLedgerList(company: string): Promise<TallyLedger[]> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME, PARENT, OPENINGBALANCE, CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseLedgerList(response);
  }

  /** Fetch transactions for a specific ledger using Day Book (safe â€” no TDL filter crash) */
  async getLedgerTransactions(
    company: string,
    ledgerName: string,
    fromDate: string,  // YYYYMMDD
    toDate: string     // YYYYMMDD
  ): Promise<LedgerTransaction[]> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseTransactions(response, ledgerName);
  }

  // â”€â”€â”€ Parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private cleanXml(xml: string): string {
    return xml
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/gi, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  private parseLedgerList(xmlText: string): TallyLedger[] {
    const doc    = this.parseXML(this.cleanXml(xmlText));
    const result: TallyLedger[] = [];

    Array.from(doc.getElementsByTagName('LEDGER')).forEach(node => {
      const name    = (node.getAttribute('NAME') || node.getElementsByTagName('NAME')[0]?.textContent || '').trim();
      if (!name) return;
      const parent  = node.getElementsByTagName('PARENT')[0]?.textContent?.trim() ?? '';
      const opening = this.parseAmount(node.getElementsByTagName('OPENINGBALANCE')[0]?.textContent ?? '0');
      const closing = this.parseAmount(node.getElementsByTagName('CLOSINGBALANCE')[0]?.textContent ?? '0');
      result.push({ name, parent, openingBalance: opening, closingBalance: closing });
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  private parseTransactions(xmlText: string, ledgerName: string): LedgerTransaction[] {
    const ledgerLower = ledgerName.trim().toLowerCase();
    const txns: LedgerTransaction[] = [];

    // Block-split approach: parse each VOUCHER independently
    const OPEN  = '<VOUCHER';
    const CLOSE = '</VOUCHER>';
    const upper = xmlText.toUpperCase();
    let pos = 0;

    while (true) {
      const start = upper.indexOf(OPEN, pos);
      if (start === -1) break;
      const end = upper.indexOf(CLOSE, start);
      if (end === -1) break;
      const chunk = xmlText.slice(start, end + CLOSE.length);
      pos = end + CLOSE.length;

      try {
        const cleaned = this.cleanXml(chunk);
        const doc = this.parseXML(`<R>${cleaned}</R>`);
        if (doc.querySelector('parsererror')) continue;

        const voucher = doc.getElementsByTagName('VOUCHER')[0];
        if (!voucher) continue;

        const gt = (tag: string) =>
          voucher.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

        const date          = gt('DATE');
        const voucherType   = (voucher.getAttribute('VCHTYPE') || gt('VOUCHERTYPENAME')).trim();
        const voucherNumber = gt('VOUCHERNUMBER');
        const narration     = gt('NARRATION') || gt('BASICNARRATION');

        if (!date || !voucherType) continue;

        let drAmt = 0;
        let crAmt = 0;

        const entryNodes = [
          ...Array.from(voucher.getElementsByTagName('LEDGERENTRIES.LIST')),
          ...Array.from(voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ];

        entryNodes.forEach(entry => {
          const lName = entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? '';
          if (lName.toLowerCase() !== ledgerLower) return;

          const rawAmt = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
          if (rawAmt === 0) return;

          const dpTag = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]?.textContent?.trim().toLowerCase();
          let isDr: boolean;
          if (dpTag === 'yes')     isDr = true;
          else if (dpTag === 'no') isDr = false;
          else                     isDr = rawAmt < 0; // Day Book: negative = Dr

          if (isDr) drAmt += Math.abs(rawAmt);
          else      crAmt += Math.abs(rawAmt);
        });

        if (drAmt === 0 && crAmt === 0) continue;

        txns.push({ date, voucherType, voucherNumber, narration, drAmount: drAmt, crAmount: crAmt });
      } catch {
        // skip malformed block
      }
    }

    return txns.sort((a, b) => a.date.localeCompare(b.date));
  }
}
