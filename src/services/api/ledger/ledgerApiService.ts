import BaseApiService from '../baseApiService';

export interface TallyLedger {
  name: string;
  id: string;
  parent: string;
  taxType: string;
  isBillWiseOn: boolean;
  isCostCentresOn: boolean;
  isRevenue: boolean;
  isDeemedPositive: boolean;
  canDelete: boolean;
  forPayroll: boolean;
  masterId: number;
  closingBalance: number;
  openingBalance: number;
}

export interface LedgerDetail extends TallyLedger {
  // Additional fields that might come from detailed API
  [key: string]: any;
}

export default class LedgerApiService extends BaseApiService {
  /**
   * Get list of all ledgers from Tally
   */
  async getLedgerList(companyName: string): Promise<TallyLedger[]> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="List of Ledgers">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
            <FETCH>Parent</FETCH>
            <FETCH>OpeningBalance</FETCH>
            <FETCH>ClosingBalance</FETCH>
            <FETCH>MasterId</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return this.parseLedgerList(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed information about a specific ledger
   */
  async getLedgerDetails(ledgerName: string, companyName: string): Promise<LedgerDetail> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>OBJECT</TYPE>
    <SUBTYPE>Ledger</SUBTYPE>
    <ID TYPE="Name">${ledgerName}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>Name</FETCH>
        <FETCH>Parent</FETCH>
        <FETCH>OpeningBalance</FETCH>
        <FETCH>ClosingBalance</FETCH>
        <FETCH>TaxType</FETCH>
        <FETCH>IsBillWiseOn</FETCH>
        <FETCH>IsCostCentresOn</FETCH>
        <FETCH>IsRevenue</FETCH>
        <FETCH>IsDeemedPositive</FETCH>
        <FETCH>CanDelete</FETCH>
        <FETCH>ForPayroll</FETCH>
        <FETCH>MasterId</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return this.parseLedgerDetails(response);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse ledger list XML response
   */
  private parseLedgerList(xmlText: string): TallyLedger[] {
    const doc = this.parseXML(xmlText);
    const ledgers: TallyLedger[] = [];

    // getElementsByTagName works reliably across all Tally XML response formats
    const ledgerNodes = Array.from(doc.getElementsByTagName('LEDGER'));

    ledgerNodes.forEach(ledgerNode => {
      try {
        // NAME can be in getAttribute OR in a child <NAME> element
        const name = ledgerNode.getAttribute('NAME')
          || ledgerNode.getElementsByTagName('NAME')[0]?.textContent?.trim()
          || '';
        const id = ledgerNode.getAttribute('ID') || '';

        const getNodeText = (tagName: string): string => {
          const nodes = ledgerNode.getElementsByTagName(tagName);
          return nodes.length > 0 ? (nodes[0].textContent?.trim() || '') : '';
        };
        const getNodeNumber  = (t: string) => this.parseAmount(getNodeText(t));
        const getNodeBoolean = (t: string) => {
          const v = getNodeText(t).toLowerCase();
          return v === 'yes' || v === 'true';
        };

        if (name) {
          ledgers.push({
            name,
            id,
            parent:          getNodeText('PARENT'),
            taxType:         getNodeText('TAXTYPE'),
            isBillWiseOn:    getNodeBoolean('ISBILLWISEON'),
            isCostCentresOn: getNodeBoolean('ISCOSTCENTRESON'),
            isRevenue:       getNodeBoolean('ISREVENUE'),
            isDeemedPositive:getNodeBoolean('ISDEEMEDPOSITIVE'),
            canDelete:       getNodeBoolean('CANDELETE'),
            forPayroll:      getNodeBoolean('FORPAYROLL'),
            masterId:        parseInt(getNodeText('MASTERID')) || 0,
            closingBalance:  getNodeNumber('CLOSINGBALANCE'),
            openingBalance:  getNodeNumber('OPENINGBALANCE'),
          });
        }
      } catch (error) {
        console.warn('Error parsing ledger node:', error);
      }
    });

    return ledgers;
  }

  /**
   * Parse ledger details XML response
   */
  private parseLedgerDetails(xmlText: string): LedgerDetail {
    const doc = this.parseXML(xmlText);
    
    // Find the LEDGER element in the response
    const ledgerNode = doc.querySelector('LEDGER');
    
    if (!ledgerNode) {
      throw new Error('No ledger data found in response');
    }

    const name = ledgerNode.getAttribute('NAME') || '';
    const id = ledgerNode.getAttribute('ID') || '';
    
    // Helper function to get element text content
    const getElementText = (tagName: string): string => {
      const element = ledgerNode.querySelector(tagName);
      return element?.textContent?.trim() || '';
    };

    const getElementNumber = (tagName: string): number => {
      const text = getElementText(tagName);
      return this.parseAmount(text);
    };

    const getElementBoolean = (tagName: string): boolean => {
      const text = getElementText(tagName);
      return text.toLowerCase() === 'yes' || text.toLowerCase() === 'true';
    };

    return {
      name,
      id,
      parent: getElementText('PARENT'),
      taxType: getElementText('TAXTYPE'),
      isBillWiseOn: getElementBoolean('ISBILLWISEON'),
      isCostCentresOn: getElementBoolean('ISCOSTCENTRESON'),
      isRevenue: getElementBoolean('ISREVENUE'),
      isDeemedPositive: getElementBoolean('ISDEEMEDPOSITIVE'),
      canDelete: getElementBoolean('CANDELETE'),
      forPayroll: getElementBoolean('FORPAYROLL'),
      masterId: parseInt(getElementText('MASTERID')) || 0,
      closingBalance: getElementNumber('CLOSINGBALANCE'),
      openingBalance: getElementNumber('OPENINGBALANCE'),
    };
  }
}
