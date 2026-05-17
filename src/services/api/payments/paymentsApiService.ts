import BaseApiService from '../baseApiService';

export interface PaymentLedgerEntry {
  ledgerName: string;
  amount: number;
  isDr: boolean;
}

export interface PaymentVoucher {
  id: string;
  voucherNumber: string;
  date: string;           // DD/MM/YYYY (formatted)
  partyName: string;
  amount: number;
  narration: string;
  reference: string;
  guid: string;
  voucherType: string;    // "Receipt" | "Payment" | custom
  direction: 'in' | 'out'; // in = Receipt (money received), out = Payment (money paid)
  ledgerEntries: PaymentLedgerEntry[];
}

export default class PaymentsApiService extends BaseApiService {

  /**
   * Fetch all Receipt + Payment vouchers in a date range.
   * Uses TDL Collection with ($$IsReceipt OR $$IsPayment) filter.
   */
  async getPaymentVouchers(
    companyName: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<PaymentVoucher[]> {
    if (!companyName) throw new Error('No company selected.');

    const fromStr = fromDate ? this.formatDateForTally(fromDate) : '';
    const toStr   = toDate   ? this.formatDateForTally(toDate)   : '';

    const buildXml = (collName: string, filterName: string, filterFormula: string) => `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>${collName}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        ${fromStr ? `<SVFROMDATE TYPE="Date">${fromStr}</SVFROMDATE>` : ''}
        ${toStr   ? `<SVTODATE   TYPE="Date">${toStr}</SVTODATE>`   : ''}
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="${collName}">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, PARTYLEDGERNAME, VOUCHERTYPENAME, AMOUNT, GUID, REFERENCE, NARRATION</FETCH>
            <FETCH>ALLLEDGERENTRIES.LIST : LEDGERNAME, AMOUNT, ISDEEMEDPOSITIVE</FETCH>
            <FILTER>${filterName}</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="${filterName}">${filterFormula}</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    // Tally does NOT support OR across $$Is* functions in a single formula.
    // Make two separate sequential requests (queued by BaseApiService) and merge.
    const [receiptRaw, paymentRaw] = await Promise.all([
      this.makeRequest(buildXml('ReceiptVouchers', 'ReceiptFilter', '$$IsReceipt:$VOUCHERTYPENAME')),
      this.makeRequest(buildXml('PaymentVouchers', 'PaymentFilter', '$$IsPayment:$VOUCHERTYPENAME')),
    ]);

    const receipts = this.parseResponse(receiptRaw);
    const payments = this.parseResponse(paymentRaw);

    const all = [...receipts, ...payments];
    return all.sort((a, b) => {
      const parse = (d: string) => {
        const [dd, mm, yyyy] = d.split('/');
        return new Date(`${yyyy}-${mm}-${dd}`).getTime();
      };
      return parse(b.date) - parse(a.date);
    });
  }

  // ── Private Parsers ────────────────────────────────────────────────────────

  private parseResponse(xmlText: string): PaymentVoucher[] {
    const vouchers: PaymentVoucher[] = [];

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
        const cleaned = this.cleanXmlForParsing(chunk);
        const doc = this.parseXML(`<R>${cleaned}</R>`);
        if (doc.querySelector('parsererror')) continue;

        const v = doc.getElementsByTagName('VOUCHER')[0];
        if (!v) continue;

        const gt = (tag: string) =>
          v.getElementsByTagName(tag)[0]?.textContent?.trim() ?? '';

        const date          = this.formatTallyDate(gt('DATE'));
        const voucherNumber = gt('VOUCHERNUMBER');
        const voucherType   = (v.getAttribute('VCHTYPE') || gt('VOUCHERTYPENAME')).trim();
        const partyName     = (gt('PARTYLEDGERNAME') || gt('BASICBUYERNAME') || '').replace(/&amp;/g, '&');
        const topAmount     = Math.abs(parseFloat(gt('AMOUNT')) || 0);
        const narration     = gt('NARRATION') || gt('BASICNARRATION');
        const reference     = gt('REFERENCE');
        const guid          = gt('GUID');
        const remoteid      = v.getAttribute('REMOTEID') ?? '';

        if (!date && !voucherNumber) continue;

        // ── Determine direction ──────────────────────────────────────────────
        const vtLower = voucherType.toLowerCase();
        const isReceipt = vtLower.includes('receipt');
        const isPayment = vtLower.includes('payment');
        if (!isReceipt && !isPayment) continue; // skip non-pay/receipt types

        const direction: 'in' | 'out' = isReceipt ? 'in' : 'out';

        // ── Ledger entries ───────────────────────────────────────────────────
        const ledgerEntries: PaymentLedgerEntry[] = [];
        const entryNodes = [
          ...Array.from(v.getElementsByTagName('ALLLEDGERENTRIES.LIST')),
          ...Array.from(v.getElementsByTagName('LEDGERENTRIES.LIST')),
        ];
        entryNodes.forEach(entry => {
          const eName   = entry.getElementsByTagName('LEDGERNAME')[0]?.textContent?.trim() ?? '';
          if (!eName) return;
          const rawAmt  = parseFloat(entry.getElementsByTagName('AMOUNT')[0]?.textContent ?? '0') || 0;
          if (rawAmt === 0) return;
          const dpTag   = entry.getElementsByTagName('ISDEEMEDPOSITIVE')[0]?.textContent?.trim().toLowerCase();
          let isDr: boolean;
          if (dpTag === 'yes')     isDr = true;
          else if (dpTag === 'no') isDr = false;
          else                     isDr = rawAmt < 0;
          ledgerEntries.push({ ledgerName: eName, amount: Math.abs(rawAmt), isDr });
        });

        // Amount: use top-level if available, else take max ledger entry amount
        const amount = topAmount > 0
          ? topAmount
          : ledgerEntries.reduce((max, e) => Math.max(max, e.amount), 0);

        if (amount === 0 && ledgerEntries.length === 0) continue;

        vouchers.push({
          id: remoteid || guid || `pv_${vouchers.length}`,
          voucherNumber: voucherNumber || 'N/A',
          date,
          partyName: partyName || 'N/A',
          amount,
          narration,
          reference,
          guid,
          voucherType,
          direction,
          ledgerEntries,
        });
      } catch {
        // skip malformed block
      }
    }

    return vouchers;
  }

  private formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /** YYYYMMDD → DD/MM/YYYY for display */
  private formatTallyDate(tallyDate: string): string {
    if (!tallyDate || tallyDate.length !== 8) return tallyDate;
    const year  = tallyDate.substring(0, 4);
    const month = tallyDate.substring(4, 6);
    const day   = tallyDate.substring(6, 8);
    return `${day}/${month}/${year}`;
  }

  private cleanXmlForParsing(xmlText: string): string {
    let cleaned = xmlText;
    cleaned = cleaned.replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
    cleaned = cleaned.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
    cleaned = cleaned.replace(/&#x[0-8A-Fa-f];/gi, '');
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    return cleaned;
  }
}
