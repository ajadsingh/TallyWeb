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
  parent: string;         // Group (e.g. "Indirect Expenses", "Direct Expenses")
  openingBalance: number;
  closingBalance: number; // Year-to-date total spend on this ledger
}

export interface ExpenseVoucher {
  date: string;           // DD/MM/YYYY
  voucherType: string;
  voucherNumber: string;
  narration: string;
  amount: number;
  partyName: string;
  guid: string;
}

export default class ExpensesApiService extends BaseApiService {

  // ─── Date helpers (same pattern as SalesApiService) ───────────────────────

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
        toDate = new Date(today.getFullYear(), today.getMonth(), 0);
        label = fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        break;
      case 'last3months':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        toDate = new Date(today);
        label = 'Last 3 Months';
        break;
      case 'currentYear': {
        const m = today.getMonth();
        const y = today.getFullYear();
        fromDate = m >= 3 ? new Date(y, 3, 1) : new Date(y - 1, 3, 1);
        toDate = new Date(today);
        const fs = fromDate.getFullYear();
        label = `FY ${fs}-${(fs + 1).toString().slice(-2)} (Current FY)`;
        break;
      }
      case 'lastYear': {
        const m = today.getMonth();
        const y = today.getFullYear();
        const fs = m >= 3 ? y - 1 : y - 2;
        fromDate = new Date(fs, 3, 1);
        toDate = new Date(fs + 1, 2, 31);
        label = `FY ${fs}-${(fs + 1).toString().slice(-2)} (Previous FY)`;
        break;
      }
      case 'custom':
        fromDate = customFromDate ?? new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = customToDate ?? new Date(today);
        label = `${fromDate.toLocaleDateString()} – ${toDate.toLocaleDateString()}`;
        break;
      case 'currentMonth':
      default:
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
    }
    return { fromDate, toDate, label };
  }

  private fmtDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  // ─── API Methods ───────────────────────────────────────────────────────────

  /**
   * Fetch all expense ledgers from Tally (Direct + Indirect Expenses groups)
   * Uses TDL filter: $$IsExpenses:$Parent
   */
  async getExpenseLedgers(companyName: string): Promise<ExpenseLedger[]> {
    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>AllExpenseLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllExpenseLedgers" ISMODIFY="No">
            <TYPE>Ledger</TYPE>
            <FILTER>ExpenseLedgerFilter</FILTER>
            <FETCH>Name</FETCH>
            <FETCH>Parent</FETCH>
            <FETCH>OpeningBalance</FETCH>
            <FETCH>ClosingBalance</FETCH>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="ExpenseLedgerFilter">$$IsExpenses:$Parent</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xmlRequest);
    return this.parseExpenseLedgers(response);
  }

  /**
   * Fetch Journal + Payment vouchers for the given date range.
   * These are the primary voucher types that record expense transactions.
   */
  async getExpenseVouchers(
    companyName: string,
    option: DateRangeOption = 'currentMonth',
    customFrom?: Date,
    customTo?: Date
  ): Promise<ExpenseVoucher[]> {
    const { fromDate, toDate } = this.getDateRange(option, customFrom, customTo);
    const from = this.fmtDate(fromDate);
    const to = this.fmtDate(toDate);

    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>ExpenseVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="DATE">${from}</SVFROMDATE>
        <SVTODATE TYPE="DATE">${to}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="ExpenseVouchers" ISMODIFY="No" ISINITIALIZE="Yes">
            <TYPE>Voucher</TYPE>
            <FILTER>ExpenseVoucherFilter</FILTER>
            <FETCH>DATE</FETCH>
            <FETCH>VOUCHERTYPENAME</FETCH>
            <FETCH>VOUCHERNUMBER</FETCH>
            <FETCH>NARRATION</FETCH>
            <FETCH>AMOUNT</FETCH>
            <FETCH>PARTYLEDGERNAME</FETCH>
            <FETCH>GUID</FETCH>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="ExpenseVoucherFilter">
            $$IsJournal:$VOUCHERTYPENAME OR $$IsPayment:$VOUCHERTYPENAME
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xmlRequest);
    return this.parseExpenseVouchers(response);
  }

  // ─── Parsers ──────────────────────────────────────────────────────────────

  private parseExpenseLedgers(xmlText: string): ExpenseLedger[] {
    const doc = this.parseXML(xmlText);
    const ledgers: ExpenseLedger[] = [];

    doc.querySelectorAll('LEDGER').forEach((node) => {
      const name = (
        node.getAttribute('NAME') ||
        node.querySelector('NAME')?.textContent ||
        ''
      ).trim();
      if (!name) return;

      const parent = node.querySelector('PARENT')?.textContent?.trim() || '';
      const openingBalance = this.parseAmount(
        node.querySelector('OPENINGBALANCE')?.textContent || '0'
      );
      const closingBalance = this.parseAmount(
        node.querySelector('CLOSINGBALANCE')?.textContent || '0'
      );

      ledgers.push({ name, parent, openingBalance, closingBalance });
    });

    // Sort by closing balance descending (highest spend first)
    return ledgers.sort(
      (a, b) => Math.abs(b.closingBalance) - Math.abs(a.closingBalance)
    );
  }

  private parseExpenseVouchers(xmlText: string): ExpenseVoucher[] {
    const doc = this.parseXML(xmlText);
    const vouchers: ExpenseVoucher[] = [];

    doc.querySelectorAll('VOUCHER').forEach((node) => {
      const rawDate = node.querySelector('DATE')?.textContent?.trim() || '';
      const voucherType =
        node.querySelector('VOUCHERTYPENAME')?.textContent?.trim() || '';
      const voucherNumber =
        node.querySelector('VOUCHERNUMBER')?.textContent?.trim() || '';
      const narration =
        node.querySelector('NARRATION')?.textContent?.trim() || '';
      const amountText =
        node.querySelector('AMOUNT')?.textContent?.trim() || '0';
      const partyName =
        node.querySelector('PARTYLEDGERNAME')?.textContent?.trim() || '';
      const guid = node.querySelector('GUID')?.textContent?.trim() || '';

      if (!rawDate || !voucherType) return;

      // Convert YYYYMMDD → DD/MM/YYYY
      let date = rawDate;
      if (rawDate.length === 8) {
        date = `${rawDate.slice(6, 8)}/${rawDate.slice(4, 6)}/${rawDate.slice(0, 4)}`;
      }

      vouchers.push({
        date,
        voucherType,
        voucherNumber,
        narration,
        amount: Math.abs(this.parseAmount(amountText)),
        partyName,
        guid,
      });
    });

    // Chronological order (oldest first)
    return vouchers.sort((a, b) => {
      // date is DD/MM/YYYY
      const parse = (s: string) => {
        const [d, m, y] = s.split('/');
        return new Date(+y, +m - 1, +d).getTime();
      };
      return parse(a.date) - parse(b.date);
    });
  }
}
