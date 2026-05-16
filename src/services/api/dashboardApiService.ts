// Dashboard API Service for financial overview

import BaseApiService from './baseApiService';

export interface FinancialOverview {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  netProfit: number;
  gstPayable: number;
  cashBank: number;
}

export default class DashboardApiService extends BaseApiService {

  /** Sum all Cash-group ledger closing balances */
  async getCashBalance(company: string): Promise<number> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>CashLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CashLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
            <FETCH>ClosingBalance</FETCH>
            <FILTER>CashFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="CashFilter">$$IsCash:$Parent</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    try {
      const xmlText = await this.makeRequest(xml);
      const xmlDoc = this.parseXML(xmlText);
      let total = 0;
      xmlDoc.querySelectorAll('LEDGER').forEach(node => {
        total += Math.abs(this.parseAmount(node.querySelector('CLOSINGBALANCE')?.textContent || '0'));
      });
      return total;
    } catch { return 0; }
  }

  /** Sum all Bank-group ledger closing balances */
  async getBankBalance(company: string): Promise<number> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>BankLedgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="BankLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>Name</FETCH>
            <FETCH>ClosingBalance</FETCH>
            <FILTER>BankFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="BankFilter">$$IsBank:$Parent</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    try {
      const xmlText = await this.makeRequest(xml);
      const xmlDoc = this.parseXML(xmlText);
      let total = 0;
      xmlDoc.querySelectorAll('LEDGER').forEach(node => {
        total += Math.abs(this.parseAmount(node.querySelector('CLOSINGBALANCE')?.textContent || '0'));
      });
      return total;
    } catch { return 0; }
  }

  async getSalesVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>DashSalesVouchers</ID>
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
          <COLLECTION NAME="DashSalesVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>Amount</FETCH>
            <FILTER>OnlySales</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlySales">$$IsSales:$VOUCHERTYPENAME</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    try {
      const xmlDoc = this.parseXML(await this.makeRequest(xml));
      let total = 0;
      xmlDoc.querySelectorAll('AMOUNT').forEach(el => {
        const v = this.parseAmount(el.textContent || '0');
        if (v > 0) total += v;
      });
      return total;
    } catch { return 0; }
  }

  async getPurchaseVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>DashPurchaseVouchers</ID>
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
          <COLLECTION NAME="DashPurchaseVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>Amount</FETCH>
            <FILTER>OnlyPurchase</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlyPurchase">$$IsPurchase:$VOUCHERTYPENAME</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    try {
      const xmlDoc = this.parseXML(await this.makeRequest(xml));
      let total = 0;
      xmlDoc.querySelectorAll('AMOUNT').forEach(el => {
        const v = this.parseAmount(el.textContent || '0');
        if (v > 0) total += v;
      });
      return total;
    } catch { return 0; }
  }

  async getExpenseVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xml = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>DashExpenseVouchers</ID>
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
          <COLLECTION NAME="DashExpenseVouchers">
            <TYPE>Voucher</TYPE>
            <FETCH>Amount</FETCH>
            <FILTER>OnlyExpenses</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlyExpenses">$$IsJournal:$VOUCHERTYPENAME OR $$IsPayment:$VOUCHERTYPENAME</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
    try {
      const xmlDoc = this.parseXML(await this.makeRequest(xml));
      let total = 0;
      xmlDoc.querySelectorAll('AMOUNT').forEach(el => {
        const v = this.parseAmount(el.textContent || '0');
        if (v > 0) total += v;
      });
      return total;
    } catch { return 0; }
  }

  async getFinancialOverview(fromDate: string, toDate: string, company: string): Promise<FinancialOverview> {
    const [cashBalance, bankBalance, totalSales, totalPurchases, totalExpenses] = await Promise.all([
      this.getCashBalance(company),
      this.getBankBalance(company),
      this.getSalesVouchers(fromDate, toDate, company),
      this.getPurchaseVouchers(fromDate, toDate, company),
      this.getExpenseVouchers(fromDate, toDate, company),
    ]);
    const cashBank = cashBalance + bankBalance;
    const netProfit = totalSales - totalPurchases - totalExpenses;
    const gstPayable = totalSales * 0.18;
    return { totalSales, totalPurchases, totalExpenses, netProfit, gstPayable, cashBank };
  }
}
