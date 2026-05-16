import BaseApiService from '../baseApiService';

export interface PartyOutstanding {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
}

export interface PartyTransaction {
  date: string;         // YYYYMMDD from Tally
  voucherType: string;
  voucherNumber: string;
  narration: string;
  drAmount: number;     // Debit side  (invoice/bill  raised on party)
  crAmount: number;     // Credit side (payment/receipt received from party)
}

export default class OutstandingApiService extends BaseApiService {

  /** Fetch Sundry Debtors (customers who owe us money) */
  async getReceivableParties(company: string): Promise<PartyOutstanding[]> {
    return this.fetchPartyLedgers(company, 'debtor');
  }

  /** Fetch Sundry Creditors (vendors we owe money to) */
  async getPayableParties(company: string): Promise<PartyOutstanding[]> {
    return this.fetchPartyLedgers(company, 'creditor');
  }

  private async fetchPartyLedgers(company: string, type: 'debtor' | 'creditor'): Promise<PartyOutstanding[]> {
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
    const all = this.parseLedgers(response);

    const DEBTOR_KW   = ['sundry debtor', 'debtor', 'receivable', 'trade receiv', 'accounts receiv'];
    const CREDITOR_KW = ['sundry creditor', 'creditor', 'payable', 'trade payab', 'accounts payab'];
    const keywords    = type === 'debtor' ? DEBTOR_KW : CREDITOR_KW;

    return all
      .filter(l => keywords.some(k => l.parent.toLowerCase().includes(k)))
      .filter(l => l.closingBalance !== 0)
      .sort((a, b) => Math.abs(b.closingBalance) - Math.abs(a.closingBalance));
  }

  private parseLedgers(xmlText: string): PartyOutstanding[] {
    const doc    = this.parseXML(this.cleanXmlStr(xmlText));
    const result: PartyOutstanding[] = [];

    Array.from(doc.getElementsByTagName('LEDGER')).forEach(node => {
      const name    = (node.getAttribute('NAME') || node.getElementsByTagName('NAME')[0]?.textContent || '').trim();
      if (!name) return;
      const parent  = node.getElementsByTagName('PARENT')[0]?.textContent?.trim() ?? '';
      const opening = this.parseAmount(node.getElementsByTagName('OPENINGBALANCE')[0]?.textContent ?? '0');
      const closing = this.parseAmount(node.getElementsByTagName('CLOSINGBALANCE')[0]?.textContent ?? '0');
      result.push({ name, parent, openingBalance: opening, closingBalance: closing });
    });

    return result;
  }

  /**
   * Fetch all vouchers for a party using PARTYLEDGERNAME filter (server-side).
   * Much faster than downloading the full Day Book.
   * Covers: Sales, Purchase, Receipt, Payment vouchers.
   * For Dr/Cr amounts: scans ALLLEDGERENTRIES.LIST for the party's entry.
   */
  async getPartyTransactions(
    company: string,
    partyName: string,
    fromDate: string,  // YYYYMMDD
    toDate: string     // YYYYMMDD
  ): Promise<PartyTransaction[]> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>PartyVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="PartyVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, VOUCHERTYPENAME, AMOUNT, NARRATION, BASICNARRATION, PARTYLEDGERNAME</FETCH>
            <FETCH>ALLLEDGERENTRIES.LIST : LEDGERNAME, AMOUNT, ISDEEMEDPOSITIVE</FETCH>
            <FILTER>IsPartyVoucher</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="IsPartyVoucher">
            $PARTYLEDGERNAME = "${partyName}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseVouchers(response, partyName);
  }

  private parseVouchers(xmlText: string, partyName: string): PartyTransaction[] {
    const doc        = this.parseXML(this.cleanXmlStr(xmlText));
    const partyLower = partyName.trim().toLowerCase();
    const txns: PartyTransaction[] = [];

    Array.from(doc.getElementsByTagName('VOUCHER')).forEach(v => {
      const date          = v.getElementsByTagName('DATE')[0]?.textContent?.trim() ?? '';
      const voucherType   = (v.getAttribute('VCHTYPE') ?? v.getElementsByTagName('VOUCHERTYPENAME')[0]?.textContent ?? '').trim();
      const voucherNumber = v.getElementsByTagName('VOUCHERNUMBER')[0]?.textContent?.trim() ?? '';
      const narration     = (v.getElementsByTagName('NARRATION')[0] ?? v.getElementsByTagName('BASICNARRATION')[0])?.textContent?.trim() ?? '';

      if (!date || !voucherType) return;

      let drAmt = 0;
      let crAmt = 0;

      // Scan ALLLEDGERENTRIES.LIST for this party's entry
      Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')).forEach(entry => {
        const lName = entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? '';
        if (lName.toLowerCase() !== partyLower) return;

        const amt              = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
        const isDeemedPositive = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]?.textContent?.trim().toLowerCase() === 'yes';

        // Tally sign convention:
        //   ISDEEMEDPOSITIVE=Yes  â†’ Debit entry  (Dr) - party owes us more / we owe vendor more
        //   ISDEEMEDPOSITIVE=No   â†’ Credit entry (Cr) - payment received / payment made
        if (isDeemedPositive) drAmt += Math.abs(amt);
        else                   crAmt += Math.abs(amt);
      });

      // If ALLLEDGERENTRIES didn't have the party entry (some Tally versions omit it),
      // fall back to voucher-level amount + classify by voucher type
      if (drAmt === 0 && crAmt === 0) {
        const vAmt  = Math.abs(parseFloat(v.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0);
        const lower = voucherType.toLowerCase();
        if (lower.includes('sales') || lower.includes('purchase') || lower.includes('debit note') || lower.includes('credit note')) {
          drAmt = vAmt;
        } else {
          crAmt = vAmt;
        }
      }

      if (drAmt === 0 && crAmt === 0) return;

      txns.push({ date, voucherType, voucherNumber, narration, drAmount: drAmt, crAmount: crAmt });
    });

    return txns.sort((a, b) => a.date.localeCompare(b.date));
  }

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private cleanXmlStr(xml: string): string {
    return xml
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/gi, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
}
