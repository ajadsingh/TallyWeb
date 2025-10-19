import BaseApiService from '../baseApiService';

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

    const { fromDate, toDate } = this.getDateRange(dateRangeOption, customFromDate, customToDate);
    
    const fromDateStr = this.formatDateForTally(fromDate);
    const toDateStr = this.formatDateForTally(toDate);
    
    // TDL-based query for Purchase vouchers
    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>Purchase Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="DATE">${fromDateStr}</SVFROMDATE>
        <SVTODATE TYPE="DATE">${toDateStr}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Purchase Vouchers" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="Yes" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, VOUCHERTYPENAME, GUID, VCHTYPE, REFERENCE, NARRATION</FETCH>
            <FILTER>PurchaseVouchersOnly</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="PurchaseVouchersOnly">$$IsPurchase:$VOUCHERTYPE</SYSTEM>
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
   * Parse purchase vouchers XML response 
   */
  private parsePurchaseVouchersResponse(xmlText: string): PurchaseVoucher[] {
    try {
      const cleanedXml = this.cleanXmlForParsing(xmlText);
      const doc = this.parseXML(cleanedXml);
      
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parsing failed');
      }
      
      let vouchers = doc.querySelectorAll('VOUCHER');
      
      if (vouchers.length === 0) {
        vouchers = doc.querySelectorAll('voucher');
      }
      
      const purchaseVouchers: PurchaseVoucher[] = [];
      
      vouchers.forEach((voucher, index) => {
        try {
          const vchType = voucher.getAttribute('VCHTYPE') || 
                         voucher.getAttribute('TYPE') ||
                         voucher.querySelector('VOUCHERTYPENAME')?.textContent ||
                         voucher.querySelector('VOUCHERTYPE')?.textContent ||
                         '';
          
          const dateElement = voucher.querySelector('DATE');
          const date = dateElement?.textContent || '';
          
          const voucherNumberElement = voucher.querySelector('VOUCHERNUMBER');
          const voucherNumber = voucherNumberElement?.textContent || '';
          
          const partyNameElement = voucher.querySelector('PARTYLEDGERNAME');
          const partyName = partyNameElement?.textContent || '';
          
          const amountElement = voucher.querySelector('AMOUNT');
          let amountText = amountElement?.textContent || '0';
          
          if (!amountText || amountText === '0') {
            const ledgerEntries = voucher.querySelectorAll('ALLLEDGERENTRIES.LIST');
            let totalAmount = 0;
            ledgerEntries.forEach(entry => {
              const entryAmount = entry.querySelector('AMOUNT')?.textContent;
              if (entryAmount) {
                totalAmount += Math.abs(parseFloat(entryAmount) || 0);
              }
            });
            if (totalAmount > 0) {
              amountText = totalAmount.toString();
            }
          }
          
          const amount = Math.abs(parseFloat(amountText) || 0);
          
          if (!date && !voucherNumber && !partyName && amount === 0) {
            return;
          }
          
          const guidElement = voucher.querySelector('GUID');
          const guid = guidElement?.textContent || '';
          
          const referenceElement = voucher.querySelector('REFERENCE');
          const reference = referenceElement?.textContent || '';
          
          const narrationElement = voucher.querySelector('NARRATION');
          const narration = narrationElement?.textContent || '';
          
          const remoteid = voucher.getAttribute('REMOTEID') || '';
          const vchkey = voucher.getAttribute('VCHKEY') || '';
          
          // Extract inventory details
          const stockItems: StockItem[] = [];
          let totalDiscount = 0;
          const inventoryElements = voucher.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
          
          inventoryElements.forEach(entry => {
            const stockItemName = entry.querySelector('STOCKITEMNAME')?.textContent || '';
            const actualQty = entry.querySelector('ACTUALQTY')?.textContent || '';
            const billedQty = entry.querySelector('BILLEDQTY')?.textContent || '';
            const rate = entry.querySelector('RATE')?.textContent || '';
            const itemAmount = Math.abs(parseFloat(entry.querySelector('AMOUNT')?.textContent || '0'));
            const hsnCode = entry.querySelector('GSTHSNNAME')?.textContent || '';
            
            const rateValue = parseFloat(rate?.replace(/[^\d.-]/g, '') || '0');
            const qtyValue = parseFloat(billedQty?.replace(/[^\d.-]/g, '') || '0');
            const grossAmount = rateValue * qtyValue;
            const itemDiscount = grossAmount > 0 ? grossAmount - itemAmount : 0;
            const discountPercent = grossAmount > 0 ? (itemDiscount / grossAmount) * 100 : 0;
            
            totalDiscount += itemDiscount;
            
            if (stockItemName) {
              stockItems.push({
                name: stockItemName,
                rate: rate,
                actualQty: actualQty,
                billedQty: billedQty,
                amount: itemAmount,
                hsn: hsnCode,
                discount: itemDiscount,
                discountPercent: discountPercent
              });
            }
          });
          
          // Extract GST breakdown
          let cgst = 0, sgst = 0, igst = 0;
          let cgstRate = 0, sgstRate = 0, igstRate = 0;
          
          const ledgerEntries = voucher.querySelectorAll('ALLLEDGERENTRIES\\.LIST');
          ledgerEntries.forEach(entry => {
            const ledgerName = entry.querySelector('LEDGERNAME')?.textContent?.toLowerCase() || '';
            const entryAmount = Math.abs(parseFloat(entry.querySelector('AMOUNT')?.textContent || '0'));
            const gstRate = parseFloat(entry.querySelector('GSTRATE')?.textContent || '0');
            
            if (ledgerName.includes('cgst')) {
              cgst += entryAmount;
              cgstRate = gstRate;
            } else if (ledgerName.includes('sgst')) {
              sgst += entryAmount;
              sgstRate = gstRate;
            } else if (ledgerName.includes('igst')) {
              igst += entryAmount;
              igstRate = gstRate;
            }
          });
          
          const totalTax = cgst + sgst + igst;
          const taxableAmount = amount - totalTax;
          
          purchaseVouchers.push({
            id: guid || `${voucherNumber}-${index}`,
            voucherNumber: voucherNumber,
            date: date,
            partyName: partyName,
            amount: amount,
            narration: narration,
            reference: reference,
            guid: guid,
            alterid: remoteid,
            voucherType: vchType,
            voucherRetainKey: vchkey,
            stockItems: stockItems,
            taxableAmount: taxableAmount,
            totalTax: totalTax,
            itemCount: stockItems.length,
            totalDiscount: totalDiscount,
            gstBreakdown: {
              cgst,
              sgst,
              igst,
              cgstRate,
              sgstRate,
              igstRate,
              total: totalTax
            }
          });
          
        } catch (error) {
          console.error(`Error parsing purchase voucher at index ${index}:`, error);
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
   * Format date for Tally (YYYYMMDD format)
   */
  private formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

export default PurchasesApiService;
