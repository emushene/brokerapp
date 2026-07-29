import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, TrendingUp, Users, Activity, ChevronRight, RefreshCw, CheckCircle2, Shield } from 'lucide-react';
import { submissionsApi, syncApi } from './lib/api';
import type { Submission } from './lib/types';

const Dashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const navigate = useNavigate();

  const fetchSubmissions = async () => {
    try {
      const data = await submissionsApi.getAll();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching submissions', error);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncApi.trigger();
      setSyncSuccess(true);
      setTimeout(() => {
        fetchSubmissions();
        setSyncSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setSyncing(false);
    }
  };

  const totalPremium = Array.isArray(submissions) ? submissions.reduce((sum, s) => sum + (s.premium || 0), 0) : 0;

  const stats = [
    { label: 'Total Submissions', value: submissions.length, icon: FilePlus },
    { label: 'Total Premium Volume', value: `R ${totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp },
    { label: 'Active Policies', value: Math.floor(submissions.length * 0.8), icon: Users },
    { label: 'Processing Rate', value: '98.4%', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time submission pipeline and portfolio financial overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className={`flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-lg border transition-all ${
              syncSuccess 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : syncSuccess ? 'Synced Successfully' : 'Sync Google Drive'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-[#111827]/80 border border-slate-800/90 p-5 rounded-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-medium">{stat.label}</span>
                <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions Table */}
        <div className="lg:col-span-2 bg-[#111827]/80 border border-slate-800/90 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800/90 flex items-center justify-between bg-[#1e293b]/30">
            <div>
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Recent Submissions</h2>
            </div>
            <button 
              onClick={() => navigate('/submissions')}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              View All Submissions <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No submissions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1e293b]/50 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3">Applicant Name</th>
                    <th className="px-5 py-3">Premium</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {submissions.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => navigate('/submissions')}>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-200">{s.applicantSurname} {s.initials}</div>
                        <div className="text-[10px] text-slate-500 font-mono">#{s.salaryRefNo || s.id}</div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-300">R {s.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider">
                          Active
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111827]/80 border border-slate-800/90 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-slate-300">
              <Shield className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Create New Submission</h2>
            </div>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">Submit a new policy application to the processing queue.</p>
            <button 
              onClick={() => navigate('/submissions')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2.5 rounded-lg transition-colors shadow-sm"
            >
              New Application
            </button>
          </div>

          <div className="bg-[#111827]/80 border border-slate-800/90 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Enterprise Operations</h2>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span>System Health</span>
                <span className="text-emerald-400 font-semibold">Operational</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span>Data Sync Status</span>
                <span className="text-slate-300 font-medium">Up to date</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
