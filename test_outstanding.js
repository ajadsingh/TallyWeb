/**
 * Outstanding Module — Browser Console Test
 *
 * Paste this into the browser console at http://localhost:5174
 * Make sure a company is selected first.
 *
 * Tests:
 *  1. getReceivableParties  — fetches Sundry Debtor ledgers
 *  2. getPayableParties     — fetches Sundry Creditor ledgers
 *  3. getPartyTransactions  — fetches Day Book and filters by party name
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

function cleanXml(xmlText) {
  let s = xmlText;
  s = s.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
  s = s.replace(/&#x[0-8A-Fa-f];/gi, '');
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

async function tallyRequest(xmlBody) {
  const res = await fetch('/api/tally', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: xmlBody,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return cleanXml(await res.text());
}

function parseAmount(text) {
  if (!text) return 0;
  const s = text.trim().replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ── Test 1: Receivable Parties (Debtors) ────────────────────────────────────

async function testReceivables(company) {
  console.group('Test 1: Receivable Parties');
  const xml = `<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>DebtorLedgers</ID></HEADER>
  <BODY><DESC>
    <STATICVARIABLES>
      <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
    </STATICVARIABLES>
    <TDL><TDLMESSAGE>
      <COLLECTION NAME="DebtorLedgers" ISMODIFY="No">
        <TYPE>Ledger</TYPE>
        <FILTER>PartyFilter</FILTER>
        <FETCH>Name,Parent,OpeningBalance,ClosingBalance</FETCH>
      </COLLECTION>
      <SYSTEM TYPE="Formulae" NAME="PartyFilter">$$IsDebtors:$PARENT</SYSTEM>
    </TDLMESSAGE></TDL>
  </DESC></BODY></ENVELOPE>`;

  try {
    const response = await tallyRequest(xml);
    const doc = new DOMParser().parseFromString(response, 'text/xml');
    const ledgers = [...doc.querySelectorAll('LEDGER')].map(n => ({
      name: (n.getAttribute('NAME') || n.querySelector('NAME')?.textContent || '').trim(),
      parent: n.querySelector('PARENT')?.textContent?.trim() || '',
      closing: parseAmount(n.querySelector('CLOSINGBALANCE')?.textContent || '0'),
    })).filter(l => l.name);

    console.log(`Found ${ledgers.length} debtors`);
    console.table(ledgers.slice(0, 10));
    console.groupEnd();
    return ledgers;
  } catch (e) {
    console.error('Failed:', e.message);
    console.groupEnd();
    return [];
  }
}

// ── Test 2: Party Transactions (Day Book filter) ─────────────────────────────

async function testTransactions(company, partyName, fromDate = '20240401', toDate = '20250331') {
  console.group(`Test 2: Transactions for "${partyName}"`);
  const xml = `<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>Day Book</ID></HEADER>
  <BODY><DESC><STATICVARIABLES>
    <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
    <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
    <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
    <SVTODATE TYPE="Date">${toDate}</SVTODATE>
  </STATICVARIABLES></DESC></BODY></ENVELOPE>`;

  try {
    const response = await tallyRequest(xml);
    const doc = new DOMParser().parseFromString(response, 'text/xml');
    const partyLower = partyName.trim().toLowerCase();

    const allVouchers = [...doc.querySelectorAll('VOUCHER')];
    console.log(`Total vouchers in Day Book: ${allVouchers.length}`);

    const matched = [];
    allVouchers.forEach(node => {
      const date = node.querySelector('DATE')?.textContent?.trim() || '';
      const type = node.querySelector('VOUCHERTYPENAME')?.textContent?.trim() || '';
      const num  = node.querySelector('VOUCHERNUMBER')?.textContent?.trim() || '';

      let found = false;
      let amount = 0;

      // Check LEDGERENTRIES.LIST
      node.querySelectorAll('LEDGERENTRIES\\.LIST').forEach(e => {
        if (found) return;
        const n = e.querySelector('LEDGERNAME')?.textContent?.trim() ?? '';
        if (n.toLowerCase() === partyLower) {
          found = true;
          amount = Math.abs(parseAmount(e.querySelector('AMOUNT')?.textContent ?? '0'));
        }
      });

      // Fallback ALLLEDGERENTRIES.LIST
      if (!found) {
        node.querySelectorAll('ALLLEDGERENTRIES\\.LIST').forEach(e => {
          if (found) return;
          const n = e.querySelector('LEDGERNAME')?.textContent?.trim() ?? '';
          if (n.toLowerCase() === partyLower) {
            found = true;
            amount = Math.abs(parseAmount(e.querySelector('AMOUNT')?.textContent ?? '0'));
          }
        });
      }

      if (found) matched.push({ date, type, num, amount });
    });

    console.log(`Matched vouchers for "${partyName}": ${matched.length}`);
    console.table(matched);
    console.groupEnd();
    return matched;
  } catch (e) {
    console.error('Failed:', e.message);
    console.groupEnd();
    return [];
  }
}

// ── Run ──────────────────────────────────────────────────────────────────────

// Change these to your actual company name and party name
const COMPANY = 'YOUR_COMPANY_NAME';  // e.g. "ABC Traders"
const PARTY   = 'YOUR_PARTY_NAME';    // e.g. "XYZ Enterprises"

(async () => {
  const debtors = await testReceivables(COMPANY);

  if (debtors.length > 0) {
    const firstParty = PARTY || debtors[0].name;
    await testTransactions(COMPANY, firstParty);
  }
})();
