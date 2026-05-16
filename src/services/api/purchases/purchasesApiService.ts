import BaseApiService from '../baseApiService';
import AppConfigService from '../../config/appConfig';

export type DateRangeOption = 
  | 'last7days'
  | 'lastMonth'
  | 'currentMonth'
  | 'last3months'
  | 'currentYear'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  fromDate: Date;
  toDate: Date;
  label: string;
}

export interface PurchaseVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  partyName: string;
  amount: number;
  narration: string;
  reference: string;
  guid: string;
  alterid: string;
  voucherType: string;
  voucherRetainKey: string;
  stockItems?: StockItem[];
  // Additional fields for complete voucher information
  taxableAmount?: number;
  totalTax?: number;
  itemCount?: number;
  gstBreakdown?: GSTBreakdown;
  roundOff?: number;
  totalDiscount?: number;
}

export interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  total: number;
}

export interface StockItem {
  name: string;
  rate: string;
  actualQty: string;
  billedQty: string;
  amount: number;
  hsn?: string;
  discount?: number;
  discountPercent?: number;
}

export class PurchasesApiService extends BaseApiService {

  /**
   * Fetch individual purchase voucher details directly from Tally by voucher GUID
   */
  async fetchVoucherDetails(
    companyName: string,
    voucherGuid: string
  ): Promise<any> {
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }

    if (!voucherGuid) {
      throw new Error('Voucher GUID is required.');
    }

    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
          <MASTERGUID>${voucherGuid}</MASTERGUID>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return response;
    } catch (error) {
      throw new Error(`Failed to fetch voucher details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get predefined date range options
   */
  getDateRangeOptions(): { value: DateRangeOption; label: string }[] {
    return [
      { value: 'currentMonth', label: 'Current Month' },
      { value: 'lastMonth', label: 'Previous Month' },
      { value: 'last3months', label: 'Last 3 Months' },
      { value: 'currentYear', label: 'Current Year' },
      { value: 'lastYear', label: 'Previous Year' },
      { value: 'custom', label: 'Custom Range' }
    ];
  }

  /**
   * Calculate date range based on option
   */
  getDateRange(option: DateRangeOption, customFromDate?: Date, customToDate?: Date): DateRange {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date;
    let label: string;

    switch (option) {
      case 'last7days':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7);
        toDate = new Date(today);
        label = 'Last 7 Days';
        break;

      case 'lastMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), 0);
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        break;

      case 'currentMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
        break;

      case 'last3months':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        toDate = new Date(today);
        label = 'Last 3 Months';
        break;

      case 'currentYear':
        const currentCalendarYear = today.getFullYear();
        const currentCalendarMonth = today.getMonth();
        
        if (currentCalendarMonth >= 3) {
          fromDate = new Date(currentCalendarYear, 3, 1);
          toDate = new Date(today);
        } else {
          fromDate = new Date(currentCalendarYear - 1, 3, 1);
          toDate = new Date(today);
        }
        
        const fyStartYear = fromDate.getFullYear();
        const fyEndYear = fyStartYear + 1;
        label = `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)} (Current Financial Year)`;
        break;

      case 'lastYear':
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        let prevFyStartYear, prevFyEndYear;
        if (currentMonth >= 3) {
          prevFyStartYear = currentYear - 1;
          prevFyEndYear = currentYear;
        } else {
          prevFyStartYear = currentYear - 2;
          prevFyEndYear = currentYear - 1;
        }
        
        fromDate = new Date(prevFyStartYear, 3, 1);
        toDate = new Date(prevFyEndYear, 2, 31);
        label = `FY ${prevFyStartYear}-${prevFyEndYear.toString().slice(-2)} (Previous Financial Year)`;
        break;

      case 'custom':
        fromDate = customFromDate || new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = customToDate || new Date(today);
        label = `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
        break;

      default:
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today);
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
    }

    return { fromDate, toDate, label };
  }
  
  /**
   * Fetch purchase vouchers for a specific date range
   * This query fetches Purchase vouchers from Tally Prime
   */
  async getPurchaseVouchers(
    companyName: string, 
    dateRangeOption: DateRangeOption = 'currentMonth',
    customFromDate?: Date,
    customToDate?: Date
  ): Promise<PurchaseVoucher[]> {
    
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }

    // Compute date strings — if no dates provided → all-time (no date filter)
    let fromDateStr = '';
    let toDateStr   = '';
    if (customFromDate && customToDate) {
      fromDateStr = this.formatDateForTally(customFromDate);
      toDateStr   = this.formatDateForTally(customToDate);
    } else if (dateRangeOption !== 'custom') {
      const { fromDate, toDate } = this.getDateRange(dateRangeOption);
      fromDateStr = this.formatDateForTally(fromDate);
      toDateStr   = this.formatDateForTally(toDate);
    }

    // Build filter — extend with any custom voucher type names from settings
    const customPurchaseTypes = AppConfigService.getInstance().getCustomPurchaseTypes();
    const extraFilter = customPurchaseTypes
      .map(t => `($VOUCHERTYPENAME = "${t.replace(/"/g, '&quot;')}")` )
      .join(' OR ');
    const purchaseFilterFormula = extraFilter
      ? `$$IsPurchase:$VOUCHERTYPENAME OR ${extraFilter}`
      : `$$IsPurchase:$VOUCHERTYPENAME`;

    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>PurchaseVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        ${fromDateStr ? `<SVFROMDATE TYPE="Date">${fromDateStr}</SVFROMDATE>` : ''}
        ${toDateStr   ? `<SVTODATE   TYPE="Date">${toDateStr}</SVTODATE>`   : ''}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="PurchaseVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, PARTYLEDGERNAME, VOUCHERTYPENAME, AMOUNT, GUID, REFERENCE, NARRATION</FETCH>
            <FETCH>ALLLEDGERENTRIES.LIST : LEDGERNAME, AMOUNT, GSTRATE</FETCH>
            <FETCH>ALLINVENTORYENTRIES.LIST : STOCKITEMNAME, ACTUALQTY, BILLEDQTY, RATE, AMOUNT, GSTHSNNAME</FETCH>
            <FILTER>PurchaseFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="PurchaseFilter">${purchaseFilterFormula}</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      const result = this.parsePurchaseVouchersResponse(response);
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch purchase data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse purchase vouchers XML response.
   * Uses getElementsByTagName throughout — querySelector won't match dotted XML tag
   * names like ALLLEDGERENTRIES.LIST reliably in XML mode.
   */
  private parsePurchaseVouchersResponse(xmlText: string): PurchaseVoucher[] {
    try {
      const cleanedXml = this.cleanXmlForParsing(xmlText);
      const doc = this.parseXML(cleanedXml);

      if (doc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML parsing failed');
      }

      const rawList = doc.getElementsByTagName('VOUCHER');
      const voucherNodes = Array.from(
        rawList.length > 0 ? rawList : doc.getElementsByTagName('voucher')
      );
      
      const purchaseVouchers: PurchaseVoucher[] = [];

      voucherNodes.forEach((voucher, index) => {
        try {
          // Helper: get first matching child text content
          const gt = (tag: string) =>
            voucher.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

          const vchType =
            voucher.getAttribute('VCHTYPE') ||
            voucher.getAttribute('TYPE') ||
            gt('VOUCHERTYPENAME') ||
            gt('VOUCHERTYPE') ||
            '';

          const date          = gt('DATE');
          const voucherNumber = gt('VOUCHERNUMBER');
          const partyName     = gt('PARTYLEDGERNAME');

          // Amount — fall back to summing ledger entries if top-level is missing
          let amountText = gt('AMOUNT');
          if (!amountText || amountText === '0') {
            let total = 0;
            Array.from(voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST')).forEach(e => {
              total += Math.abs(parseFloat(e.getElementsByTagName('AMOUNT')[0]?.textContent || '0') || 0);
            });
            if (total > 0) amountText = String(total);
          }
          const amount = Math.abs(parseFloat(amountText) || 0);

          if (!date && !voucherNumber && !partyName && amount === 0) return;

          const guid      = gt('GUID');
          const reference = gt('REFERENCE');
          const narration = gt('NARRATION');
          const remoteid  = voucher.getAttribute('REMOTEID') ?? '';
          const vchkey    = voucher.getAttribute('VCHKEY') ?? '';

          // ── Inventory entries ──────────────────────────────────────────
          const stockItems: StockItem[] = [];
          let totalDiscount = 0;
          Array.from(voucher.getElementsByTagName('ALLINVENTORYENTRIES.LIST')).forEach(entry => {
            const egt = (tag: string) =>
              entry.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';
            const stockItemName = egt('STOCKITEMNAME');
            const actualQty     = egt('ACTUALQTY');
            const billedQty     = egt('BILLEDQTY');
            const rate          = egt('RATE');
            const hsnCode       = egt('GSTHSNNAME');
            const itemAmount    = Math.abs(parseFloat(egt('AMOUNT')) || 0);
            const rateValue     = parseFloat(rate.replace(/[^\d.-]/g, '') || '0');
            const qtyValue      = parseFloat(billedQty.replace(/[^\d.-]/g, '') || '0');
            const grossAmount   = rateValue * qtyValue;
            const itemDiscount  = grossAmount > 0 ? grossAmount - itemAmount : 0;
            totalDiscount += itemDiscount;
            if (stockItemName) {
              stockItems.push({
                name: stockItemName,
                rate,
                actualQty,
                billedQty,
                amount: itemAmount,
                hsn: hsnCode,
                discount: itemDiscount,
                discountPercent: grossAmount > 0 ? (itemDiscount / grossAmount) * 100 : 0,
              });
            }
          });

          // ── Ledger entries (GST breakdown) ─────────────────────────────
          let cgst = 0, sgst = 0, igst = 0;
          let cgstRate = 0, sgstRate = 0, igstRate = 0;
          Array.from(voucher.getElementsByTagName('ALLLEDGERENTRIES.LIST')).forEach(entry => {
            const lName = (entry.getElementsByTagName('LEDGERNAME')[0]?.textContent ?? '').toLowerCase();
            const lAmt  = Math.abs(parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent || '0') || 0);
            const lRate = parseFloat(entry.getElementsByTagName('GSTRATE')[0]?.textContent || '0') || 0;
            if      (lName.includes('cgst')) { cgst += lAmt; cgstRate = lRate; }
            else if (lName.includes('sgst')) { sgst += lAmt; sgstRate = lRate; }
            else if (lName.includes('igst')) { igst += lAmt; igstRate = lRate; }
          });

          const totalTax      = cgst + sgst + igst;
          const taxableAmount = amount - totalTax;

          purchaseVouchers.push({
            id: guid || `${voucherNumber}-${index}`,
            voucherNumber,
            date: this.formatTallyDate(date),
            partyName,
            amount,
            narration,
            reference,
            guid,
            alterid: remoteid,
            voucherType: vchType,
            voucherRetainKey: vchkey,
            stockItems,
            taxableAmount,
            totalTax,
            itemCount: stockItems.length,
            totalDiscount,
            gstBreakdown: { cgst, sgst, igst, cgstRate, sgstRate, igstRate, total: totalTax },
          });
        } catch (e) {
          console.error(`Error parsing purchase voucher at index ${index}:`, e);
        }
      });

      return purchaseVouchers;
    } catch (error) {
      console.error('Error parsing purchase vouchers response:', error);
      throw new Error(`Failed to parse purchase vouchers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean XML text to remove invalid characters that cause parsing errors
   */
  private cleanXmlForParsing(xmlText: string): string {
    let cleaned = xmlText;
    
    // Remove invalid character references (control characters 0-8, 11, 12, 14-31)
    cleaned = cleaned.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
    
    // Remove any remaining problematic character references
    cleaned = cleaned.replace(/&#x[0-8A-Fa-f];/g, '');
    
    // Remove actual control characters
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    return cleaned;
  }

  /**
   * Format date for Tally request (YYYYMMDD format)
   */
  private formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Format Tally date (YYYYMMDD) to ISO YYYY-MM-DD
   */
  private formatTallyDate(tallyDate: string): string {
    if (!tallyDate || tallyDate.length !== 8) return tallyDate;
    const year  = tallyDate.substring(0, 4);
    const month = tallyDate.substring(4, 6);
    const day   = tallyDate.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
}

export default PurchasesApiService;
