import React from 'react';
import { Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import { GSTSummaryData } from '../../../services/api/reports/reportsApiService';

interface Props {
  data: GSTSummaryData;
  formatCurrency: (n: number) => string;
}

const GstCell: React.FC<{ label: string; value: number; fc: (n: number) => string }> = ({ label, value, fc }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-semibold text-gray-800">{fc(value)}</p>
  </div>
);

const GstReport: React.FC<Props> = ({ data, formatCurrency: fc }) => {
  const { sales, purchases, netPayable } = data;
  const hasData = sales.total > 0 || purchases.total > 0;

  return (
    <div className="space-y-5">
      {/* Net GST payable */}
      <div className={`rounded-xl border p-5 flex items-center justify-between ${netPayable >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
        <div>
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">
            {netPayable >= 0 ? 'Net GST Payable (Output − Input)' : 'Net GST Refundable (Input > Output)'}
          </p>
          <p className={`text-3xl font-bold mt-1 ${netPayable >= 0 ? 'text-blue-700' : 'text-green-700'}`}>
            {fc(Math.abs(netPayable))}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${netPayable >= 0 ? 'bg-blue-100' : 'bg-green-100'}`}>
          <TrendingUp className={`w-7 h-7 ${netPayable >= 0 ? 'text-blue-600' : 'text-green-600'}`} />
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          No GST data found for this period. Ensure Sales/Purchase vouchers have CGST/SGST/IGST ledger entries.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Output GST (Sales) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Output GST — Sales</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <GstCell label="CGST" value={sales.cgst} fc={fc} />
                <GstCell label="SGST / UTGST" value={sales.sgst} fc={fc} />
                <GstCell label="IGST" value={sales.igst} fc={fc} />
              </div>
              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                <GstCell label="Taxable Amount" value={sales.taxable} fc={fc} />
                <div>
                  <p className="text-xs text-gray-500">Total Output Tax</p>
                  <p className="font-bold text-blue-700 text-lg">{fc(sales.total)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Input GST (Purchases) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-gray-800">Input GST — Purchases</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <GstCell label="CGST" value={purchases.cgst} fc={fc} />
                <GstCell label="SGST / UTGST" value={purchases.sgst} fc={fc} />
                <GstCell label="IGST" value={purchases.igst} fc={fc} />
              </div>
              <div className="border-t border-gray-100 pt-4 grid grid-cols-2 gap-4">
                <GstCell label="Taxable Amount" value={purchases.taxable} fc={fc} />
                <div>
                  <p className="text-xs text-gray-500">Total Input Tax</p>
                  <p className="font-bold text-purple-700 text-lg">{fc(purchases.total)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation table */}
      {hasData && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">GST Reconciliation</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left">Head</th>
                <th className="px-4 py-2.5 text-right">Output (Sales)</th>
                <th className="px-4 py-2.5 text-right">Input (Purchase)</th>
                <th className="px-4 py-2.5 text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {[
                { head: 'CGST',        out: sales.cgst,  inp: purchases.cgst },
                { head: 'SGST/UTGST',  out: sales.sgst,  inp: purchases.sgst },
                { head: 'IGST',        out: sales.igst,  inp: purchases.igst },
              ].map(row => {
                const net = row.out - row.inp;
                return (
                  <tr key={row.head} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{row.head}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fc(row.out)}</td>
                    <td className="px-4 py-2.5 text-right text-purple-700">{fc(row.inp)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${net >= 0 ? 'text-gray-800' : 'text-green-700'}`}>
                      {net >= 0 ? fc(net) : `(${fc(Math.abs(net))})`}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2.5 text-gray-800">Total</td>
                <td className="px-4 py-2.5 text-right text-blue-700">{fc(sales.total)}</td>
                <td className="px-4 py-2.5 text-right text-purple-700">{fc(purchases.total)}</td>
                <td className={`px-4 py-2.5 text-right ${netPayable >= 0 ? 'text-gray-900' : 'text-green-700'}`}>
                  {netPayable >= 0 ? fc(netPayable) : `(${fc(Math.abs(netPayable))})`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GstReport;
