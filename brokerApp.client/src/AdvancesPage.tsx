import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Plus, Loader2, Calendar, User, Search, TrendingUp, AlertCircle, Trash2, CheckCircle, Clock, Filter, ArrowUpRight, Printer, Download, X, History as HistoryIcon } from 'lucide-react';
import { financialsApi, advisorsApi } from './lib/api';
import { AdjustmentType, AdjustmentStatus } from './lib/types';
import type { AccountAdjustment, Advisor, Commission } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const AdvancesPage: React.FC = () => {
  const [adjustments, setAdjustments] = useState<AccountAdjustment[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Group View State
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);
  
  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<AccountAdjustment | null>(null);
  const [repaymentHistory, setRepaymentHistory] = useState<Commission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    advisorId: '',
    totalAmount: '',
    targetMonthlyRepayment: '',
    description: '',
  });

  // Searchable Advisor Selection State
  const [advisorSearch, setAdvisorSearch] = useState('');
  const [isAdvisorDropdownOpen, setIsAdvisorDropdownOpen] = useState(false);

  const filteredAdvisors = useMemo(() => {
    if (!advisorSearch.trim()) return advisors;
    const q = advisorSearch.toLowerCase();
    return advisors.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.code.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  }, [advisors, advisorSearch]);

  const selectedAdvisor = useMemo(() => {
    if (!formData.advisorId) return null;
    return advisors.find(a => a.id.toString() === formData.advisorId) || null;
  }, [advisors, formData.advisorId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adjData, advData] = await Promise.all([
        financialsApi.getOutstandingAdjustments({}),
        advisorsApi.getAll()
      ]);
      // Filter only advances
      setAdjustments(adjData.filter(a => a.type === AdjustmentType.Advance));
      setAdvisors(advData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedAdvances = useMemo(() => {
    const groups: { [id: number]: { 
      advisorId: number, 
      advisorName: string, 
      totalOutstanding: number, 
      totalInitial: number, 
      count: number,
      items: AccountAdjustment[]
    } } = {};

    adjustments.forEach(adj => {
      if (!adj.advisorId) return;
      if (!groups[adj.advisorId]) {
        groups[adj.advisorId] = {
          advisorId: adj.advisorId,
          advisorName: adj.advisorName || 'Unknown',
          totalOutstanding: 0,
          totalInitial: 0,
          count: 0,
          items: []
        };
      }
      groups[adj.advisorId].totalOutstanding += adj.remainingBalance;
      groups[adj.advisorId].totalInitial += adj.totalAmount;
      groups[adj.advisorId].count += 1;
      groups[adj.advisorId].items.push(adj);
    });

    return Object.values(groups).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [adjustments]);

  const fetchHistory = async (adjustment: AccountAdjustment) => {
    try {
      setLoadingHistory(true);
      setSelectedAdjustment(adjustment);
      setShowHistoryModal(true);
      
      const allCommissions = await financialsApi.getCommissions(adjustment.advisorId);
      // Filter commissions that are linked to this adjustment (deductions)
      const history = allCommissions.filter(c => c.accountAdjustmentId === adjustment.id);
      setRepaymentHistory(history);
    } catch (error) {
      console.error('Error fetching repayment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.advisorId || !formData.totalAmount) return;

    try {
      setSubmitting(true);
      await financialsApi.createAdjustment({
        advisorId: parseInt(formData.advisorId),
        totalAmount: parseFloat(formData.totalAmount),
        targetMonthlyRepayment: formData.targetMonthlyRepayment ? parseFloat(formData.targetMonthlyRepayment) : undefined,
        description: formData.description || 'Cash Advance',
        type: AdjustmentType.Advance
      });
      setIsModalOpen(false);
      setFormData({ advisorId: '', totalAmount: '', targetMonthlyRepayment: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating advance:', error);
      alert('Failed to create advance. Cash advances can only be assigned to individual advisors.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Advisor',
      accessor: (g) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 text-blue-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-base">{g.advisorName}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{g.count} Active {g.count === 1 ? 'Advance' : 'Advances'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Portfolio Status',
      accessor: (g) => {
        const progress = ((g.totalInitial - g.totalOutstanding) / g.totalInitial) * 100;
        return (
          <div className="w-48">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter mb-1.5">
              <span className="text-slate-500">Repayment Progress</span>
              <span className="text-blue-400">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      header: 'Financial Summary',
      accessor: (g) => (
        <div className="text-right">
          <p className="text-lg font-black text-white">R {g.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Total Issued: R {g.totalInitial.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      )
    }
  ];

  const totalOutstanding = adjustments.reduce((sum, a) => sum + a.remainingBalance, 0);

  const handlePrintHistory = () => {
    window.print();
  };

  const renderPrintableHistory = () => {
    if (!selectedAdjustment) return null;
    
    return (
      <div id="print-zone">
        <div className="payslip-page bg-white p-12 text-black">
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-8">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">Advance Repayment Statement</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidential Financial Audit</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase text-slate-400">Printed On</p>
              <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Advisor Details</p>
              <p className="text-base font-black text-slate-900">{selectedAdjustment.advisorName}</p>
              <p className="text-[10px] font-bold text-slate-600">Advance Ref: {selectedAdjustment.description}</p>
            </div>
            <div className="text-right flex flex-col justify-end">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Remaining Balance</p>
              <p className="text-2xl font-black text-slate-900">R {selectedAdjustment.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-slate-200 p-4 rounded-xl">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Initial Amount</p>
              <p className="text-sm font-black text-slate-900">R {selectedAdjustment.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="border border-slate-200 p-4 rounded-xl">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Total Repaid</p>
              <p className="text-sm font-black text-green-600">R {(selectedAdjustment.totalAmount - selectedAdjustment.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="border border-slate-200 p-4 rounded-xl">
              <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Target Repayment</p>
              <p className="text-sm font-black text-blue-600">{selectedAdjustment.targetMonthlyRepayment ? `R ${selectedAdjustment.targetMonthlyRepayment.toLocaleString()}/mo` : 'N/A'}</p>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="font-black uppercase p-2 text-[9px] text-slate-500">Date</th>
                <th className="font-black uppercase p-2 text-[9px] text-slate-500">Activity / Reference</th>
                <th className="text-right font-black uppercase p-2 text-[9px] text-slate-500">Credit / Debit</th>
              </tr>
            </thead>
            <tbody>
              {/* Initial Advance Row */}
              <tr className="border-b border-slate-100 text-left bg-blue-50/30">
                <td className="p-2 text-[10px] text-slate-500">{new Date(selectedAdjustment.dateIncurred).toLocaleDateString()}</td>
                <td className="p-2 text-[10px]">
                  <span className="font-black text-blue-900 uppercase">Initial Advance Issued</span>
                  <span className="block text-[8px] font-mono text-blue-400 uppercase leading-none mt-0.5">{selectedAdjustment.description}</span>
                </td>
                <td className="p-2 text-right font-black text-[10px] text-slate-900">
                  R {selectedAdjustment.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {/* Repayments */}
              {repaymentHistory.map(item => (
                <tr key={item.id} className="border-b border-slate-50 text-left">
                  <td className="p-2 text-[10px] text-slate-400">{new Date(item.dateCalculated).toLocaleDateString()}</td>
                  <td className="p-2 text-[10px]">
                    <span className="font-bold text-slate-800">Repayment from Commission</span>
                    <span className="block text-[8px] font-mono text-slate-400 uppercase leading-none mt-0.5">{item.payoutReference}</span>
                  </td>
                  <td className="p-2 text-right font-bold text-[10px] text-green-600">
                    - R {Math.abs(item.commissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-3 text-[11px] font-black uppercase text-slate-500" colSpan={2}>Current Outstanding Balance</td>
                <td className="p-3 text-right text-[12px] font-black text-slate-900 bg-slate-50">R {selectedAdjustment.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 uppercase font-bold tracking-widest">
            <p>Financial Auditor Signature: _______________________</p>
            <p>Verified Statement</p>
          </div>
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
            size: auto;
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
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-amber-500" />
            Cash Advances
          </h1>
          <p className="text-slate-400 mt-2">Manage and track upfront advisor payments and repayments.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          New Advance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-24 h-24 text-blue-500" />
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Outstanding</p>
          <p className="text-3xl font-black text-white">R {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <div className="mt-4 flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
            <ArrowUpRight className="w-3 h-3" />
            Active Ledger Items
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Advances</p>
          <p className="text-3xl font-black text-white">{adjustments.length}</p>
          <div className="mt-4 flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <User className="w-3 h-3" />
            Assigned to Advisors
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Pending Clearance</p>
          <p className="text-3xl font-black text-amber-500">
            R {adjustments.filter(a => a.status === AdjustmentStatus.Pending).reduce((s, a) => s + a.remainingBalance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex items-center gap-2 text-amber-500/50 text-[10px] font-bold uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            Waiting for payslip run
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden no-print">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 p-2.5 rounded-xl">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Advances by Advisor</h2>
          </div>
        </div>
        
        <DataTable
          data={groupedAdvances}
          columns={columns}
          loading={loading}
          actions={[
            {
              icon: <HistoryIcon className="w-4 h-4" />,
              label: 'View Advances',
              onClick: (g) => setSelectedAdvisorId(g.advisorId),
              className: 'text-blue-500 hover:bg-blue-500/10'
            },
            {
              icon: <Plus className="w-4 h-4" />,
              label: 'New Advance',
              onClick: (g) => {
                setFormData({ ...formData, advisorId: g.advisorId.toString() });
                setIsModalOpen(true);
              },
              className: 'text-emerald-500 hover:bg-emerald-500/10'
            }
          ]}
        />
      </div>

      {/* DETAILED VIEW MODAL */}
      {selectedAdvisorId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                  <Wallet className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">
                    {groupedAdvances.find(g => g.advisorId === selectedAdvisorId)?.advisorName}'s Portfolio
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Advances & Repayment History</p>
                </div>
              </div>
              <button onClick={() => setSelectedAdvisorId(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-4">
              {groupedAdvances.find(g => g.advisorId === selectedAdvisorId)?.items.map(adj => (
                <div key={adj.id} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{adj.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(adj.dateIncurred).toLocaleDateString()}
                        </span>
                        {adj.targetMonthlyRepayment && (
                          <span className="text-[10px] text-blue-500 font-black uppercase bg-blue-500/5 px-2 py-0.5 rounded-full border border-blue-500/10">
                            R {adj.targetMonthlyRepayment}/mo Target
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-base font-black text-white">R {adj.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Initial: R {adj.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <button 
                      onClick={() => fetchHistory(adj)}
                      className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-white hover:bg-blue-600 transition-all shadow-sm"
                      title="View Repayment History"
                    >
                      <HistoryIcon 
 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Repayment History Modal */}
      {showHistoryModal && selectedAdjustment && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowHistoryModal(false)} />
          <div className="relative bg-slate-900 border border-slate-700/50 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2.5 rounded-2xl text-white">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Repayment History</h3>
                  <p className="text-xs text-slate-400 mt-1">{selectedAdjustment.advisorName} - {selectedAdjustment.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrintHistory}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all"
                  title="Print Repayment Statement"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setShowHistoryModal(false)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Initial Advance</p>
                  <p className="text-lg font-black text-white">R {selectedAdjustment.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Repaid</p>
                  <p className="text-lg font-black text-emerald-500">R {(selectedAdjustment.totalAmount - selectedAdjustment.remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Remaining</p>
                  <p className="text-lg font-black text-amber-500">R {selectedAdjustment.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-12 flex flex-col items-center gap-3 opacity-50">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Loading transactions...</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-4 py-3 font-black text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 font-black text-slate-500 uppercase">Activity</th>
                        <th className="px-4 py-3 font-black text-slate-500 uppercase text-right">Credit / Debit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {/* Show the "Given" date first */}
                      <tr className="bg-blue-600/5 hover:bg-blue-600/10 transition-colors">
                        <td className="px-4 py-3 text-slate-400">{new Date(selectedAdjustment.dateIncurred).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-black text-blue-400 uppercase tracking-tight italic">
                          Advance Issued
                          <span className="block text-[8px] font-mono text-slate-500 mt-0.5 normal-case not-italic">{selectedAdjustment.description}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-white">R {selectedAdjustment.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                      {repaymentHistory.map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-slate-400">{new Date(item.dateCalculated).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-bold text-white">
                            Repayment Deduction
                            <span className="block text-[8px] font-mono text-slate-500 mt-0.5">{item.payoutReference}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-500">- R {Math.abs(item.commissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    {repaymentHistory.length === 0 && (
                      <tfoot>
                        <tr>
                           <td colSpan={3} className="py-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">No repayments made yet.</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-800 bg-slate-800/30 flex justify-end gap-3">
              <button 
                onClick={handlePrintHistory}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-xl border border-slate-700/50 transition-all"
              >
                <Download className="w-4 h-4" /> Download Statement
              </button>
              <button onClick={() => setShowHistoryModal(false)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Advance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !submitting && setIsModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Issue New Advance</h3>
                  <p className="text-xs text-slate-400 mt-1">Record a cash advance for an advisor.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Advisor</label>
                
                {/* Trigger Control */}
                <div 
                  onClick={() => setIsAdvisorDropdownOpen(!isAdvisorDropdownOpen)}
                  className="w-full bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-2xl px-5 py-3.5 text-white outline-none focus-within:ring-2 focus-within:ring-blue-500/50 transition-all cursor-pointer flex items-center justify-between shadow-sm"
                >
                  {selectedAdvisor ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
                        {selectedAdvisor.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{selectedAdvisor.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{selectedAdvisor.code}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">Choose an advisor...</span>
                  )}
                  <Search className="w-4 h-4 text-slate-400" />
                </div>

                {/* Dropdown Menu */}
                {isAdvisorDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-[80] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-800 bg-slate-800/60">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search advisor by name or code..."
                          value={advisorSearch}
                          onChange={(e) => setAdvisorSearch(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500"
                        />
                        {advisorSearch && (
                          <button
                            type="button"
                            onClick={() => setAdvisorSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {filteredAdvisors.length > 0 ? (
                        filteredAdvisors.map(a => {
                          const isSelected = formData.advisorId === a.id.toString();
                          return (
                            <div
                              key={a.id}
                              onClick={() => {
                                setFormData({ ...formData, advisorId: a.id.toString() });
                                setIsAdvisorDropdownOpen(false);
                                setAdvisorSearch('');
                              }}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${
                                isSelected ? 'bg-blue-600/20 border border-blue-500/30 text-white' : 'hover:bg-slate-800/80 text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-bold text-xs">
                                  {a.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white">{a.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{a.code} {a.email ? `• ${a.email}` : ''}</p>
                                </div>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Selected</span>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 font-medium">
                          No advisors found matching "{advisorSearch}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Advance Amount (R)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Monthly Target (R)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Auto-deduct amount"
                    value={formData.targetMonthlyRepayment}
                    onChange={(e) => setFormData({ ...formData, targetMonthlyRepayment: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description / Reason</label>
                <textarea
                  placeholder="e.g. Early monthly advance"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[100px] placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-2 px-10 py-4 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Create Advance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE AREA */}
      {renderPrintableHistory()}
    </div>
  );
};

export default AdvancesPage;
