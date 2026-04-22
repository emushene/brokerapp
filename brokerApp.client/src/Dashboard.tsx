import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, TrendingUp, Users, Activity, ChevronRight } from 'lucide-react';
import api from './lib/api';
import type { Submission } from './lib/types';

const Dashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await api.get('/Submissions');
        setSubmissions(response.data);
      } catch (error) {
        console.error('Error fetching submissions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const totalPremium = submissions.reduce((sum, s) => sum + s.premium, 0);

  const stats = [
    { label: 'Total Submissions', value: submissions.length, icon: FilePlus, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Premium', value: `R ${totalPremium.toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Active Policies', value: Math.floor(submissions.length * 0.8), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Success Rate', value: '94%', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-400 mt-2">Welcome back! Here is a summary of your performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-slate-600 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <Activity className="text-slate-700 w-5 h-5 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Submissions */}
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
            <button 
              onClick={() => navigate('/submissions')}
              className="text-sm font-semibold text-blue-500 hover:text-blue-400 flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading your data...</div>
            ) : submissions.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FilePlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No submissions found. Start by creating your first policy!
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Applicant</th>
                    <th className="px-6 py-4">Premium</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {submissions.slice(0, 5).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-700/20 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{s.applicantSurname}</div>
                        <div className="text-xs text-slate-500">#{s.id}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">R {s.premium.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ring-green-500/20">Active</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group shadow-xl shadow-blue-600/20">
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold mb-2">New Policy?</h2>
              <p className="text-blue-100 mb-6 text-sm opacity-90">Quickly submit a new application for processing and instant tracking.</p>
              <button 
                onClick={() => navigate('/submissions')}
                className="bg-white text-blue-600 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                Create Submission
              </button>
            </div>
            <FilePlus className="absolute -bottom-4 -right-4 w-32 h-32 text-blue-500 opacity-20 rotate-12 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-4">Support Contact</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-slate-700 p-2 rounded-lg"><Users className="w-4 h-4" /></div>
                <div>
                  <p className="text-sm font-semibold text-white">Technical Support</p>
                  <p className="text-xs text-slate-500">support@brokerapp.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
