import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, FileText, ChevronRight, Calendar, Download, Printer, X, TrendingUp, Receipt, Search, ChevronLeft } from 'lucide-react';
import { financialsApi } from './lib/api';
import type { CommissionStatement } from './lib/types';

interface CommissionLineItem {
  id: number;
  commissionAmount: number;
  grossCommission: number;
  commissionRetention: number;
  clawBackGross: number;
  clawBackRetention: number;
  nettCommission: number;
  product?: string;
  captureDate?: string;
  clawBackReason?: string;
  splitPercentage: number;
  payoutReference: string;
  clientName: string;
  policyNumber?: string;
  premium?: number;
  dateCalculated: string;
}

interface GroupedPayslip {
  advisor: {
    id: number;
    name: string;
    code: string;
    email: string;
  };
  totalAmount: number;
  totalGross?: number;
  totalRetention?: number;
  totalClawbackGross?: number;
  totalClawbackRetention?: number;
  commissions: CommissionLineItem[];
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
  const [statementSearchTerm, setStatementSearchTerm] = useState('');

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

  const handleDownloadBulkPdf = () => {
    if (!selectedStatementId) return;
    const url = `/api/Financials/statements/${selectedStatementId}/payslips/pdf`;
    window.open(url, '_blank');
  };

  const handleDownloadSinglePdf = (advisorId?: number) => {
    const aid = advisorId || selectedPayslip?.advisor?.id;
    if (!aid || !selectedStatementId) return;
    const url = `/api/Financials/advisors/${aid}/payslips/${selectedStatementId}/pdf`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="font-bold uppercase tracking-widest text-xs">Loading Statements...</p>
      </div>
    );
  }

  const getItemRetention = (item: CommissionLineItem) => {
    if (item.commissionRetention && item.commissionRetention > 0) return item.commissionRetention;
    const gross = item.grossCommission || 0;
    const net = item.commissionAmount || 0;
    const cb = item.clawBackGross || 0;
    if (gross > 0 && gross > net + cb) return gross - net - cb;
    return 0;
  };

  const renderPrintablePayslip = (slip: GroupedPayslip) => {
    const totalGross = slip.commissions.reduce((sum, item) => sum + (item.grossCommission || item.nettCommission || item.commissionAmount), 0);
    const totalRetention = slip.commissions.reduce((sum, item) => sum + getItemRetention(item), 0);
    const totalClawbackGross = slip.commissions.reduce((sum, item) => sum + (item.clawBackGross || 0), 0);
    const totalClawbackRetention = slip.commissions.reduce((sum, item) => sum + (item.clawBackRetention || 0), 0);
    const totalNet = slip.totalAmount;

    return (
      <div key={slip.advisor.id} className="payslip-page bg-white p-6 text-black border-b border-slate-100 last:border-0 mb-6 print:mb-0">
        <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2.5 mb-4">
          <div>
            <h1 className="text-base font-black uppercase tracking-tight text-slate-900">Commission Statement</h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{statementData?.statement.fileName}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-black uppercase text-slate-400">Pay Period</p>
            <p className="text-xs font-bold text-slate-900">
              {statementData ? new Date(statementData.statement.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Recipient</p>
            <p className="text-sm font-black text-slate-900">{slip.advisor.name}</p>
            <p className="text-[9px] font-bold text-slate-600">Code: {slip.advisor.code}</p>
            <p className="text-[9px] text-slate-500">{slip.advisor.email}</p>
          </div>
          <div className="text-right flex flex-col justify-end">
            <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Net Advisor Payout</p>
            <p className="text-xl font-black text-slate-900">R {totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-1">Detailed Policy Breakdown</h3>
        </div>

        <table className="w-full mb-6 border-collapse text-left">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-[8px] font-black uppercase text-slate-700">
              <th className="p-1">Client Name</th>
              <th className="p-1">Policy #</th>
              <th className="p-1">Product</th>
              <th className="p-1 text-right">Premium</th>
              <th className="p-1 text-right">Gross Comm</th>
              <th className="p-1 text-right">Retention</th>
              <th className="p-1 text-right">Clawback (G)</th>
              <th className="p-1 text-right">Clawback (R)</th>
              <th className="p-1 text-right font-black">Net Comm</th>
              <th className="p-1 text-right font-black">Advisor Net</th>
              <th className="p-1">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[8px]">
            {slip.commissions.map(item => {
              const grossComm = item.grossCommission || item.nettCommission || item.commissionAmount;
              const ret = getItemRetention(item);
              const cbGross = item.clawBackGross || 0;
              const cbRet = item.clawBackRetention || 0;
              const netComm = item.nettCommission || (grossComm - ret - cbGross + cbRet);
              const advisorNet = item.commissionAmount;

              return (
                <tr key={item.id} className="text-left">
                  <td className="p-1 font-bold text-slate-900">{item.clientName || 'N/A'}</td>
                  <td className="p-1 font-mono text-slate-700">{item.policyNumber || 'N/A'}</td>
                  <td className="p-1 text-slate-700">{item.product || 'Excellence'}</td>
                  <td className="p-1 text-right font-medium">{item.premium ? `R ${item.premium.toFixed(2)}` : '-'}</td>
                  <td className="p-1 text-right font-medium text-slate-800">R {grossComm.toFixed(2)}</td>
                  <td className="p-1 text-right text-slate-600">{ret ? `R ${ret.toFixed(2)}` : '-'}</td>
                  <td className="p-1 text-right text-red-600">{cbGross ? `R ${cbGross.toFixed(2)}` : '-'}</td>
                  <td className="p-1 text-right text-green-700">{cbRet ? `R ${cbRet.toFixed(2)}` : '-'}</td>
                  <td className="p-1 text-right font-bold text-slate-900">R {netComm.toFixed(2)}</td>
                  <td className={`p-1 text-right font-black ${advisorNet < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                    R {advisorNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-1 text-slate-500 italic">{item.clawBackReason || '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-black text-[9px] border-t-2 border-slate-900">
              <td colSpan={4} className="p-1.5 uppercase text-slate-700">Total Statements Summary</td>
              <td className="p-1.5 text-right">R {totalGross.toFixed(2)}</td>
              <td className="p-1.5 text-right">R {totalRetention.toFixed(2)}</td>
              <td className="p-1.5 text-right text-red-600">R {totalClawbackGross.toFixed(2)}</td>
              <td className="p-1.5 text-right text-green-700">R {totalClawbackRetention.toFixed(2)}</td>
              <td className="p-1.5 text-right text-slate-900">
                R {slip.commissions.reduce((s, c) => s + (c.nettCommission || (c.grossCommission - c.commissionRetention - c.clawBackGross + c.clawBackRetention)), 0).toFixed(2)}
              </td>
              <td className="p-1.5 text-right text-slate-900 bg-slate-200">R {totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 uppercase font-bold tracking-widest">
          <p>Private & Confidential - BrokerApp Financial Statement</p>
          <p>System Verified</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <style>{`
        #print-zone {
          display: none;
        }
        @media print {
          @page {
            margin: 0;
            size: landscape;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
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
            padding: 1.2cm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Payslip Manager</h1>
          <p className="text-slate-400 text-xs mt-1">Select a statement run to view and print its associated advisor payslips.</p>
        </div>

        {statementData && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setIsBulkPrinting(true);
                setTimeout(() => window.print(), 150);
              }}
              disabled={filteredPayslips.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              <Printer className="w-4 h-4" />
              Print All ({filteredPayslips.length})
            </button>
            <button 
              onClick={handleDownloadBulkPdf}
              disabled={filteredPayslips.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              Download All PDFs
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* Left Column: Statements List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">1. Select Statement</h2>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-md border border-slate-700">
                {statements.length} Runs
              </span>
            </div>

            {/* Statement Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter statements..."
                value={statementSearchTerm}
                onChange={(e) => setStatementSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
              />
              {statementSearchTerm && (
                <button
                  onClick={() => setStatementSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Statements List */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {statements
                .filter(s => !statementSearchTerm || s.fileName.toLowerCase().includes(statementSearchTerm.toLowerCase()))
                .map(s => {
                  const isSelected = selectedStatementId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStatement(s.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500/60 shadow-lg shadow-blue-500/10 text-white'
                          : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className={`text-xs font-bold ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                            {s.fileName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(s.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Payslips List for Selected Statement */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">2. Payslips For</span>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {statementData ? statementData.statement.fileName : 'Select a Statement'}
                </h2>
              </div>

              {statementData && (
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 font-bold text-white">
                    {statementData.payslips.length} Advisors
                  </span>
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold">
                    R {statementData.payslips.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Advisor Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search advisor by name or code inside this statement..."
                value={searchTerm}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchName('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Payslip Table / List */}
            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="font-bold uppercase tracking-widest text-[10px]">Loading Advisor Payslips...</p>
              </div>
            ) : paginatedPayslips.length > 0 ? (
              <div className="border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-[10px] uppercase font-black tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3">Advisor Name</th>
                        <th className="px-5 py-3">Code</th>
                        <th className="px-5 py-3 text-center">Policies</th>
                        <th className="px-5 py-3 text-right">Net Payout</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {paginatedPayslips.map(slip => (
                        <tr
                          key={slip.advisor.id}
                          onClick={() => setSelectedPayslip(slip)}
                          className="hover:bg-slate-800/70 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3 font-bold text-white group-hover:text-blue-400 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                                {slip.advisor.name.charAt(0)}
                              </div>
                              <span>{slip.advisor.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-400 text-[11px]">{slip.advisor.code}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 font-mono text-[10px] text-slate-300">
                              {slip.commissions.length}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-black">
                            <span className={slip.totalAmount < 0 ? 'text-red-400' : 'text-emerald-400'}>
                              R {slip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className="text-[11px] font-bold text-blue-400 group-hover:underline inline-flex items-center gap-1">
                              Click to View <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-5 py-2.5 bg-slate-800/40 border-t border-slate-800 text-xs text-slate-400">
                    <span>Page {currentPage} of {totalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 rounded-xl py-12 flex flex-col items-center justify-center text-center px-4">
                <FileText className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-bold text-white mb-0.5">No Payslips Found</p>
                <p className="text-slate-500 text-[11px]">No advisor payslips match your search in this statement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Individual Detail Modal */}
      {selectedPayslip && statementData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md no-print">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-7xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Advisor Payslip Breakdown</h3>
                  <p className="text-slate-400 text-xs md:text-sm font-medium">{selectedPayslip.advisor.name} ({selectedPayslip.advisor.code}) — {statementData.statement.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsBulkPrinting(false);
                    setTimeout(() => window.print(), 150);
                  }}
                  className="p-3 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold"
                  title="Print Payslip"
                >
                  <Printer className="w-5 h-5 text-emerald-400" />
                  <span className="hidden sm:inline">Print Payslip</span>
                </button>
                <button 
                  onClick={() => handleDownloadSinglePdf()}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold"
                  title="Download PDF payslip"
                >
                  <Download className="w-5 h-5 text-blue-400" />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
               <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Advisor Code</p>
                    <p className="text-base md:text-lg font-bold text-white">{selectedPayslip.advisor.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Statement Date</p>
                    <p className="text-base md:text-lg font-bold text-white">{new Date(statementData.statement.statementDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Policies</p>
                    <p className="text-base md:text-lg font-bold text-blue-400">{selectedPayslip.commissions.length} Items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Payout</p>
                    <p className={`text-xl md:text-2xl font-black ${selectedPayslip.totalAmount < 0 ? 'text-red-500' : 'text-emerald-400'}`}>
                      R {selectedPayslip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
               </div>

               <div className="border border-slate-800 rounded-3xl overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-800/80 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
                      <tr>
                        <th className="px-3 py-3">Client Name</th>
                        <th className="px-3 py-3">Policy #</th>
                        <th className="px-3 py-3">Product</th>
                        <th className="px-3 py-3 text-right">Premium</th>
                        <th className="px-3 py-3 text-right">Gross Comm</th>
                        <th className="px-3 py-3 text-right">Retention</th>
                        <th className="px-3 py-3 text-right">Clawback (G)</th>
                        <th className="px-3 py-3 text-right">Clawback (R)</th>
                        <th className="px-3 py-3 text-right font-black text-blue-400">Net Comm</th>
                        <th className="px-3 py-3 text-right font-black text-emerald-400">Advisor Net</th>
                        <th className="px-3 py-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {selectedPayslip.commissions.map((item) => {
                        const isDeduction = item.commissionAmount < 0 && item.payoutReference?.startsWith('DEDUCTION:');
                        const grossComm = item.grossCommission || item.nettCommission || item.commissionAmount;
                        const ret = getItemRetention(item);
                        const cbGross = item.clawBackGross || 0;
                        const cbRet = item.clawBackRetention || 0;
                        const netComm = item.nettCommission || (grossComm - ret - cbGross + cbRet);
                        const advisorNet = item.commissionAmount;

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-3 py-2.5 font-bold text-white">{item.clientName || 'N/A'}</td>
                            <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px]">{item.policyNumber || 'N/A'}</td>
                            <td className="px-3 py-2.5 text-slate-300">{item.product || (isDeduction ? 'Adjustment' : 'Excellence')}</td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-300">{item.premium ? `R ${item.premium.toFixed(2)}` : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-slate-300">{isDeduction ? '-' : `R ${grossComm.toFixed(2)}`}</td>
                            <td className="px-3 py-2.5 text-right text-slate-400">{ret ? `R ${ret.toFixed(2)}` : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-red-400">{cbGross ? `R ${cbGross.toFixed(2)}` : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-emerald-400">{cbRet ? `R ${cbRet.toFixed(2)}` : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-slate-200 font-bold">{isDeduction ? '-' : `R ${netComm.toFixed(2)}`}</td>
                            <td className={`px-3 py-2.5 text-right font-black ${advisorNet < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                              R {advisorNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 italic text-[10px]">{item.clawBackReason || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
            <div className="p-6 md:p-8 bg-slate-800/30 border-t border-slate-800 flex justify-end gap-4">
              <button 
                onClick={() => handleDownloadSinglePdf()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-xl border border-slate-700/50 transition-all"
              >
                <Download className="w-4 h-4 text-blue-400" /> Download PDF
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
