import BaseApiService from './baseApiService';

export interface DashboardSummary {
  cashInHand: number;
  bankBalance: number;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  totalReceivables: number;
  totalPayables: number;
  netProfit: number;
}

export interface RecentVoucher {
  date: string;        // YYYYMMDD
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  amount: number;
}

export default class DashboardApiService extends BaseApiService {

  private cleanXml(xml: string): string {
    return xml
      .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
      .replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '')
      .replace(/&#x[0-8A-Fa-f];/gi, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  /**
   * Single safe call â€” fetch all ledgers, compute all dashboard metrics client-side.
   * No TDL FILTER / SYSTEM Formulae (avoids Tally c0000005 crash).
   */
  async getDashboardData(company: string): Promise<DashboardSummary> {
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
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="AllLedgers">
            <TYPE>Ledger</TYPE>
            <FETCH>NAME, PARENT, CLOSINGBALANCE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    const responseText = await this.makeRequest(xml);
    return this.parseDashboardData(responseText);
  }

  /**
   * Fetch recent vouchers using Day Book (safe â€” no TDL filter).
   * Block-splitter parser so one bad voucher doesn't break the whole response.
   */
  async getRecentVouchers(company: string, fromDate: string, toDate: string): Promise<RecentVoucher[]> {
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
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const responseText = await this.makeRequest(xml);
      return this.parseRecentVouchers(responseText);
    } catch {
      return [];
    }
  }

  // â”€â”€ Parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private parseDashboardData(xmlText: string): DashboardSummary {
    const doc = this.parseXML(this.cleanXml(xmlText));

    let cashInHand       = 0;
    let bankBalance      = 0;
    let totalSales       = 0;
    let totalPurchases   = 0;
    let totalExpenses    = 0;
    let totalReceivables = 0;
    let totalPayables    = 0;

    Array.from(doc.getElementsByTagName('LEDGER')).forEach(node => {
      const parent = (
        node.getElementsByTagName('PARENT')[0]?.textContent?.trim() ?? ''
      ).toLowerCase();
      if (!parent) return;

      const raw = this.parseAmount(
        node.getElementsByTagName('CLOSINGBALANCE')[0]?.textContent ?? '0'
      );
      const abs = Math.abs(raw);
      if (abs === 0) return;

      if (parent === 'cash-in-hand' || parent === 'cash in hand') {
        cashInHand += abs;
      } else if (parent === 'bank accounts' || parent === 'bank o/d accounts' || parent === 'bank od accounts') {
        bankBalance += abs;
      } else if (parent === 'sundry debtors') {
        totalReceivables += abs;
      } else if (parent === 'sundry creditors') {
        totalPayables += abs;
      } else if (parent === 'sales accounts' || parent === 'sales account') {
        totalSales += abs;
      } else if (parent === 'purchase accounts' || parent === 'purchase account' || parent === 'purchases') {
        totalPurchases += abs;
      } else if (parent.includes('expense')) {
        totalExpenses += abs;
      }
    });

    const netProfit = totalSales - totalPurchases - totalExpenses;
    return {
      cashInHand, bankBalance, totalSales, totalPurchases,
      totalExpenses, totalReceivables, totalPayables, netProfit,
    };
  }

  private parseRecentVouchers(xmlText: string): RecentVoucher[] {
    const result: RecentVoucher[] = [];
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

        const date        = gt('DATE');
        const voucherType = (v.getAttribute('VCHTYPE') || gt('VOUCHERTYPENAME')).trim();
        if (!date || !voucherType) continue;

        const voucherNumber = gt('VOUCHERNUMBER');
        const partyName     = gt('PARTYLEDGERNAME') || gt('BASICBUYERNAME') || gt('PARTYNAME');

        // Amount = sum of Dr-side entries (negative AMOUNT tag in Day Book)
        let amount = 0;
        const entries = [
          ...Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')),
          ...Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
        ];
        entries.forEach(e => {
          const raw = parseFloat(e.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
          if (raw < 0) amount += Math.abs(raw);
        });
        if (amount === 0) {
          // fallback: sum all, divide by 2 (Dr+Cr)
          let sum = 0;
          entries.forEach(e => {
            sum += Math.abs(parseFloat(e.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0);
          });
          amount = sum / 2;
        }
        if (amount === 0) continue;

        result.push({ date, voucherType, voucherNumber, partyName, amount });
      } catch {
        // skip malformed block
      }
    }

    return result
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);
  }
}
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

