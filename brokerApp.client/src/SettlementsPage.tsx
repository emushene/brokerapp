import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, CheckCircle, X, Loader2, Calendar, Search, Filter, CreditCard, AlertCircle, Package, FileText } from 'lucide-react';
import { financialsApi } from './lib/api';
import type { Commission, CommissionStatement, AccountAdjustment } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

interface GroupedPayout {
  id: string;
  advisorId: number;
  advisorName: string;
  statementId: number;
  statementName: string;
  totalAmount: number;
  isPaid: boolean;
  dateCalculated: string;
  commissionCount: number;
}

const SettlementsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout Modal State
  const [showGroupPayoutModal, setShowGroupPayoutModal] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedGroupPayout, setSelectedGroupPayout] = useState<GroupedPayout | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [paying, setPaying] = useState(false);

  // Deductions State
  const [outstandingAdjustments, setOutstandingAdjustments] = useState<AccountAdjustment[]>([]);
  const [deductionAmounts, setDeductionAmounts] = useState<{ [key: number]: number }>({});
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Paid'>('Pending');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [commData, stmtData] = await Promise.all([
        financialsApi.getCommissions(),
        financialsApi.getStatements()
      ]);
      setCommissions(commData);
      setStatements(stmtData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showGroupPayoutModal && selectedGroupPayout) {
      fetchAdjustments(selectedGroupPayout.advisorId);
      // Reset deductions
      setDeductionAmounts({});
      const now = new Date();
      setPayoutRef(`EFT_${now.getFullYear()}_${now.getMonth() + 1}_${selectedGroupPayout.advisorName.replace(/\s+/g, '_').toUpperCase()}`);
    }
  }, [showGroupPayoutModal, selectedGroupPayout]);

  const fetchAdjustments = async (advisorId: number) => {
    try {
      setLoadingAdjustments(true);
      const data = await financialsApi.getOutstandingAdjustments({ advisorId });
      setOutstandingAdjustments(data);
      
      // Auto-suggest deductions based on Target Monthly Repayment
      const initialDeductions: { [key: number]: number } = {};
      data.forEach(adj => {
        if (adj.targetMonthlyRepayment && adj.targetMonthlyRepayment > 0) {
          // Suggested amount is the target, but capped at the remaining balance
          initialDeductions[adj.id] = Math.min(adj.targetMonthlyRepayment, adj.remainingBalance);
        }
      });
      setDeductionAmounts(initialDeductions);
    } catch (error) {
      console.error('Error fetching adjustments:', error);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  const groupedPayouts = useMemo(() => {
    const groups: { [key: string]: GroupedPayout } = {};
    
    commissions.forEach(c => {
      if (c.commissionStatementId) {
        const key = `${c.advisorId}-${c.commissionStatementId}`;
        if (!groups[key]) {
          const stmt = statements.find(s => s.id === c.commissionStatementId);
          groups[key] = {
            id: key,
            advisorId: c.advisorId,
            advisorName: c.advisorName,
            statementId: c.commissionStatementId,
            statementName: stmt?.fileName || 'Statement ' + c.commissionStatementId,
            totalAmount: 0,
            isPaid: true,
            dateCalculated: c.dateCalculated,
            commissionCount: 0
          };
        }
        groups[key].totalAmount += c.commissionAmount;
        groups[key].commissionCount += 1;
        if (!c.isPaid) groups[key].isPaid = false;
        if (new Date(c.dateCalculated) > new Date(groups[key].dateCalculated)) {
          groups[key].dateCalculated = c.dateCalculated;
        }
      }
    });

    let result = Object.values(groups);

    if (statusFilter === 'Pending') {
      result = result.filter(g => !g.isPaid);
    } else if (statusFilter === 'Paid') {
      result = result.filter(g => g.isPaid);
    }

    return result.sort((a, b) => new Date(b.dateCalculated).getTime() - new Date(a.dateCalculated).getTime());
  }, [commissions, statements, statusFilter]);

  const handleMarkGroupAsPaid = async () => {
    if (!selectedGroupPayout || !payoutRef) return;
    try {
      setPaying(true);
      
      const deductions = Object.entries(deductionAmounts)
        .filter(([_, amount]) => amount > 0)
        .map(([id, amount]) => ({
          adjustmentId: parseInt(id),
          amount: amount
        }));

      await financialsApi.bulkSettle({
        advisorId: selectedGroupPayout.advisorId,
        statementId: selectedGroupPayout.statementId,
        payoutReference: payoutRef,
        deductions: deductions
      });

      setShowGroupPayoutModal(false);
      setSelectedGroupPayout(null);
      setPayoutRef('');
      setDeductionAmounts({});
      fetchData();
    } catch (error) {
      console.error('Error marking group as paid:', error);
    } finally {
      setPaying(false);
    }
  };

  const totalDeductions = useMemo(() => {
    return Object.values(deductionAmounts).reduce((sum, val) => sum + val, 0);
  }, [deductionAmounts]);

  const netPayout = (selectedGroupPayout?.totalAmount || 0) - totalDeductions;

  const columns: Column<GroupedPayout>[] = [
    {
      header: 'Advisor',
      accessor: (g) => {
        // Find if this advisor has any outstanding adjustments
        // Note: This requires adjustments to be available for the whole list, 
        // which might be expensive. For now, we'll keep it simple or fetch in a more optimized way.
        // As a simpler approach, we'll just check if it's a pending payout.
        return (
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-white">{g.advisorName}</p>
              {!g.isPaid && (
                <div title="Advisor has outstanding ledger items" className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
              {g.statementName}
            </p>
          </div>
        );
      }
    },
    {
      header: 'Date Calculated',
      accessor: (g) => (
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(g.dateCalculated).toLocaleDateString()}
        </div>
      )
    },
    {
      header: 'Gross Amount',
      accessor: (g) => (
        <div className="flex flex-col">
          <p className={`font-black ${g.totalAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
            R {g.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-500 uppercase font-bold">
            {g.commissionCount} {g.commissionCount === 1 ? 'Policy' : 'Policies'}
          </p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (g) => (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-tighter ${
          g.isPaid ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {g.isPaid ? 'Paid' : 'Pending'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Settlements & Payroll</h1>
          <p className="text-slate-400 mt-2">Manage collective advisor payouts and EFT reconciliations.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent text-xs text-white outline-none cursor-pointer py-1 min-w-[100px]"
          >
            <option value="All" className="bg-slate-900">All Payouts</option>
            <option value="Pending" className="bg-slate-900">Pending</option>
            <option value="Paid" className="bg-slate-900">Paid</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><DollarSign className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Outstanding</p>
           </div>
           <p className="text-3xl font-black text-white">
             R {groupedPayouts.filter(g => !g.isPaid).reduce((sum, g) => sum + g.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-xl text-green-500"><CheckCircle className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Paid (This Month)</p>
           </div>
           <p className="text-3xl font-black text-white">
             R {groupedPayouts.filter(g => g.isPaid).reduce((sum, g) => sum + g.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
           </p>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl">
           <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Search className="w-5 h-5" /></div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pending Advisor EFTs</p>
           </div>
           <p className="text-3xl font-black text-white">{groupedPayouts.filter(g => !g.isPaid).length}</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
        <DataTable
          data={groupedPayouts}
          columns={columns}
          loading={loading}
          pageSize={10}
          actions={[
            {
              icon: <Search className="w-4 h-4" />,
              label: 'View Policies',
              onClick: (g) => { setSelectedGroupPayout(g); setShowBreakdownModal(true); },
              className: 'text-blue-500'
            },
            {
              icon: <DollarSign className="w-4 h-4" />,
              label: 'Process Payout',
              onClick: (g) => { if (!g.isPaid) { setSelectedGroupPayout(g); setShowGroupPayoutModal(true); } },
              className: (g) => g.isPaid ? 'hidden' : 'text-green-500'
            }
          ]}
        />
      </div>

      {showBreakdownModal && selectedGroupPayout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <div>
                <h3 className="font-bold text-white text-sm">Policy Breakdown</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedGroupPayout.advisorName} - {selectedGroupPayout.statementName}</p>
              </div>
              <button onClick={() => setShowBreakdownModal(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
               <table className="w-full text-left text-xs">
                 <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter">Client Name</th>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter">Reference</th>
                      <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter text-right">Amount</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                    {commissions
                      .filter(c => c.advisorId === selectedGroupPayout.advisorId && c.commissionStatementId === selectedGroupPayout.statementId)
                      .map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-bold text-white">{c.applicantSurname} {c.applicantInitials}</td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{c.payoutReference}</td>
                          <td className={`px-4 py-3 text-right font-black ${c.commissionAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            R {c.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    }
                 </tbody>
               </table>
            </div>
            <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center">
               <p className="text-[10px] font-black text-slate-500 uppercase">Total Items: {selectedGroupPayout.commissionCount}</p>
               <p className="text-lg font-black text-white">Total: R {selectedGroupPayout.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {showGroupPayoutModal && selectedGroupPayout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div>
                <h3 className="text-xl font-black text-white">Bulk Settlement: {selectedGroupPayout.advisorName}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{selectedGroupPayout.statementName}</p>
              </div>
              <button onClick={() => setShowGroupPayoutModal(false)}><X className="w-6 h-6 text-slate-500 hover:text-white transition-colors" /></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Column 1: Payout ID & Deductions */}
              <div className="w-full lg:w-1/3 p-6 border-r border-slate-800 overflow-y-auto custom-scrollbar space-y-8">
                <section>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Step 1: Payout Identification</h4>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">EFT Payout Reference</label>
                      <input 
                        type="text" 
                        placeholder="e.g. EFT_JUNE_2026_ADVISORNAME"
                        value={payoutRef} 
                        onChange={(e) => setPayoutRef(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50" 
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Step 2: Manage Deductions</h4>
                    <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20 font-black">
                      Total Due: R {outstandingAdjustments.reduce((sum, a) => sum + a.remainingBalance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {loadingAdjustments ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 opacity-50">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Loading Debtors...</p>
                      </div>
                    ) : outstandingAdjustments.length > 0 ? (
                      outstandingAdjustments.map(adj => (
                        <div key={adj.id} className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                                {adj.type === 1 ? <CreditCard className="w-4 h-4 text-amber-500" /> : 
                                 adj.type === 0 ? <Package className="w-4 h-4 text-blue-500" /> : 
                                 <AlertCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{adj.description}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Balance: R {adj.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setDeductionAmounts(prev => ({ ...prev, [adj.id]: adj.remainingBalance }))}
                              className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase"
                            >
                              Deduct All
                            </button>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R</span>
                            <input 
                              type="number"
                              placeholder="0.00"
                              value={deductionAmounts[adj.id] || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setDeductionAmounts(prev => ({ ...prev, [adj.id]: Math.min(val, adj.remainingBalance) }));
                              }}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-red-500/30"
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center bg-slate-950/30 border border-dashed border-slate-800 rounded-2xl">
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No outstanding debts for this advisor</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Column 2: Policy List Breakdown */}
              <div className="w-full lg:w-1/3 p-0 border-r border-slate-800 flex flex-col overflow-hidden bg-slate-950/20">
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Step 3: Policies Included</h4>
                   <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full border border-blue-500/20 font-black">
                     {selectedGroupPayout.commissionCount} Policies
                   </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left text-[10px]">
                     <thead className="bg-slate-900/50 sticky top-0 backdrop-blur-sm z-10">
                        <tr>
                          <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter">Client / Policy</th>
                          <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-tighter text-right">Commission</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/50">
                        {commissions
                          .filter(c => c.advisorId === selectedGroupPayout.advisorId && c.commissionStatementId === selectedGroupPayout.statementId)
                          .map(c => (
                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-slate-800 rounded text-slate-500"><FileText className="w-3 h-3" /></div>
                                  <div>
                                    <p className="font-bold text-white">{c.applicantSurname} {c.applicantInitials}</p>
                                    <p className="text-[8px] text-slate-500 font-mono">{(c.payoutReference ?? '').split(' - ').pop()}</p>
                                  </div>
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-right font-black ${c.commissionAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                R {c.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        }
                     </tbody>
                   </table>
                </div>
              </div>

              {/* Column 3: Final Summary & Actions */}
              <div className="w-full lg:w-1/3 p-6 bg-slate-950/30 flex flex-col">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Final Settlement Summary</h4>
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-300">Gross Commissions</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Total policy earnings</p>
                    </div>
                    <p className="text-xl font-black text-white">R {selectedGroupPayout.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                      <div>
                        <p className="text-xs font-bold text-red-400">Total Deductions</p>
                        <p className="text-[9px] text-red-500/50 font-bold uppercase">{Object.values(deductionAmounts).filter(v => v > 0).length} items impacted</p>
                      </div>
                      <p className="text-xl font-black text-red-500">- R {totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    {/* Detailed Deductions List */}
                    {Object.entries(deductionAmounts).filter(([_, amount]) => amount > 0).length > 0 && (
                      <div className="px-2 space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-slate-900/30 rounded-xl p-3 border border-slate-800/50">
                        {Object.entries(deductionAmounts)
                          .filter(([_, amount]) => amount > 0)
                          .map(([id, amount]) => {
                            const adj = outstandingAdjustments.find(a => a.id === parseInt(id));
                            return (
                              <div key={id} className="flex items-center justify-between text-[10px] py-1 border-b border-white/5 last:border-0">
                                <span className="text-slate-400 font-bold uppercase truncate max-w-[150px]">
                                  {adj?.description || 'Adjustment ' + id}
                                </span>
                                <span className="text-red-400 font-black">- R {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>

                  <div className="pt-8 mt-auto border-t border-slate-800/50">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-widest">Net EFT Payout</p>
                        <p className="text-[10px] text-slate-500 font-bold">Final amount to record as paid.</p>
                      </div>
                      <p className="text-4xl font-black text-green-500">R {netPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>

                    <button 
                      onClick={handleMarkGroupAsPaid} 
                      disabled={paying || !payoutRef || netPayout < 0} 
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[1.5rem] transition-all text-base disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                    >
                      {paying ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                      Confirm Settlement & Record EFT
                    </button>
                    {netPayout < 0 && (
                      <p className="text-center text-red-500 text-[10px] font-black uppercase mt-4 tracking-widest">Error: Deductions cannot exceed gross earnings</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementsPage;
