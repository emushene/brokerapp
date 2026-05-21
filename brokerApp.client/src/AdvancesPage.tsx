import React, { useEffect, useState, useMemo } from 'react';
import { Wallet, Plus, Loader2, Calendar, User, Search, TrendingUp, AlertCircle, Trash2, CheckCircle, Clock, Filter, ArrowUpRight } from 'lucide-react';
import { financialsApi, advisorsApi } from './lib/api';
import { AdjustmentType, AdjustmentStatus } from './lib/types';
import type { AccountAdjustment, Advisor } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const AdvancesPage: React.FC = () => {
  const [adjustments, setAdjustments] = useState<AccountAdjustment[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    advisorId: '',
    totalAmount: '',
    description: '',
  });

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
        description: formData.description || 'Cash Advance',
        type: AdjustmentType.Advance
      });
      setIsModalOpen(false);
      setFormData({ advisorId: '', totalAmount: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating advance:', error);
      alert('Failed to create advance. Cash advances can only be assigned to individual advisors.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<AccountAdjustment>[] = [
    {
      header: 'Advisor',
      accessor: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <User className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <p className="font-bold text-white">{a.advisorName || a.advisorGroupName || 'Unknown'}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{a.advisorId ? 'Individual' : 'Group'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Description',
      accessor: (a) => (
        <div>
          <p className="text-sm font-medium text-slate-300">{a.description}</p>
          <div className="flex items-center gap-2 mt-1">
             <Calendar className="w-3 h-3 text-slate-500" />
             <span className="text-[10px] text-slate-500 font-bold">{new Date(a.dateIncurred).toLocaleDateString()}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (a) => {
        const status = a.status;
        let style = 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        if (status === AdjustmentStatus.Cleared) style = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        if (status === AdjustmentStatus.Pending) style = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        if (status === AdjustmentStatus.PartiallyPaid) style = 'bg-blue-500/10 text-blue-500 border-blue-500/20';

        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${style}`}>
            {Object.keys(AdjustmentStatus)[Object.values(AdjustmentStatus).indexOf(status)]}
          </span>
        );
      }
    },
    {
      header: 'Progress',
      accessor: (a) => {
        const progress = ((a.totalAmount - a.remainingBalance) / a.totalAmount) * 100;
        return (
          <div className="w-32">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter mb-1">
              <span className="text-slate-500">Repaid</span>
              <span className="text-white">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className="h-full bg-blue-500 transition-all duration-500" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      header: 'Remaining',
      accessor: (a) => (
        <div className="text-right">
          <p className="text-sm font-black text-white">R {a.remainingBalance.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-bold">Total: R {a.totalAmount.toLocaleString()}</p>
        </div>
      )
    }
  ];

  const totalOutstanding = adjustments.reduce((sum, a) => sum + a.remainingBalance, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="w-24 h-24 text-blue-500" />
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Outstanding</p>
          <p className="text-3xl font-black text-white">R {totalOutstanding.toLocaleString()}</p>
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
            R {adjustments.filter(a => a.status === AdjustmentStatus.Pending).reduce((s, a) => s + a.remainingBalance, 0).toLocaleString()}
          </p>
          <div className="mt-4 flex items-center gap-2 text-amber-500/50 text-[10px] font-bold uppercase tracking-widest">
            <Clock className="w-3 h-3" />
            Waiting for payslip run
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 p-2.5 rounded-xl">
              <Wallet className="w-5 h-5 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Advances Ledger</h2>
          </div>
        </div>
        
        <DataTable
          data={adjustments}
          columns={columns}
          loading={loading}
        />
      </div>

      {/* New Advance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Advisor</label>
                <select
                  required
                  value={formData.advisorId}
                  onChange={(e) => setFormData({ ...formData, advisorId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Choose an advisor...</option>
                  {advisors.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-6">
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
    </div>
  );
};

export default AdvancesPage;
