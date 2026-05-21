import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, ChevronRight, DollarSign, Calendar, Download, Printer, X, Mail, TrendingUp, AlertTriangle, Lightbulb, CheckCircle, Clock, Wallet, Receipt } from 'lucide-react';
import { advisorsApi, financialsApi } from './lib/api';
import type { Advisor } from './lib/types';

interface PayslipSummary {
  id: number;
  fileName: string;
  statementDate: string;
  status: string;
  totalAmount: number;
}

interface PayslipDetail {
  statement: {
    id: number;
    fileName: string;
    statementDate: string;
    status: string;
  };
  commissions: {
    id: number;
    commissionAmount: number;
    payoutReference: string;
    clientName: string;
    dateCalculated: string;
  }[];
}

interface AdvisorStats {
  advisorName: string;
  totalEarned: number;
  totalClawbacks: number;
  activePoliciesCount: number;
  pendingPoliciesCount: number;
  outstandingDebt: number;
}

const AdvisorPayslipsPage: React.FC = () => {
  const { advisorId: paramAdvisorId } = useParams<{ advisorId: string }>();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(
    paramAdvisorId ? parseInt(paramAdvisorId) : null
  );
  const [payslips, setPayslips] = useState<PayslipSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [advisorStats, setAdvisorStats] = useState<AdvisorStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const data = await advisorsApi.getAll();
        setAdvisors(data);
        if (!selectedAdvisorId && data.length > 0 && !paramAdvisorId) {
          setSelectedAdvisorId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching advisors', error);
      }
    };
    fetchAdvisors();
  }, [paramAdvisorId]);

  useEffect(() => {
    if (selectedAdvisorId) {
      fetchPayslips(selectedAdvisorId);
      fetchAdvisorSummary(selectedAdvisorId);
    }
  }, [selectedAdvisorId]);

  const fetchPayslips = async (id: number) => {
    setLoading(true);
    try {
      const data = await financialsApi.getAdvisorPayslips(id);
      setPayslips(data);
    } catch (error) {
      console.error('Error fetching payslips', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisorSummary = async (id: number) => {
    setLoadingStats(true);
    try {
      const data = await advisorsApi.getAdvisorSummary(id);
      setAdvisorStats(data);
    } catch (error) {
      console.error('Error fetching summary', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleViewDetails = async (statementId: number) => {
    if (!selectedAdvisorId) return;
    setLoadingDetail(true);
    try {
      const data = await financialsApi.getPayslipDetails(selectedAdvisorId, statementId);
      setSelectedPayslip(data);
    } catch (error) {
      console.error('Error fetching payslip details', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const selectedAdvisor = advisors.find(a => a.id === selectedAdvisorId);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Advisor Portal</h1>
          <p className="text-slate-400 mt-2">Manage earnings, view pay slips, and policy insights.</p>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Select Advisor:</label>
          <select 
            value={selectedAdvisorId || ''} 
            onChange={(e) => setSelectedAdvisorId(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {advisors.map(advisor => (
              <option key={advisor.id} value={advisor.id}>{advisor.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-600/10 rounded-xl text-blue-500"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Earned</p>
          </div>
          <p className="text-2xl font-black text-white">R {advisorStats?.totalEarned.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-600/10 rounded-xl text-red-500"><AlertTriangle className="w-5 h-5" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Clawbacks</p>
          </div>
          <p className="text-2xl font-black text-red-400">R {advisorStats?.totalClawbacks.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-600/10 rounded-xl text-amber-500"><Wallet className="w-5 h-5" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Outstanding Debt</p>
          </div>
          <p className="text-2xl font-black text-amber-500">R {advisorStats?.outstandingDebt.toLocaleString() || '0'}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-600/10 rounded-xl text-green-500"><CheckCircle className="w-5 h-5" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Policies</p>
          </div>
          <p className="text-2xl font-black text-white">{advisorStats?.activePoliciesCount || '0'}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-600/10 rounded-xl text-slate-500"><Clock className="w-5 h-5" /></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Pending Match</p>
          </div>
          <p className="text-2xl font-black text-white">{advisorStats?.pendingPoliciesCount || '0'}</p>
        </div>
      </div>

      {/* Recommendations Section */}
      {advisorStats && (
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-2 rounded-xl text-white"><Lightbulb className="w-5 h-5" /></div>
            <h2 className="text-xl font-bold text-white tracking-tight">Growth Recommendations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {advisorStats.pendingPoliciesCount > 0 && (
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="p-2 bg-amber-500/10 h-fit rounded-lg text-amber-500"><Clock className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-bold text-white">Action Required: Pending Policies</p>
                  <p className="text-xs text-slate-400 mt-1">You have {advisorStats.pendingPoliciesCount} submissions that haven't been matched to payments yet. Follow up with clients to ensure premium payments are active.</p>
                </div>
              </div>
            )}
            {advisorStats.totalClawbacks > 500 && (
              <div className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="p-2 bg-red-500/10 h-fit rounded-lg text-red-500"><AlertTriangle className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-bold text-white">Retention Warning: High Clawbacks</p>
                  <p className="text-xs text-slate-400 mt-1">Clawbacks from lapsed policies are significantly affecting your net earnings. Consider reviewing your retention strategy for first-year policies.</p>
                </div>
              </div>
            )}
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="p-2 bg-green-500/10 h-fit rounded-lg text-green-500"><TrendingUp className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-bold text-white">Cross-Sell Opportunity</p>
                <p className="text-xs text-slate-400 mt-1">You have {advisorStats.activePoliciesCount} active clients. This is a great pool for exploring further protection needs or group product updates.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
              <div className="p-2 bg-blue-500/10 h-fit rounded-lg text-blue-500"><Receipt className="w-4 h-4" /></div>
              <div>
                <p className="text-sm font-bold text-white">Next Payout Cycle</p>
                <p className="text-xs text-slate-400 mt-1">Check your most recent pay slip for the breakdown of this month's successes. Keep the momentum going!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight px-2">Pay Slip History</h2>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="font-bold uppercase tracking-widest text-xs">Loading Pay Slips...</p>
          </div>
        ) : payslips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payslips.map(slip => (
              <div 
                key={slip.id} 
                className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 hover:border-blue-500/50 transition-all group cursor-pointer"
                onClick={() => handleViewDetails(slip.id)}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-blue-600/20 p-3 rounded-2xl group-hover:bg-blue-600/30 transition-colors">
                    <FileText className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full border uppercase ${
                    slip.status === 'Emailed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {slip.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1 truncate">{slip.fileName}</h3>
                <div className="flex items-center gap-2 text-slate-400 text-sm mb-6">
                  <Calendar className="w-4 h-4" />
                  {new Date(slip.statementDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payout Amount</p>
                    <p className={`text-xl font-black ${slip.totalAmount < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                      R {slip.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white text-slate-400 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/20 border border-dashed border-slate-700/50 rounded-[2.5rem] py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
              <FileText className="w-12 h-12 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Pay Slips Found</h3>
            <p className="text-slate-500 max-w-sm">
              Once a commission run is concluded, pay slips will appear here for {selectedAdvisor?.name}.
            </p>
          </div>
        )}
      </div>

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Pay Slip Details</h3>
                  <p className="text-slate-500 text-sm">{selectedPayslip.statement.fileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl border border-slate-700/50 transition-all">
                  <Printer className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setSelectedPayslip(null)}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl border border-slate-700/50 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Advisor</p>
                    <p className="text-lg font-bold text-white">{selectedAdvisor?.name}</p>
                    <p className="text-xs text-slate-400">{selectedAdvisor?.code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Statement Date</p>
                    <p className="text-lg font-bold text-white">
                      {new Date(selectedPayslip.statement.statementDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="md:text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Payout</p>
                    <p className={`text-3xl font-black ${selectedPayslip.commissions.reduce((s, c) => s + c.commissionAmount, 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                      R {selectedPayslip.commissions.reduce((s, c) => s + c.commissionAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-black text-slate-300 uppercase tracking-widest px-2">Line Items</p>
                <div className="border border-slate-800 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Client / Reference</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {selectedPayslip.commissions.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white">{item.clientName || 'N/A'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{item.payoutReference}</p>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${item.commissionAmount < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                            R {item.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
              <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-3 rounded-xl border border-slate-700/50 transition-all">
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button 
                onClick={() => setSelectedPayslip(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorPayslipsPage;
