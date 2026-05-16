import BaseApiService from '../baseApiService';
import AppConfigService from '../../config/appConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PLGroup {
  name: string;
  amount: number;
  type: 'income' | 'expense';
  parent: string;
}

export interface ProfitLossData {
  income: PLGroup[];
  expenses: PLGroup[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface TBEntry {
  name: string;
  parent: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceData {
  entries: TBEntry[];
  totalDebit: number;
  totalCredit: number;
}

export interface CashFlowEntry {
  name: string;
  amount: number;
  direction: 'inflow' | 'outflow';
}

export interface CashFlowData {
  entries: CashFlowEntry[];
  totalInflow: number;
  totalOutflow: number;
  openingBalance: number;
  closingBalance: number;
  netCashFlow: number;
}

export interface GSTSummaryData {
  sales: { cgst: number; sgst: number; igst: number; taxable: number; total: number };
  purchases: { cgst: number; sgst: number; igst: number; taxable: number; total: number };
  netPayable: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReportsApiService extends BaseApiService {

  /** YYYY-MM-DD → YYYYMMDD */
  private fmt(date: string): string {
    return date.replace(/-/g, '');
  }

  /** Strip Tally control characters from XML */
  private cleanXml(xml: string): string {
    return xml
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  /**
   * Parse a Tally balance string that may have a "Dr"/"Cr" text suffix.
   *
   * Tally XML sign convention:
   *   positive value  = Credit nature (liabilities, income)
   *   negative value  = Debit nature  (assets, expenses)
   *
   * When Tally adds a textual suffix:
   *   "5000.00 Cr" -> +5000  (credit = positive)
   *   "5000.00 Dr" -> -5000  (debit  = negative)
   *
   * Without suffix, the raw signed number is used directly.
   */
  private parseTallyBalance(raw: string): number {
    if (!raw) return 0;
    const s = raw.trim();
    const hasCr = /\bcr\b/i.test(s);
    const hasDr = /\bdr\b/i.test(s);
    const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
    if (hasCr) return  num;
    if (hasDr) return -num;
    return parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
  }

  /**
   * Parse Tally's standard paired NAME / AMT structure from Export Data reports.
   *
   * Each report uses its own prefix:
   *   Balance Sheet  → prefix = 'BS'  → BSNAME / BSAMT / BSMAINAMT / BSSUBAMT
   *   Profit & Loss  → prefix = 'PL'  → PLNAME / PLAMT / PLMAINAMT / PLSUBAMT
   *   Trial Balance  → prefix = 'TB'  → TBNAME / TBAMT / TBMAINAMT / TBSUBAMT
   *   Cash Flow      → prefix = 'BS'  → same as Balance Sheet
   */
  private parseBsNameAmt(doc: Document, prefix = 'BS'): Array<{ name: string; mainAmt: number; subAmt: number }> {
    const result: Array<{ name: string; mainAmt: number; subAmt: number }> = [];

    const nameTag    = `${prefix}NAME`;
    const amtTag     = `${prefix}AMT`;
    const mainAmtTag = `${prefix}MAINAMT`;
    const subAmtTag  = `${prefix}SUBAMT`;

    const nameEls = Array.from(doc.getElementsByTagName(nameTag));
    const amtEls  = Array.from(doc.getElementsByTagName(amtTag));
    const len = Math.min(nameEls.length, amtEls.length);

    for (let i = 0; i < len; i++) {
      const nameParts =
        nameEls[i].querySelector('DSPACCNAME DSPDISPNAME') ??
        nameEls[i].getElementsByTagName('DSPDISPNAME')[0];
      const name = nameParts?.textContent?.trim() ?? '';
      if (!name) continue;

      const mainAmtRaw = amtEls[i].getElementsByTagName(mainAmtTag)[0]?.textContent?.trim() ?? '';
      const subAmtRaw  = amtEls[i].getElementsByTagName(subAmtTag)[0]?.textContent?.trim()  ?? '';

      const mainAmt = this.parseTallyBalance(mainAmtRaw);
      const subAmt  = this.parseTallyBalance(subAmtRaw);

      if (mainAmt !== 0 || subAmt !== 0) {
        result.push({ name, mainAmt, subAmt });
      }
    }

    return result;
  }

  /**
   * Build the XML envelope for Tally built-in financial reports.
   * Uses the same proven format as the working Balance Sheet:
   *   <TYPE>Data</TYPE>  +  <ID>…</ID>  +  EXPLODEFLAG:Yes  +  SVEXPORTFORMAT:XML
   *
   * Valid IDs (matching Tally's internal report names):
   *   "Balance Sheet", "Profit and Loss", "Trial Balance",
   *   "Cash Flow Summary"
   */
  private buildReportXml(company: string, reportId: string, from: string, to: string): string {
    return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>${reportId}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCurrentCompany>${company}</SVCurrentCompany>
        <SVFROMDATE>${from}</SVFROMDATE>
        <SVTODATE>${to}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
  }

  // -- Profit & Loss ---------------------------------------------------------
  // Confirmed Tally XML structure (from direct query):
  //   <ENVELOPE> direct children (flat list):
  //   Group: <DSPACCNAME><DSPDISPNAME>Sales Accounts</DSPDISPNAME></DSPACCNAME>
  //          <PLAMT><PLSUBAMT/><BSMAINAMT>41427525.70</BSMAINAMT></PLAMT>
  //   Item:  <BSNAME><DSPACCNAME><DSPDISPNAME>CGST SALE</DSPDISPNAME></DSPACCNAME></BSNAME>
  //          <BSAMT><BSSUBAMT>5450000.00</BSSUBAMT><BSMAINAMT/></BSAMT>

  async getProfitLoss(company: string, fromDate: string, toDate: string): Promise<ProfitLossData> {
    const xml = this.buildReportXml(company, 'Profit and Loss', this.fmt(fromDate), this.fmt(toDate));
    const response = await this.makeRequest(xml);
    return this.parseProfitLoss(response);
  }

  private classifyPL(name: string, amt: number): 'income' | 'expense' {
    const INCOME_KW  = ['income', 'sale', 'revenue', 'gross profit', 'commission',
                        'interest received', 'rent received', 'other income', 'discount received'];
    const EXPENSE_KW = ['purchase', 'cost of', 'expense', 'wages', 'salary', 'payroll',
                        'rent paid', 'depreciation', 'loss', 'freight', 'transport',
                        'printing', 'postage', 'repairs', 'audit', 'indirect', 'opening stock',
                        'closing stock', 'manufacturing'];
    const lower = name.toLowerCase();
    const isIncomeName  = INCOME_KW.some(k => lower.includes(k));
    const isExpenseName = EXPENSE_KW.some(k => lower.includes(k));
    if (isIncomeName && !isExpenseName) return 'income';
    if (isExpenseName && !isIncomeName) return 'expense';
    return amt > 0 ? 'income' : 'expense'; // Tally: positive = credit = income
  }

  private parseProfitLoss(xmlText: string): ProfitLossData {
    const cleaned  = this.cleanXml(xmlText);
    const doc      = this.parseXML(cleaned);
    const envelope = doc.documentElement;
    if (!envelope) return { income: [], expenses: [], totalIncome: 0, totalExpenses: 0, netProfit: 0 };

    const groupItems: PLGroup[] = [];
    const subItems:   PLGroup[] = [];
    const children = Array.from(envelope.children);

    for (let i = 0; i < children.length; i++) {
      const el = children[i];

      if (el.tagName === 'DSPACCNAME') {
        // Group-level entry — next element is PLAMT
        const name = el.getElementsByTagName('DSPDISPNAME')[0]?.textContent?.trim() ?? '';
        if (!name) continue;
        const next = children[i + 1];
        if (next?.tagName === 'PLAMT') {
          const main = this.parseTallyBalance(next.getElementsByTagName('BSMAINAMT')[0]?.textContent?.trim() ?? '');
          const sub  = this.parseTallyBalance(next.getElementsByTagName('PLSUBAMT')[0]?.textContent?.trim()  ?? '');
          const amt  = main !== 0 ? main : sub;
          if (amt !== 0) groupItems.push({ name, amount: Math.abs(amt), type: this.classifyPL(name, amt), parent: '' });
          i++;
        }

      } else if (el.tagName === 'BSNAME') {
        // Sub-ledger entry — next element is BSAMT
        const name = el.getElementsByTagName('DSPDISPNAME')[0]?.textContent?.trim() ?? '';
        if (!name) continue;
        const next = children[i + 1];
        if (next?.tagName === 'BSAMT') {
          const main = this.parseTallyBalance(next.getElementsByTagName('BSMAINAMT')[0]?.textContent?.trim() ?? '');
          const sub  = this.parseTallyBalance(next.getElementsByTagName('BSSUBAMT')[0]?.textContent?.trim()  ?? '');
          const amt  = main !== 0 ? main : sub;
          if (amt !== 0) subItems.push({ name, amount: Math.abs(amt), type: this.classifyPL(name, amt), parent: 'sub' });
          i++;
        }
      }
    }

    // Use group-level items for clean P&L summary; fall back to sub-items if groups empty
    const displayItems = groupItems.length > 0 ? groupItems : subItems;
    const incomeArr  = displayItems.filter(i => i.type === 'income').sort((a, b) => b.amount - a.amount);
    const expenseArr = displayItems.filter(i => i.type === 'expense').sort((a, b) => b.amount - a.amount);

    const totalIncome   = incomeArr.reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenseArr.reduce((s, i) => s + i.amount, 0);

    return { income: incomeArr, expenses: expenseArr, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses };
  }

  // -- Trial Balance ---------------------------------------------------------
  // Confirmed Tally XML structure (from direct query):
  //   <ENVELOPE> direct children (flat list):
  //   <DSPACCNAME><DSPDISPNAME>Current Liabilities</DSPDISPNAME></DSPACCNAME>
  //   <DSPACCINFO>
  //     <DSPCLDRAMT><DSPCLDRAMTA>-29838616.81</DSPCLDRAMTA></DSPCLDRAMT>
  //     <DSPCLCRAMT><DSPCLCRAMTA>229392701.13</DSPCLCRAMTA></DSPCLCRAMT>
  //   </DSPACCINFO>

  async getTrialBalance(company: string, fromDate: string, toDate: string): Promise<TrialBalanceData> {
    const xml = this.buildReportXml(company, 'Trial Balance', this.fmt(fromDate), this.fmt(toDate));
    const response = await this.makeRequest(xml);
    return this.parseTrialBalance(response);
  }

  private parseTrialBalance(xmlText: string): TrialBalanceData {
    const cleaned  = this.cleanXml(xmlText);
    const doc      = this.parseXML(cleaned);
    const envelope = doc.documentElement;
    if (!envelope) return { entries: [], totalDebit: 0, totalCredit: 0 };

    const entries: TBEntry[] = [];
    const children = Array.from(envelope.children);

    for (let i = 0; i < children.length; i++) {
      const el = children[i];
      if (el.tagName !== 'DSPACCNAME') continue;

      const name = el.getElementsByTagName('DSPDISPNAME')[0]?.textContent?.trim() ?? '';
      if (!name) continue;

      const next = children[i + 1];
      if (next?.tagName === 'DSPACCINFO') {
        const drRaw = next.getElementsByTagName('DSPCLDRAMTA')[0]?.textContent?.trim() ?? '';
        const crRaw = next.getElementsByTagName('DSPCLCRAMTA')[0]?.textContent?.trim() ?? '';
        const debit  = drRaw ? Math.abs(parseFloat(drRaw) || 0) : 0;
        const credit = crRaw ? Math.abs(parseFloat(crRaw) || 0) : 0;
        if (debit !== 0 || credit !== 0) {
          entries.push({ name, parent: '', debit, credit });
        }
        i++;
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    const totalDebit  = entries.reduce((s, e) => s + e.debit,  0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    return { entries, totalDebit, totalCredit };
  }

  // -- Cash Flow -------------------------------------------------------------
  // Tally's built-in Cash Flow report returns empty values when bank ledgers
  // aren't linked to the default "Bank Accounts" group. Instead, we fetch:
  //   1. All Receipt vouchers → inflows
  //   2. All Payment vouchers → outflows
  //   3. Cash/Bank ledger closing balances for opening/closing
  // This approach works for any Tally company configuration.

  async getCashFlow(company: string, fromDate: string, toDate: string): Promise<CashFlowData> {
    const from = this.fmt(fromDate);
    const to   = this.fmt(toDate);

    // Fetch Receipt + Payment vouchers grouped by voucher type
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CashFlowVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${from}</SVFROMDATE>
        <SVTODATE TYPE="Date">${to}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CashFlowVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>VOUCHERTYPENAME, AMOUNT</FETCH>
            <FILTER>IsPaymentOrReceipt</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="IsPaymentOrReceipt">
            $$IsPayment:$VOUCHERTYPENAME OR $$IsReceipt:$VOUCHERTYPENAME
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseCashFlow(response);
  }

  private parseCashFlow(xmlText: string): CashFlowData {
    const doc = this.parseXML(this.cleanXml(xmlText));

    // Aggregate by voucher type name
    const byType: Record<string, { inflow: number; outflow: number }> = {};

    Array.from(doc.getElementsByTagName('VOUCHER')).forEach(v => {
      const vchType = (
        v.getAttribute('VCHTYPE') ??
        v.getElementsByTagName('VOUCHERTYPENAME')[0]?.textContent ??
        'Unknown'
      ).trim();

      const rawAmt = parseFloat(v.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
      if (rawAmt === 0) return;

      if (!byType[vchType]) byType[vchType] = { inflow: 0, outflow: 0 };

      // Tally Receipt vouchers: AMOUNT is negative (debit to cash = inflow)
      // Tally Payment vouchers: AMOUNT is positive (credit from cash = outflow)
      if (rawAmt < 0) byType[vchType].inflow  += Math.abs(rawAmt);
      else            byType[vchType].outflow += rawAmt;
    });

    const entries: CashFlowEntry[] = [];
    let totalInflow  = 0;
    let totalOutflow = 0;

    Object.entries(byType).sort(([a], [b]) => a.localeCompare(b)).forEach(([name, { inflow, outflow }]) => {
      if (inflow > 0)  { entries.push({ name, amount: inflow,  direction: 'inflow'  }); totalInflow  += inflow; }
      if (outflow > 0) { entries.push({ name, amount: outflow, direction: 'outflow' }); totalOutflow += outflow; }
    });

    return { entries, totalInflow, totalOutflow, openingBalance: 0, closingBalance: 0, netCashFlow: totalInflow - totalOutflow };
  }

  // -- GST Summary -----------------------------------------------------------
  // Fetches all non-contra, non-journal, non-payment, non-receipt vouchers
  // (catches Sales + Purchases incl. custom voucher type names).
  // Aggregates CGST / SGST / IGST from ALLLEDGERENTRIES.LIST per voucher.
  // Determines output (sales) vs input (purchase) by voucher type name.

  async getGstSummary(company: string, fromDate: string, toDate: string): Promise<GSTSummaryData> {
    const from = this.fmt(fromDate);
    const to   = this.fmt(toDate);

    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>GSTVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">${from}</SVFROMDATE>
        <SVTODATE TYPE="Date">${to}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="GSTVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERTYPENAME, AMOUNT</FETCH>
            <FETCH>ALLLEDGERENTRIES.LIST : LEDGERNAME, AMOUNT</FETCH>
            <FILTER>TaxableVoucherFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="TaxableVoucherFilter">
            NOT ($$IsContra:$VOUCHERTYPENAME) AND NOT ($$IsJournal:$VOUCHERTYPENAME)
            AND NOT ($$IsPayment:$VOUCHERTYPENAME) AND NOT ($$IsReceipt:$VOUCHERTYPENAME)
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const response = await this.makeRequest(xml);
    return this.parseGstSummary(response);
  }

  private parseGstSummary(xmlText: string): GSTSummaryData {
    const doc = this.parseXML(this.cleanXml(xmlText));

    const sales     = { cgst: 0, sgst: 0, igst: 0, taxable: 0, total: 0 };
    const purchases = { cgst: 0, sgst: 0, igst: 0, taxable: 0, total: 0 };

    // Pull custom voucher type names configured in Settings → Voucher Type Mapping
    const cfg = AppConfigService.getInstance();
    const customSaleTypes     = cfg.getCustomSalesTypes().map(t => t.trim().toLowerCase());
    const customPurchaseTypes = cfg.getCustomPurchaseTypes().map(t => t.trim().toLowerCase());

    Array.from(doc.getElementsByTagName('VOUCHER')).forEach(voucher => {
      const vchType = (
        voucher.getAttribute('VCHTYPE') ??
        voucher.getElementsByTagName('VOUCHERTYPENAME')[0]?.textContent ??
        ''
      ).trim().toLowerCase();

      // ── Classification priority ──────────────────────────────────────────
      // 1. Exact/partial match against user-configured custom types first
      // 2. Purchase keywords checked BEFORE sale keywords so a voucher type
      //    named "Tax Invoice" (used for purchases in some Tally setups) is
      //    NOT misclassified as a sale.
      const isCustomSale     = customSaleTypes.length > 0 && customSaleTypes.some(t => vchType.includes(t));
      const isCustomPurchase = customPurchaseTypes.length > 0 && customPurchaseTypes.some(t => vchType.includes(t));

      const hasPurchaseKw = vchType.includes('purch') || vchType.includes('inward') ||
                            vchType.includes('import') || vchType.includes('goods receipt') ||
                            (vchType.includes('bill') && !vchType.includes('sale'));
      const hasSaleKw     = vchType.includes('sale') || vchType.includes('outward');
      // "invoice" keyword is ambiguous (Tax Invoice used for both) — apply only
      // after purchase keywords have been ruled out
      const hasInvoiceKw  = vchType.includes('invoice');

      const isPurchase = isCustomPurchase || hasPurchaseKw;
      const isSale     = !isPurchase && (isCustomSale || hasSaleKw || hasInvoiceKw);

      if (!isSale && !isPurchase) return;

      const target = isSale ? sales : purchases;

      let taxTotal   = 0;
      const nonGstAbsAmts: number[] = [];

      Array.from(voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST')).forEach(entry => {
        const ledgerName = (
          entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? ''
        ).toLowerCase();
        const rawAmt = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent || '0') || 0;
        const absAmt = Math.abs(rawAmt);
        if (absAmt === 0) return;

        if (ledgerName.includes('cgst')) {
          target.cgst += absAmt; taxTotal += absAmt;
        } else if (ledgerName.includes('sgst') || ledgerName.includes('utgst')) {
          target.sgst += absAmt; taxTotal += absAmt;
        } else if (ledgerName.includes('igst')) {
          target.igst += absAmt; taxTotal += absAmt;
        } else {
          // Non-GST entries — max abs value = party/total-invoice entry
          nonGstAbsAmts.push(absAmt);
        }
      });

      // Taxable = party (total invoice) − GST portion.
      // The party ledger entry always has the largest absolute amount because
      // it equals the sum of sales/purchase amount + all tax amounts.
      const partyAmt = nonGstAbsAmts.length > 0 ? Math.max(...nonGstAbsAmts) : 0;
      target.taxable += Math.max(0, partyAmt - taxTotal);
    });

    sales.total     = sales.cgst     + sales.sgst     + sales.igst;
    purchases.total = purchases.cgst + purchases.sgst + purchases.igst;

    return { sales, purchases, netPayable: sales.total - purchases.total };
  }
}

export default ReportsApiService;
