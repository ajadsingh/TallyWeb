import BaseApiService from '../baseApiService';

export type DateRangeOption =
  | 'currentMonth'
  | 'lastMonth'
  | 'last3months'
  | 'currentYear'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  fromDate: Date;
  toDate: Date;
  label: string;
}

export interface ExpenseLedger {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
}

export interface ExpenseVoucher {
  date: string;          // DD/MM/YYYY
  voucherType: string;
  voucherNumber: string;
  narration: string;
  amount: number;
  partyName: string;
  guid: string;
}

export default class ExpensesApiService extends BaseApiService {

  // ── Date helpers ───────────────────────────────────────────────────────────

  getDateRange(
    option: DateRangeOption,
    customFromDate?: Date,
    customToDate?: Date
  ): DateRange {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date;
    let label: string;

    switch (option) {
      case 'lastMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate   = new Date(today.getFullYear(), today.getMonth(), 0);
        label    = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      case 'last3months':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        toDate   = new Date(today);
        label    = 'Last 3 Months';
        break;
      case 'currentYear': {
        const m = today.getMonth();
        const y = today.getFullYear();
        fromDate = m >= 3 ? new Date(y, 3, 1) : new Date(y - 1, 3, 1);
        toDate   = new Date(today);
        const fs = fromDate.getFullYear();
        label    = `FY ${fs}-${(fs + 1).toString().slice(-2)} (Current FY)`;
        break;
      }
      case 'lastYear': {
        const m = today.getMonth();
        const y = today.getFullYear();
        const fs = m >= 3 ? y - 1 : y - 2;
        fromDate = new Date(fs, 3, 1);
        toDate   = new Date(fs + 1, 2, 31);
        label    = `FY ${fs}-${(fs + 1).toString().slice(-2)} (Previous FY)`;
        break;
      }
      case 'custom':
        fromDate = customFromDate ?? new Date(today.getFullYear(), today.getMonth(), 1);
        toDate   = customToDate   ?? new Date(today);
        label    = `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
        break;
      case 'currentMonth':
      default:
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        label    = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
    }
    return { fromDate, toDate, label };
  }

  private fmtDate(d: Date): string {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private cleanXml(xml: string): string {
    return xml
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/gi, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  // ── API ────────────────────────────────────────────────────────────────────

  /**
   * Fetch all expense ledgers from Tally.
   * Safe: no TDL FILTER (avoids Tally c0000005 crash).
   * Fetches ALL ledgers, then filters client-side for expense groups.
   */
  async getExpenseLedgers(companyName: string): Promise<ExpenseLedger[]> {
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
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
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
    return this.parseExpenseLedgers(response);
  }

  /**
   * Fetch expense transactions using Day Book (safe — no TDL FILTER crash).
   * Block-splitter parser: handles bad XML in individual vouchers gracefully.
   * Returns Payment + Journal vouchers from the date range.
   */
  async getExpenseVouchers(
    companyName: string,
    option: DateRangeOption = 'currentMonth',
    customFrom?: Date,
    customTo?: Date
  ): Promise<ExpenseVoucher[]> {
    const { fromDate, toDate } = this.getDateRange(option, customFrom, customTo);
    const from = this.fmtDate(fromDate);
    const to   = this.fmtDate(toDate);

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
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${from}</SVFROMDATE>
        <SVTODATE TYPE="Date">${to}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseExpenseVouchers(response);
  }

  // ── Parsers ────────────────────────────────────────────────────────────────

  private parseExpenseLedgers(xmlText: string): ExpenseLedger[] {
    const doc     = this.parseXML(this.cleanXml(xmlText));
    const result: ExpenseLedger[] = [];

    Array.from(doc.getElementsByTagName('LEDGER')).forEach(node => {
      const name = (
        node.getAttribute('NAME') ||
        node.getElementsByTagName('NAME')[0]?.textContent ||
        ''
      ).trim();
      if (!name) return;

      const parent = node.getElementsByTagName('PARENT')[0]?.textContent?.trim() ?? '';

      // Client-side filter: only expense groups
      if (!parent.toLowerCase().includes('expense')) return;

      const openingBalance = this.parseAmount(
        node.getElementsByTagName('OPENINGBALANCE')[0]?.textContent ?? '0'
      );
      const closingBalance = this.parseAmount(
        node.getElementsByTagName('CLOSINGBALANCE')[0]?.textContent ?? '0'
      );

      result.push({ name, parent, openingBalance, closingBalance });
    });

    // Sort by absolute closing balance descending (highest spend first)
    return result.sort(
      (a, b) => Math.abs(b.closingBalance) - Math.abs(a.closingBalance)
    );
  }

  private parseExpenseVouchers(xmlText: string): ExpenseVoucher[] {
    const vouchers: ExpenseVoucher[] = [];

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

        const v = doc.getElementsByTagName('VOUCHER')[0];
        if (!v) continue;

        const gt = (tag: string) =>
          v.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

        const rawDate     = gt('DATE');
        const voucherType = (v.getAttribute('VCHTYPE') || gt('VOUCHERTYPENAME')).trim();
        if (!rawDate || !voucherType) continue;

        // Keep only Payment and Journal vouchers (expense-related)
        const vtLower = voucherType.toLowerCase();
        if (!vtLower.includes('payment') && !vtLower.includes('journal')) continue;

        const voucherNumber = gt('VOUCHERNUMBER');
        const narration     = gt('NARRATION') || gt('BASICNARRATION');
        const partyName     = gt('PARTYLEDGERNAME') || gt('BASICBUYERNAME') || gt('PARTYNAME');
        const guid          = gt('GUID');

        // Amount = max of total Dr or Cr side across all ledger entries
        let totalDr = 0;
        let totalCr = 0;
        const entryNodes = [
          ...Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')),
          ...Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ];
        entryNodes.forEach(entry => {
          const rawAmt = parseFloat(
            entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0'
          ) || 0;
          if (rawAmt === 0) return;
          const dpTag = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]
            ?.textContent?.trim().toLowerCase();
          const isDr = dpTag === 'yes' ? true : dpTag === 'no' ? false : rawAmt < 0;
          if (isDr) totalDr += Math.abs(rawAmt);
          else      totalCr += Math.abs(rawAmt);
        });
        const amount = Math.max(totalDr, totalCr);
        if (amount === 0) continue;

        // Convert YYYYMMDD to DD/MM/YYYY
        let date = rawDate;
        if (rawDate.length === 8) {
          date = `${rawDate.slice(6)}/${rawDate.slice(4, 6)}/${rawDate.slice(0, 4)}`;
        }

        vouchers.push({ date, voucherType, voucherNumber, narration, amount, partyName, guid });
      } catch {
        // skip malformed block
      }
    }

    // Chronological order
    const parse = (s: string) => {
      const [d, m, y] = s.split('/');
      return new Date(+y, +m - 1, +d).getTime();
    };
    return vouchers.sort((a, b) => parse(a.date) - parse(b.date));
  }
}
