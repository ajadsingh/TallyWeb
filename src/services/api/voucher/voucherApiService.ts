import BaseApiService from '../baseApiService';

export interface VoucherTransaction {
  date: string;
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  amount: number;
  ledgerEntries: LedgerEntry[];
  inventoryEntries: InventoryEntry[];
}

export interface LedgerEntry {
  ledgerName: string;
  amount: number;
  narration?: string;
}

export interface InventoryEntry {
  stockName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
}

export interface VoucherFilters {
  fromDate: string; // YYYYMMDD format
  toDate: string;   // YYYYMMDD format
  ledgerName: string;
}

export default class VoucherApiService extends BaseApiService {
  /**
   * Get voucher transactions for a specific ledger within date range
   * If fromDate and toDate are empty, fetches all available transactions
   */
  async getVoucherTransactions(
    companyName: string,
    ledgerName: string,
    fromDate: string,
    toDate: string
  ): Promise<VoucherTransaction[]> {
    // Build static variables conditionally
    let staticVarsXml = `
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>`;
    
    // Only add date filters if both dates are provided
    if (fromDate && toDate) {
      staticVarsXml += `
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>`;
    }

    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>LedgerVouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>${staticVarsXml}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="LedgerVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, VOUCHERTYPENAME, PARTYLEDGERNAME, AMOUNT, GUID, NARRATION</FETCH>
            <FETCH>ALLLEDGERENTRIES.LIST : LEDGERNAME, AMOUNT, ISDEBIT</FETCH>
            <FETCH>ALLINVENTORYENTRIES.LIST : STOCKITEMNAME, ACTUALQTY, BILLEDQTY, RATE, AMOUNT, BASEUNITS</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      
      if (response.includes('Unknown Request') || response.includes('LINEERROR')) {
        console.warn('Tally server error in response:', response.substring(0, 500));
        throw new Error('Invalid request format or ledger not found');
      }

      // --- DEBUG: log first 2000 chars of raw XML so we can verify tag names ---
      console.log('[VoucherAPI] raw XML (first 2000):', response.substring(0, 2000));
      
      const allTransactions = this.parseVoucherTransactions(response);
      console.log(`[VoucherAPI] parsed ${allTransactions.length} total vouchers; first:`, allTransactions[0]);
      
      // Filter transactions by ledger name if specified
      let filteredTransactions = allTransactions;
      if (ledgerName && ledgerName.trim() !== '') {
        filteredTransactions = allTransactions.filter(transaction => {
          // Check if the ledger appears in inventory entries (stock items)
          const hasInventoryMatch = transaction.inventoryEntries.some(entry => 
            entry.stockName.toLowerCase().includes(ledgerName.toLowerCase()) ||
            ledgerName.toLowerCase().includes(entry.stockName.toLowerCase())
          );
          
          // Check if the ledger appears in ledger entries
          const hasLedgerMatch = transaction.ledgerEntries.some(entry => 
            entry.ledgerName.toLowerCase().includes(ledgerName.toLowerCase()) ||
            ledgerName.toLowerCase().includes(entry.ledgerName.toLowerCase())
          );
          
          // Check if the ledger matches the party name
          const hasPartyMatch = transaction.partyName.toLowerCase().includes(ledgerName.toLowerCase()) ||
                                ledgerName.toLowerCase().includes(transaction.partyName.toLowerCase());
          
          return hasInventoryMatch || hasLedgerMatch || hasPartyMatch;
        });
      }
      
      console.log(`[VoucherAPI] after ledger filter "${ledgerName}": ${filteredTransactions.length} vouchers`);
      return filteredTransactions;
    } catch (error) {
      console.error('Failed to fetch voucher transactions:', error);
      throw error;
    }
  }

  /**
   * Parse voucher transactions XML response
   */
  private parseVoucherTransactions(xmlText: string): VoucherTransaction[] {
    const doc = this.parseXML(xmlText);
    const transactions: VoucherTransaction[] = [];

    // Find all VOUCHER elements (getElementsByTagName works on both Day Book and TDL Collection responses)
    const voucherNodes = Array.from(doc.getElementsByTagName('VOUCHER'));
    console.log(`[VoucherAPI] found ${voucherNodes.length} VOUCHER nodes`);
    if (voucherNodes.length > 0) {
      // Log tag names inside first voucher to see what Tally actually returned
      const firstTags = Array.from(voucherNodes[0].children).map(c => c.tagName);
      console.log('[VoucherAPI] first VOUCHER child tags:', firstTags);
    }
    
    voucherNodes.forEach(voucherNode => {
      try {
        // Extract voucher-level data
        const date = this.getElementText(voucherNode, 'DATE');
        const voucherType = this.getElementText(voucherNode, 'VOUCHERTYPENAME');
        const voucherNumber = this.getElementText(voucherNode, 'VOUCHERNUMBER');
        const partyName = this.getElementText(voucherNode, 'PARTYLEDGERNAME') || 
                          this.getElementText(voucherNode, 'PARTYNAME');

        // ── Ledger entries ────────────────────────────────────────────────
        // Use getElementsByTagName (not querySelectorAll) because CSS selectors
        // do not reliably match XML tag names that contain a literal dot.
        const ledgerEntries: LedgerEntry[] = [];

        // Try both LEDGERENTRIES.LIST and ALLLEDGERENTRIES.LIST (Tally uses both)
        const ledgerListNodes = [
          ...Array.from(voucherNode.getElementsByTagName('LEDGERENTRIES.LIST')),
          ...Array.from(voucherNode.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ];
        if (ledgerListNodes.length === 0) {
          // Log for first voucher only to avoid flooding console
          if (transactions.length === 0) {
            console.log('[VoucherAPI] no LEDGERENTRIES.LIST found in first voucher. outerHTML:', voucherNode.outerHTML?.substring(0, 800));
          }
        }

        ledgerListNodes.forEach(entryNode => {
          const ledgerName = this.getNodeText(entryNode, 'LEDGERNAME');
          const amountText = this.getNodeText(entryNode, 'AMOUNT');
          const narration  = this.getNodeText(entryNode, 'NARRATION');
          
          if (ledgerName && amountText) {
            ledgerEntries.push({
              ledgerName,
              amount: this.parseAmount(amountText),
              narration: narration || undefined,
            });
          }
        });

        // ── Inventory entries ─────────────────────────────────────────────
        const inventoryEntries: InventoryEntry[] = [];

        // Try both ALLINVENTORYENTRIES.LIST and INVENTORYENTRIES.LIST
        const inventoryListNodes = [
          ...Array.from(voucherNode.getElementsByTagName('ALLINVENTORYENTRIES.LIST')),
          ...Array.from(voucherNode.getElementsByTagName('INVENTORYENTRIES.LIST')),
        ];

        inventoryListNodes.forEach(invNode => {
          const stockName  = this.getNodeText(invNode, 'STOCKITEMNAME');
          const amountText = this.getNodeText(invNode, 'AMOUNT');
          const quantity   = this.getNodeText(invNode, 'BILLEDQTY') || this.getNodeText(invNode, 'ACTUALQTY');
          const rate       = this.getNodeText(invNode, 'RATE');
          const unit       = this.getNodeText(invNode, 'BASEUNIT') || this.getNodeText(invNode, 'UOM') || this.getNodeText(invNode, 'BASEUNITS');
          
          if (stockName && amountText) {
            inventoryEntries.push({
              stockName,
              quantity: parseFloat(quantity || '0') || 0,
              rate: this.parseAmount(rate || '0'),
              amount: Math.abs(this.parseAmount(amountText)),
              unit: unit || undefined,
            });
          }
        });

        // Calculate total amount
        let totalAmount = 0;
        const partyEntry = ledgerEntries.find(entry => 
          entry.ledgerName === partyName || 
          (partyName && entry.ledgerName.toLowerCase().includes(partyName.toLowerCase()))
        );
        
        if (partyEntry) {
          totalAmount = Math.abs(partyEntry.amount);
        } else {
          const inventoryTotal = inventoryEntries.reduce((sum, e) => sum + e.amount, 0);
          if (inventoryTotal > 0) {
            totalAmount = inventoryTotal;
          } else {
            totalAmount = ledgerEntries
              .filter(e => e.amount > 0)
              .reduce((sum, e) => sum + e.amount, 0);
            // If all amounts are negative (Tally convention), take abs of the largest
            if (totalAmount === 0 && ledgerEntries.length > 0) {
              totalAmount = Math.max(...ledgerEntries.map(e => Math.abs(e.amount)));
            }
          }
        }

        // Always push the transaction if it has the basic fields — even if
        // entry arrays end up empty (the UI shows a fallback message in that case).
        if (date && voucherType && voucherNumber) {
          transactions.push({
            date: this.formatDate(date),
            voucherType,
            voucherNumber,
            partyName: partyName || 'Unknown',
            amount: totalAmount,
            ledgerEntries,
            inventoryEntries,
          });
        }
      } catch (error) {
        console.warn('Error parsing voucher node:', error);
      }
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Reliable text extraction using getElementsByTagName (no CSS selector, no dot escaping).
   * Falls back to querySelector for simple (no-dot) tag names.
   */
  private getNodeText(parentNode: Element, tagName: string): string {
    const nodes = parentNode.getElementsByTagName(tagName);
    if (nodes.length > 0) return nodes[0].textContent?.trim() || '';
    // Fallback for simple names
    const el = parentNode.querySelector(tagName);
    return el?.textContent?.trim() || '';
  }

  /**
   * Helper method to get text content from an element
   */
  private getElementText(parentNode: Element, tagName: string): string {
    return this.getNodeText(parentNode, tagName);
  }

  /**
   * Format date from YYYYMMDD to readable format
   */
  private formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }

  /**
   * Convert date from DD/MM/YYYY to YYYYMMDD format for Tally API
   */
  static formatDateForTally(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }

  /**
   * Get current month date range in Tally format
   */
  static getCurrentMonthRange(): { fromDate: string; toDate: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    return {
      fromDate: `${year}${month.toString().padStart(2, '0')}01`,
      toDate: `${year}${month.toString().padStart(2, '0')}${lastDay.toString().padStart(2, '0')}`
    };
  }
}
