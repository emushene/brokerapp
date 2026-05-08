import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Calendar, Hash, Users, Receipt, CheckCircle, Clock, ArrowDownLeft, X, Loader2 } from 'lucide-react';
import { financialsApi } from './lib/api';
import type { Commission } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const FinancialsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const data = await financialsApi.getCommissions();
      setCommissions(data);
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, []);

  const handleMarkAsPaid = async () => {
    if (!selectedCommission || !payoutRef) return;
    setPaying(true);
    try {
      await financialsApi.markAsPaid(selectedCommission.id, payoutRef);
      setShowPayoutModal(false);
      setPayoutRef('');
      setSelectedCommission(null);
      fetchCommissions();
    } catch (error) {
      console.error('Error marking commission as paid:', error);
    } finally {
      setPaying(false);
    }
  };

  useEffect(() => {
    if (showPayoutModal && selectedCommission && !payoutRef) {
      const dateStr = new Date().toISOString().slice(2,10).replace(/-/g, '');
      const prefix = selectedCommission.commissionAmount < 0 ? 'REC' : 'PAY';
      setPayoutRef(`${prefix}-${selectedCommission.advisorName.split(' ')[0].toUpperCase()}-${dateStr}-${selectedCommission.id}`);
    }
  }, [showPayoutModal, selectedCommission]);

  const totalCommissions = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
  
  // Use a Map to get unique payout amounts by policyPaymentId to avoid double counting shared commissions
  const uniquePayouts = new Map<number, number>();
  commissions.forEach(c => {
    // Only count positive earnings for gross revenue calculation
    if (c.commissionAmount > 0 && c.policyPaymentId) {
      uniquePayouts.set(c.policyPaymentId, c.amountReceived || 0);
    }
  });
  
  const totalGrossRevenue = Array.from(uniquePayouts.values()).reduce((sum, val) => sum + val, 0);
  const totalNetBrokerRevenue = totalGrossRevenue - totalCommissions;

  const columns: Column<Commission>[] = [
    {
      header: 'Date',
      accessor: (c) => (
        <div className="flex items-center gap-2 text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold">{new Date(c.dateCalculated).toLocaleDateString()}</span>
        </div>
      ),
      className: 'w-32'
    },
    {
      header: 'Status',
      accessor: (c) => (
        <div className="flex items-center gap-1.5">
          {c.isPaid ? (
            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/20">
              <CheckCircle className="w-3 h-3" />
              PAID
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              c.commissionAmount < 0 
                ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <Clock className="w-3 h-3" />
              {c.commissionAmount < 0 ? 'OWED BY ADVISOR' : 'DUE'}
            </span>
          )}
        </div>
      ),
      className: 'w-28'
    },
    {
      header: 'Advisor',
      accessor: (c) => (
        <div className="flex items-center gap-2 text-white font-bold text-xs">
          <Users className="w-3.5 h-3.5 text-blue-500" />
          {c.advisorName}
        </div>
      )
    },
    {
      header: 'Applicant',
      accessor: (c) => (
        <div className="flex flex-col">
          <span className="text-white font-bold text-xs">{c.applicantSurname || 'N/A'}, {c.applicantInitials}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-tighter">Policy Holder</span>
        </div>
      )
    },
    {
      header: 'Reference',
      accessor: (c) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
            <Hash className="w-3 h-3 text-slate-600" />
            {c.reference || 'N/A'}
          </div>
          {c.payoutReference && (
            <div className="text-[9px] text-slate-500 italic">
              Payout: {c.payoutReference}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Insurer Payout',
      accessor: (c) => (
        <div className="text-slate-400 text-xs font-medium">R {c.amountReceived.toLocaleString()}</div>
      ),
      className: 'text-right w-32'
    },
    {
      header: 'Commission',
      accessor: (c) => (
        <div className={`font-black text-sm flex items-center justify-end gap-1 ${c.commissionAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
          {c.commissionAmount < 0 && <ArrowDownLeft className="w-4 h-4" />}
          R {c.commissionAmount.toLocaleString()}
        </div>
      ),
      className: 'text-right w-32'
    }
  ];

  const actions = [
    {
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Mark as Paid',
      onClick: (c: Commission) => {
        if (c.isPaid) return;
        setSelectedCommission(c);
        setShowPayoutModal(true);
      },
      className: (c: Commission) => c.isPaid ? 'hidden' : 'text-green-400 hover:bg-green-400/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Financials & Commissions</h1>
          <p className="text-slate-400 mt-2">Track insurer payouts and advisor earnings.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl flex items-center gap-4 hover:border-slate-600 transition-colors">
          <div className="bg-green-600/20 p-4 rounded-2xl">
            <TrendingUp className="text-green-500 w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Gross Revenue</p>
            <p className="text-2xl font-black text-white">R {totalGrossRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl flex items-center gap-4 hover:border-slate-600 transition-colors">
          <div className="bg-blue-600/20 p-4 rounded-2xl">
            <DollarSign className="text-blue-500 w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total Commissions</p>
            <p className={`text-2xl font-black ${totalCommissions < 0 ? 'text-red-500' : 'text-white'}`}>R {totalCommissions.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl flex items-center gap-4 hover:border-slate-600 transition-colors">
          <div className="bg-purple-600/20 p-4 rounded-2xl">
            <Receipt className="text-purple-500 w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Net Broker Revenue</p>
            <p className="text-2xl font-black text-white">R {totalNetBrokerRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={commissions}
        columns={columns}
        actions={actions}
        loading={loading}
        searchPlaceholder="Search references or advisors..."
      />

      {/* Payout Modal */}
      {showPayoutModal && selectedCommission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Mark as Paid</h3>
                <p className="text-slate-400 text-sm">Commission payout for {selectedCommission.advisorName}</p>
              </div>
              <button 
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className={`p-4 rounded-2xl border ${
                selectedCommission.commissionAmount < 0 
                  ? 'bg-red-600/10 border-red-500/30' 
                  : 'bg-green-600/10 border-green-500/30'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest mb-1 opacity-70">
                  <span>Commission ID</span>
                  <span>Amount Due</span>
                </div>
                <div className="flex items-center justify-between font-bold">
                  <span className="text-white">#{selectedCommission.id}</span>
                  <span className={`text-xl ${selectedCommission.commissionAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    R {selectedCommission.commissionAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    Payout Reference
                  </label>
                  <input 
                    type="text" 
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    placeholder="e.g. EFT-ADVISOR-001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-600" 
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-800/50 rounded-lg">
                  <Calendar className="w-3 h-3" />
                  Payout date will be recorded as today.
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/30 border-t border-slate-800">
              <button
                onClick={handleMarkAsPaid}
                disabled={paying || !payoutRef}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialsPage;
