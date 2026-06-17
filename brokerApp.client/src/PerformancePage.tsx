import React, { useEffect, useState } from 'react';
import { BarChart3, Calendar, Users, TrendingUp, Search, X } from 'lucide-react';
import api from './lib/api';
import type { AdvisorPerformance } from './lib/types';

const PerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<AdvisorPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [weekLimit, setWeekLimit] = useState<'all' | 'limited'>('limited');
  const pageSize = 5;

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const response = await api.get('/Advisors/performance');
        setPerformance(response.data);
      } catch (err) {
        setError('Failed to load performance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, []);

  // Filter performance data based on search and selection
  const filteredPerformance = performance.filter(p => {
    const matchesSearch = p.advisorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSelect = selectedAdvisorId === 'all' || p.advisorId === selectedAdvisorId;
    return matchesSearch && matchesSelect;
  });

  // Get all unique weeks across filtered advisors - Normalize to YYYY-MM-DD
  const allWeeksRaw = Array.from(
    new Set(
      filteredPerformance.flatMap(p => (p.weeklyStats || []).map(w => {
          const d = new Date(w.weekStarting);
          return d.toISOString().split('T')[0];
      }))
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Apply week limit logic: Show top 3 and last 3 if limited
  const allWeeks = weekLimit === 'limited' && allWeeksRaw.length > 6
    ? [...allWeeksRaw.slice(0, 3), ...allWeeksRaw.slice(-3)]
    : allWeeksRaw;

  const paginatedPerformance = filteredPerformance.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredPerformance.length / pageSize);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-slate-500 animate-pulse">Loading performance metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Advisor Performance</h1>
          <p className="text-slate-400 mt-2">Weekly submission tracking grouped by Financial Advisor.</p>
        </div>

        {/* Filters Area */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-800/40 p-4 rounded-3xl border border-slate-700/50">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search advisor..."
              className="bg-slate-900/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select 
            className="bg-slate-900/50 border border-slate-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer min-w-[200px]"
            value={selectedAdvisorId}
            onChange={(e) => {
              setSelectedAdvisorId(e.target.value === 'all' ? 'all' : Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value="all">All Advisors</option>
            {performance.map(p => (
              <option key={p.advisorId} value={p.advisorId}>{p.advisorName}</option>
            ))}
          </select>

          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
            <button 
              onClick={() => setWeekLimit('limited')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${weekLimit === 'limited' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              Summary
            </button>
            <button 
              onClick={() => setWeekLimit('all')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${weekLimit === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
            >
              All Weeks
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Filtered Advisors</p>
          </div>
          <p className="text-3xl font-bold text-white">{filteredPerformance.length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-green-500/10 p-2 rounded-lg text-green-500">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Active Weeks</p>
          </div>
          <p className="text-3xl font-bold text-white">{allWeeks.length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-slate-600 transition-colors">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-sm font-medium">Total Submissions</p>
          </div>
          <p className="text-3xl font-bold text-white">
            {filteredPerformance.reduce((sum, p) => sum + (p.weeklyStats || []).reduce((s, w) => s + w.submissionCount, 0), 0)}
          </p>
        </div>
      </div>

      {filteredPerformance.length === 0 ? (
        <div className="p-20 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <p className="text-xl font-bold text-white">No advisors match your search</p>
          <p className="mt-2 text-slate-400">Try adjusting your filters or search term.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedAdvisorId('all'); }}
            className="mt-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-5 sticky left-0 bg-slate-900 z-20 border-b border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Advisor Name</th>
                  {allWeeks.map(week => (
                    <th key={week} className="px-6 py-5 border-b border-slate-700/50 min-w-[160px] text-center">
                      <div className="flex flex-col items-center">
                        <Calendar className="w-4 h-4 mb-1.5 text-blue-500/50" />
                        <span className="text-slate-200">
                          {new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-5 border-b border-slate-700/50 text-center bg-slate-900/90 sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.3)]">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginatedPerformance.map((advisor) => {
                  const statsList = advisor.weeklyStats || [];
                  const totalSubs = statsList.reduce((sum, w) => sum + w.submissionCount, 0);
                  const totalPrem = statsList.reduce((sum, w) => sum + w.totalPremium, 0);

                  return (
                    <tr key={advisor.advisorId} className="hover:bg-slate-700/30 transition-all group">
                      <td className="px-6 py-6 sticky left-0 bg-slate-800/95 group-hover:bg-slate-700/50 transition-colors z-10 font-bold text-white border-r border-slate-700/50 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">
                            {advisor.advisorName.charAt(0)}
                          </div>
                          {advisor.advisorName}
                        </div>
                      </td>
                      {allWeeks.map((week, idx) => {
                        const stats = statsList.find(w => new Date(w.weekStarting).toISOString().split('T')[0] === week);
                        // Add visual break if showing top 3 and last 3
                        const isBreak = weekLimit === 'limited' && idx === 3 && allWeeksRaw.length > 6;
                        
                        return (
                          <React.Fragment key={week}>
                            {isBreak && (
                              <td className="px-2 py-6 text-center bg-slate-900/20">
                                <div className="text-slate-600 font-bold">...</div>
                              </td>
                            )}
                            <td className="px-6 py-6 text-center group-hover:bg-blue-500/[0.02] transition-colors">
                              {stats ? (
                                <div className="space-y-1.5 scale-100 group-hover:scale-110 transition-transform">
                                  <div className="text-xl font-black text-blue-400 leading-none">{stats.submissionCount}</div>
                                  <div className="text-[11px] font-bold text-slate-500 bg-slate-900/40 py-0.5 px-2 rounded-full inline-block">
                                    R {stats.totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-1 w-4 bg-slate-800 mx-auto rounded-full"></div>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td className="px-6 py-6 text-center bg-slate-900/40 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.1)] group-hover:bg-slate-900/60 transition-colors">
                        <div className="space-y-1">
                          <div className="text-2xl font-black text-white leading-none">{totalSubs}</div>
                          <div className="text-xs font-bold text-green-500">
                            R {totalPrem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredPerformance.length)} of {filteredPerformance.length} Advisors
              </p>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformancePage;
