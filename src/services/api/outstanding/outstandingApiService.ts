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

export interface VoucherLedgerEntry {
  ledgerName: string;
  amount: number;
  isDr: boolean;
}

export interface InventoryEntry {
  itemName: string;
  qty: string;    // e.g. "10 Nos"
  rate: string;   // e.g. "100/Nos"
  amount: number;
}

export interface VoucherDetail {
  date: string;
  voucherType: string;
  voucherNumber: string;
  narration: string;
  partyName: string;
  inventoryEntries: InventoryEntry[];
  entries: VoucherLedgerEntry[];
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
   * Fetch all vouchers for a party using PARTYLEDGERNAME server-side filter.
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

      // Check both ALLLEDGERENTRIES.LIST (TDL collection) AND LEDGERENTRIES.LIST (Day Book)
      const allEntryNodes = [
        ...Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ...Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')),
      ];

      allEntryNodes.forEach(entry => {
        const lName = entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? '';
        if (lName.toLowerCase() !== partyLower) return;

        const rawAmt = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
        if (rawAmt === 0) return;

        const dpTag = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]?.textContent?.trim().toLowerCase();
        let isDr: boolean;
        if (dpTag === 'yes')     isDr = true;
        else if (dpTag === 'no') isDr = false;
        else                     isDr = rawAmt < 0;

        if (isDr) drAmt += Math.abs(rawAmt);
        else      crAmt += Math.abs(rawAmt);
      });

      // Party NOT found in this voucher's ledger entries - skip entirely.
      // Do NOT fall back to adding all vouchers; that would pollute every party's transaction list.
      if (drAmt === 0 && crAmt === 0) return;

      txns.push({ date, voucherType, voucherNumber, narration, drAmount: drAmt, crAmount: crAmt });
    });

    return txns.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Helpers

  private cleanXmlStr(xml: string): string {
    return xml
      // Fix unescaped & (party names like "ABC & Co") — must be first
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/gi, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  /**
   * Fetch the full ledger breakdown of a single voucher.
   * Uses Day Book for the exact date (1-day range) — no TDL FILTER to avoid
   * Tally c0000005 memory access violation crash.
   * Client-side picks the matching voucher by number.
   */
  async getVoucherDetail(
    company: string,
    voucherNumber: string,
    date: string,        // YYYYMMDD
    voucherType?: string // optional — used as secondary filter to avoid wrong-voucher match
  ): Promise<VoucherDetail | null> {
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
        <SVFROMDATE TYPE="Date">${date}</SVFROMDATE>
        <SVTODATE TYPE="Date">${date}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseVoucherDetail(response, voucherNumber, voucherType);
  }

  private parseVoucherDetail(xmlText: string, voucherNumber: string, voucherType?: string): VoucherDetail | null {
    const norm   = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const target = norm(voucherNumber);

    // Block-split: parse each <VOUCHER> independently so one bad block
    // doesn't prevent finding the correct voucher.
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
        const cleaned = this.cleanXmlStr(chunk);
        const doc = this.parseXML(`<R>${cleaned}</R>`);
        if (doc.querySelector('parsererror')) continue;

        const v = doc.getElementsByTagName('VOUCHER')[0];
        if (!v) continue;

        // Check if this is the voucher we want
        const rawNum = v.getElementsByTagName('VOUCHERNUMBER')[0]?.textContent?.trim() ?? '';
        const n      = norm(rawNum);

        // Strict match: both must be non-empty; exact match preferred;
        // substring match only when both parts are meaningfully long (>=5 chars)
        if (n === '' || target === '') continue;
        const numMatched =
          n === target ||
          (n.length >= 5 && target.length >= 5 && (n.includes(target) || target.includes(n)));
        if (!numMatched) continue;

        // Optional secondary filter: voucherType (prevents same-day, same-number false positives)
        if (voucherType && voucherType.trim() !== '') {
          const xmlType = (v.getAttribute('VCHTYPE') || v.getElementsByTagName('VOUCHERTYPENAME')[0]?.textContent || '').trim().toLowerCase();
          const wantType = voucherType.trim().toLowerCase();
          // Allow if one name contains the other (handles "Sales" vs "Tax Invoice")
          const typeOk = xmlType === wantType || xmlType.includes(wantType) || wantType.includes(xmlType);
          if (!typeOk) continue;
        }

        // ── Extract fields ───────────────────────────────────────────────────
        const gt = (tag: string) => v.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

        const date          = gt('DATE');
        const voucherNumXml = rawNum || voucherNumber;
        const xmlVoucherType = (v.getAttribute('VCHTYPE') || gt('VOUCHERTYPENAME')).trim();
        const narration     = gt('NARRATION') || gt('BASICNARRATION');
        const partyName     = gt('PARTYLEDGERNAME') || gt('BASICBUYERNAME') || gt('PARTYNAME');

        // ── Inventory entries ─────────────────────────────────────────────────
        const inventoryEntries: InventoryEntry[] = [];
        const invNodes = [
          ...Array.from(v.getElementsByTagName('INVENTORYENTRIES.LIST')),
          ...Array.from(v.getElementsByTagName('ALLINVENTORYENTRIES.LIST')),
        ];
        invNodes.forEach(node => {
          const itemName = node.getElementsByTagName('STOCKITEMNAME')[0]?.textContent?.trim() ?? '';
          if (!itemName) return;
          const qty    = node.getElementsByTagName('ACTUALQTY')[0]?.textContent?.trim()
                      ?? node.getElementsByTagName('BILLEDQTY')[0]?.textContent?.trim()
                      ?? '';
          const rate   = node.getElementsByTagName('RATE')[0]?.textContent?.trim() ?? '';
          const rawAmt = parseFloat(node.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
          inventoryEntries.push({ itemName, qty, rate, amount: Math.abs(rawAmt) });
        });

        // ── Ledger entries ────────────────────────────────────────────────────
        const entries: VoucherLedgerEntry[] = [];
        const entryNodes = [
          ...Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')),
          ...Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ];
        entryNodes.forEach(entry => {
          const ledgerName = entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? '';
          if (!ledgerName) return;
          const rawAmt = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
          if (rawAmt === 0) return;
          const dpTag = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]?.textContent?.trim().toLowerCase();
          let isDr: boolean;
          if (dpTag === 'yes')     isDr = true;
          else if (dpTag === 'no') isDr = false;
          else                     isDr = rawAmt < 0;
          entries.push({ ledgerName, amount: Math.abs(rawAmt), isDr });
        });

        return { date, voucherType: xmlVoucherType, voucherNumber: voucherNumXml, narration, partyName, inventoryEntries, entries };

      } catch {
        // skip malformed block, keep searching
      }
    }

    // No matching voucher found in any block
    return null;
  }
}
