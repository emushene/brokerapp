import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, FileText, ChevronRight, Calendar, Download, Printer, X, TrendingUp, Receipt, Search, ChevronLeft } from 'lucide-react';
import { financialsApi } from './lib/api';
import type { CommissionStatement } from './lib/types';

interface GroupedPayslip {
  advisor: {
    id: number;
    name: string;
    code: string;
    email: string;
  };
  totalAmount: number;
  commissions: {
    id: number;
    commissionAmount: number;
    payoutReference: string;
    clientName: string;
    dateCalculated: string;
  }[];
}

interface StatementPayslipsResponse {
  statement: {
    id: number;
    fileName: string;
    statementDate: string;
    status: string;
  };
  payslips: GroupedPayslip[];
}

const AdvisorPayslipsPage: React.FC = () => {
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [statementData, setStatementData] = useState<StatementPayslipsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchName] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Payout printing state
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<GroupedPayslip | null>(null);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const data = await financialsApi.getStatements();
      const concluded = data.filter(s => s.status !== 'Draft');
      setStatements(concluded);
      if (concluded.length > 0) {
        handleSelectStatement(concluded[0].id);
      }
    } catch (error) {
      console.error('Error fetching statements', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStatement = async (id: number) => {
    setSelectedStatementId(id);
    setLoadingDetails(true);
    setCurrentPage(1); // Reset to first page on statement change
    try {
      const data = await financialsApi.getStatementPayslips(id);
      setStatementData(data);
    } catch (error) {
      console.error('Error fetching statement payslips', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredPayslips = useMemo(() => {
    if (!statementData) return [];
    return statementData.payslips.filter(p => 
      p.advisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.advisor.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [statementData, searchTerm]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const paginatedPayslips = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayslips.slice(start, start + pageSize);
  }, [filteredPayslips, currentPage]);

  const totalPages = Math.ceil(filteredPayslips.length / pageSize);

  const handlePrintAll = () => {
    setIsBulkPrinting(true);
    // Increased timeout to ensure all components are fully rendered in the DOM before the print dialog captures it
    setTimeout(() => {
      window.print();
      setIsBulkPrinting(false);
    }, 1000);
  };

  const handlePrintSingle = () => {
    setIsBulkPrinting(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Loading Statements...</p>
      </div>
    );
  }

  const renderPrintablePayslip = (slip: GroupedPayslip) => (
    <div key={slip.advisor.id} className="payslip-page bg-white p-12 text-black border-b border-slate-100 last:border-0 mb-8 print:mb-0">
      <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-8">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Commission Statement</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{statementData?.statement.fileName}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase text-slate-400">Pay Period</p>
          <p className="text-sm font-bold text-slate-900">
            {statementData ? new Date(statementData.statement.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Recipient</p>
          <p className="text-base font-black text-slate-900">{slip.advisor.name}</p>
          <p className="text-[10px] font-bold text-slate-600">Code: {slip.advisor.code}</p>
          <p className="text-[10px] text-slate-500">{slip.advisor.email}</p>
        </div>
        <div className="text-right flex flex-col justify-end">
          <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Net Payout</p>
          <p className="text-2xl font-black text-slate-900">R {slip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-1">Earnings & Deductions Summary</h3>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th className="font-black uppercase p-2 text-[9px] text-slate-500">Description / Reference</th>
            <th className="text-right font-black uppercase p-2 text-[9px] text-slate-500">Amount</th>
          </tr>
        </thead>
        <tbody>
          {slip.commissions.map(item => (
            <tr key={item.id} className="border-b border-slate-50 text-left">
              <td className="p-2 text-[10px]">
                <span className="font-bold text-slate-800">{item.clientName || 'Adjustment'}</span>
                <span className="block text-[8px] font-mono text-slate-400 uppercase leading-none mt-0.5">{item.payoutReference}</span>
              </td>
              <td className={`p-2 text-right font-bold text-[10px] ${item.commissionAmount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                R {item.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="p-3 text-[11px] font-black uppercase text-slate-500">Total Net Payment</td>
            <td className="p-3 text-right text-[12px] font-black text-slate-900 bg-slate-50">R {slip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 uppercase font-bold tracking-widest">
        <p>Private & Confidential</p>
        <p>Verified Statement</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <style>{`
        #print-zone {
          display: none;
        }
        @media print {
          @page {
            margin: 1cm;
            size: auto;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #print-zone {
            visibility: visible !important;
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-zone * {
            visibility: visible !important;
          }
          .payslip-page {
            page-break-after: always !important;
            padding: 0 !important;
            margin: 0 0 2cm 0 !important;
            min-height: auto !important;
            display: block !important;
            background: white !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 1rem !important;
          }
          th {
            background-color: #f8fafc !important;
            border-bottom: 2px solid #e2e8f0 !important;
            color: #475569 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 9px !important;
            padding: 8px !important;
            text-align: left !important;
          }
          td {
            border-bottom: 1px solid #f1f5f9 !important;
            color: #1e293b !important;
            padding: 8px !important;
            font-size: 10px !important;
          }
          .text-red-500 { color: #dc2626 !important; }
          .text-green-500 { color: #16a34a !important; }
          .font-black { font-weight: 900 !important; }
          .font-bold { font-weight: 700 !important; }
          .uppercase { text-transform: uppercase !important; }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Payslip Manager</h1>
          <p className="text-slate-400 mt-2">Generate and bulk-print advisor payslips by commission run.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Select Commission Run</label>
            <select 
              value={selectedStatementId || ''} 
              onChange={(e) => handleSelectStatement(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[240px] text-sm font-bold"
            >
              {statements.map(s => (
                <option key={s.id} value={s.id}>{s.fileName} ({new Date(s.statementDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
              ))}
            </select>
          </div>
          <button 
            onClick={handlePrintAll}
            disabled={!statementData || filteredPayslips.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-5"
          >
            <Printer className="w-5 h-5" />
            Print All ({filteredPayslips.length})
          </button>
        </div>
      </div>

      {statementData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600/10 rounded-xl text-blue-500"><TrendingUp className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Gross Run</p>
            </div>
            <p className="text-2xl font-black text-white">
              R {statementData.payslips.reduce((s, p) => s + p.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600/10 rounded-xl text-green-500"><Receipt className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Advisors Paid</p>
            </div>
            <p className="text-2xl font-black text-white">{statementData.payslips.length}</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-600/10 rounded-xl text-amber-500"><Calendar className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Statement Date</p>
            </div>
            <p className="text-2xl font-black text-white">
              {new Date(statementData.statement.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6 no-print">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Advisor Breakdowns</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Filter by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        {loadingDetails ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Fetching Payout Data...</p>
          </div>
        ) : paginatedPayslips.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPayslips.map(slip => (
                <div 
                  key={slip.advisor.id} 
                  className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 hover:border-blue-500/50 transition-all group cursor-pointer flex flex-col"
                  onClick={() => setSelectedPayslip(slip)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{slip.advisor.name}</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{slip.advisor.code}</p>
                    </div>
                    <div className="bg-blue-600/10 p-2 rounded-xl text-blue-500">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net Payout</p>
                      <p className={`text-xl font-black ${slip.totalAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        R {slip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-slate-700/50 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                        currentPage === i + 1 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="bg-slate-800/20 border border-dashed border-slate-700/50 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center px-6">
            <h3 className="text-xl font-bold text-white mb-2">No Advisor Payouts Found</h3>
            <p className="text-slate-500 max-w-sm">No advisors were involved in this commission run.</p>
          </div>
        )}
      </div>

      {/* Individual Detail Modal */}
      {selectedPayslip && statementData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md no-print">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Advisor Payslip</h3>
                  <p className="text-slate-500 text-sm">{selectedPayslip.advisor.name} - {statementData.statement.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrintSingle}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all"
                  title="Print this payslip"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 mb-8 grid grid-cols-3 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Code</p>
                    <p className="text-lg font-bold text-white">{selectedPayslip.advisor.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-lg font-bold text-white">{new Date(statementData.statement.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                    <p className={`text-2xl font-black ${selectedPayslip.totalAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      R {selectedPayslip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
               </div>

               <div className="border border-slate-800 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/50 text-left">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client / Reference</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedPayslip.commissions.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold text-white">
                            {item.clientName || 'N/A'}
                            <span className="block text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{item.payoutReference}</span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${item.commissionAmount < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                            R {item.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex justify-end gap-4">
              <button 
                onClick={handlePrintSingle}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-xl border border-slate-700/50 transition-all"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button onClick={() => setSelectedPayslip(null)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN PRINT ZONE - Visibility controlled via CSS @media print */}
      {(isBulkPrinting || (selectedPayslip && !isBulkPrinting)) && (
        <div id="print-zone">
          {isBulkPrinting ? (
            filteredPayslips.map(slip => renderPrintablePayslip(slip))
          ) : (
            selectedPayslip && renderPrintablePayslip(selectedPayslip)
          )}
        </div>
      )}
    </div>
  );
};

export default AdvisorPayslipsPage;
