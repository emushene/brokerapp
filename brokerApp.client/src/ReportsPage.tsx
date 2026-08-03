import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileBarChart, 
  Wallet, 
  Package, 
  Users, 
  Search, 
  Download, 
  Printer, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  PieChart, 
  Layers, 
  AlertCircle,
  X,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Phone,
  Mail,
  Receipt,
  FileText,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { financialsApi } from './lib/api';
import type { AdvancesGiftsReport, TeamDebtSummary, AdvisorDebtSummary, AccountAdjustment } from './lib/types';
import { AdjustmentType, AdjustmentStatus } from './lib/types';

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<AdvancesGiftsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'advisors' | 'ledger'>('advisors');
  
  // Selected Advisor for Detailed Modal
  const [selectedAdvisor, setSelectedAdvisor] = useState<AdvisorDebtSummary | null>(null);
  const [advisorModalFilter, setAdvisorModalFilter] = useState<'all' | 'pending' | 'cleared'>('all');

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'advance' | 'gift' | 'other'>('all');
  const [statusFilter, setStatusFilter] = useState<'owed_only' | 'all' | 'cleared'>('owed_only');
  const [expandedTeams, setExpandedTeams] = useState<{ [key: number]: boolean }>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await financialsApi.getAdvancesAndGiftsReport({
        page: 1,
        pageSize: -1, // Fetch all to allow client side filtering + advisor detail lookup
        searchTerm,
        typeFilter,
        statusFilter
      });
      setReportData(data);

      const initialExpanded: { [key: number]: boolean } = {};
      data.teams.forEach(t => {
        if (t.totalTeamOwed > 0) initialExpanded[t.groupId] = true;
      });
      setExpandedTeams(initialExpanded);
    } catch (error) {
      console.error('Failed to load advances and gifts report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, activeTab, pageSize]);

  const toggleTeamExpand = (groupId: number) => {
    setExpandedTeams(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const matchSearch = (text: string, query: string) => {
    if (!query.trim()) return true;
    const tokens = query.toLowerCase().trim().split(/\s+/);
    const target = text.toLowerCase();
    return tokens.every(token => target.includes(token));
  };

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    if (!reportData) return [];
    let list = reportData.teams;

    if (statusFilter === 'owed_only') {
      list = list.filter(t => t.totalTeamOwed > 0);
    } else if (statusFilter === 'cleared') {
      list = list.filter(t => t.totalTeamOwed === 0);
    }

    if (searchTerm.trim()) {
      list = list.filter(t => {
        const teamText = `${t.groupName} ${t.description || ''}`;
        if (matchSearch(teamText, searchTerm)) return true;

        return t.members.some(m => {
          const memberText = `${m.advisorName} ${m.advisorCode} ${m.email || ''} ${m.phoneNumber || ''}`;
          return matchSearch(memberText, searchTerm);
        });
      });
    }

    return list;
  }, [reportData, statusFilter, searchTerm]);

  // Filtered Advisors
  const filteredAdvisors = useMemo(() => {
    if (!reportData) return [];
    let list = reportData.advisors;

    if (statusFilter === 'owed_only') {
      list = list.filter(a => a.totalOwed > 0);
    } else if (statusFilter === 'cleared') {
      list = list.filter(a => a.totalOwed === 0);
    }

    if (typeFilter === 'advance') {
      list = list.filter(a => a.advancesOwed > 0);
    } else if (typeFilter === 'gift') {
      list = list.filter(a => a.giftsOwed > 0);
    } else if (typeFilter === 'other') {
      list = list.filter(a => a.otherOwed > 0);
    }

    if (searchTerm.trim()) {
      list = list.filter(a => {
        const text = `${a.advisorName} ${a.advisorCode} ${a.advisorGroupName || 'unassigned'} ${a.email || ''} ${a.phoneNumber || ''}`;
        return matchSearch(text, searchTerm);
      });
    }

    return list;
  }, [reportData, statusFilter, typeFilter, searchTerm]);

  // Filtered Ledger Items
  const filteredAdjustments = useMemo(() => {
    if (!reportData) return [];
    let list = reportData.adjustments;

    if (statusFilter === 'owed_only') {
      list = list.filter(a => a.remainingBalance > 0);
    } else if (statusFilter === 'cleared') {
      list = list.filter(a => a.remainingBalance === 0);
    }

    if (typeFilter === 'advance') {
      list = list.filter(a => a.type === AdjustmentType.Advance);
    } else if (typeFilter === 'gift') {
      list = list.filter(a => a.type === AdjustmentType.PromotionalItem);
    } else if (typeFilter === 'other') {
      list = list.filter(a => a.type !== AdjustmentType.Advance && a.type !== AdjustmentType.PromotionalItem);
    }

    if (searchTerm.trim()) {
      list = list.filter(a => {
        const text = `${a.advisorName || ''} ${a.advisorGroupName || ''} ${a.description} ${a.promotionalItemName || ''}`;
        return matchSearch(text, searchTerm);
      });
    }

    return list;
  }, [reportData, statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    if (searchTerm.trim() && reportData) {
      const autoExpanded: { [key: number]: boolean } = {};
      filteredTeams.forEach(t => {
        autoExpanded[t.groupId] = true;
      });
      setExpandedTeams(autoExpanded);
    }
  }, [searchTerm, filteredTeams, reportData]);

  // Active items count for active tab
  const activeTotalItems = useMemo(() => {
    if (activeTab === 'advisors') return filteredAdvisors.length;
    if (activeTab === 'teams') return filteredTeams.length;
    return filteredAdjustments.length;
  }, [activeTab, filteredAdvisors, filteredTeams, filteredAdjustments]);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(activeTotalItems / pageSize));
  }, [activeTotalItems, pageSize]);

  const paginatedAdvisors = useMemo(() => {
    if (pageSize <= 0) return filteredAdvisors;
    const start = (currentPage - 1) * pageSize;
    return filteredAdvisors.slice(start, start + pageSize);
  }, [filteredAdvisors, currentPage, pageSize]);

  const paginatedTeams = useMemo(() => {
    if (pageSize <= 0) return filteredTeams;
    const start = (currentPage - 1) * pageSize;
    return filteredTeams.slice(start, start + pageSize);
  }, [filteredTeams, currentPage, pageSize]);

  const paginatedAdjustments = useMemo(() => {
    if (pageSize <= 0) return filteredAdjustments;
    const start = (currentPage - 1) * pageSize;
    return filteredAdjustments.slice(start, start + pageSize);
  }, [filteredAdjustments, currentPage, pageSize]);

  // Adjustments specific to selected advisor for modal
  const advisorAdjustments = useMemo(() => {
    if (!selectedAdvisor || !reportData) return [];
    let list = reportData.adjustments.filter(a => a.advisorId === selectedAdvisor.advisorId);

    if (advisorModalFilter === 'pending') {
      list = list.filter(a => a.remainingBalance > 0);
    } else if (advisorModalFilter === 'cleared') {
      list = list.filter(a => a.remainingBalance === 0);
    }

    return list;
  }, [selectedAdvisor, reportData, advisorModalFilter]);

  // Export Advisor Statement CSV
  const exportAdvisorStatementCSV = () => {
    if (!selectedAdvisor || !advisorAdjustments) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `Advisor Statement for: "${selectedAdvisor.advisorName}" (${selectedAdvisor.advisorCode})\n`;
    csvContent += `Team: "${selectedAdvisor.advisorGroupName || 'Unassigned'}", Total Owed: R ${selectedAdvisor.totalOwed}\n\n`;
    csvContent += 'Date Incurred,Type,Description / Gift Item,Original Total,Amount Deducted,Remaining Balance,Status\n';

    advisorAdjustments.forEach(adj => {
      const typeLabel = adj.type === AdjustmentType.Advance ? 'Advance' : adj.type === AdjustmentType.PromotionalItem ? 'Promotional Gift' : 'Other';
      const paid = adj.totalAmount - adj.remainingBalance;
      const statusLabel = adj.remainingBalance === 0 ? 'Cleared' : paid > 0 ? 'Partially Paid' : 'Pending';
      csvContent += `"${new Date(adj.dateIncurred).toLocaleDateString()}","${typeLabel}","${adj.description.replace(/"/g, '""')}",${adj.totalAmount},${paid},${adj.remainingBalance},"${statusLabel}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Advisor_Statement_${selectedAdvisor.advisorName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV
  const exportToCSV = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeTab === 'teams') {
      csvContent += 'Team Name,Direct Advances Owed,Direct Gifts Owed,Direct Other Owed,Members Advances Owed,Members Gifts Owed,Total Team Owed,Member Count\n';
      filteredTeams.forEach(t => {
        csvContent += `"${t.groupName}",${t.directGroupAdvancesOwed},${t.directGroupGiftsOwed},${t.directGroupOtherOwed},${t.membersAdvancesOwed},${t.membersGiftsOwed},${t.totalTeamOwed},${t.memberCount}\n`;
      });
    } else if (activeTab === 'advisors') {
      csvContent += 'Advisor Name,Advisor Code,Team/Group,Advances Owed,Gifts Owed,Other Owed,Total Owed,Active Adjustments\n';
      filteredAdvisors.forEach(a => {
        csvContent += `"${a.advisorName}","${a.advisorCode}","${a.advisorGroupName || 'Unassigned'}",${a.advancesOwed},${a.giftsOwed},${a.otherOwed},${a.totalOwed},${a.activeAdjustmentsCount}\n`;
      });
    } else {
      csvContent += 'Date,Type,Target,Description,Original Amount,Remaining Balance,Status\n';
      filteredAdjustments.forEach(adj => {
        const target = adj.advisorName ? `Advisor: ${adj.advisorName}` : `Team: ${adj.advisorGroupName}`;
        const typeLabel = adj.type === AdjustmentType.Advance ? 'Advance' : adj.type === AdjustmentType.PromotionalItem ? 'Promotional Gift' : 'Other';
        const statusLabel = adj.remainingBalance === 0 ? 'Cleared' : adj.remainingBalance < adj.totalAmount ? 'Partially Paid' : 'Pending';
        csvContent += `"${new Date(adj.dateIncurred).toLocaleDateString()}","${typeLabel}","${target}","${adj.description.replace(/"/g, '""')}",${adj.totalAmount},${adj.remainingBalance},"${statusLabel}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Advances_And_Gifts_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !reportData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-slate-400 text-sm font-medium">Generating Advances & Gifts Report...</p>
      </div>
    );
  }

  const summary = reportData?.summary;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Advances & Gifts Report</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Click on any advisor row to open a full itemized liability statement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-medium text-slate-300 transition-colors"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-medium text-emerald-400 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-900/90 to-blue-950/40 border border-blue-500/20 rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
              <PieChart className="w-16 h-16 -mr-4 -mt-4" />
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <FileBarChart className="w-4 h-4" />
              </span>
              <span>Total Owed (Grand Balance)</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              R {summary.grandTotalOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="text-blue-400 font-semibold">{summary.totalActiveAdjustmentsCount}</span> active items outstanding
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </span>
              <span>Cash Advances Owed</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              R {summary.totalAdvancesOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Assigned directly to individual advisors
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Package className="w-4 h-4" />
              </span>
              <span>Promotional Gifts Owed</span>
            </div>
            <div className="text-2xl font-bold text-purple-400 tracking-tight">
              R {summary.totalGiftsOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Apparel, marketing gear & merchandise
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden group">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Users className="w-4 h-4" />
              </span>
              <span>Active Debtors</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
              <span>{summary.activeDebtorAdvisorsCount}</span>
              <span className="text-xs font-normal text-slate-400">Advisors</span>
              <span className="text-slate-600">|</span>
              <span>{summary.activeDebtorTeamsCount}</span>
              <span className="text-xs font-normal text-slate-400">Teams</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Entities with pending or partial balance
            </div>
          </div>
        </div>
      )}

      {/* Controls & Tab Navigation */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 print:hidden">
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTab('advisors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'advisors'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>By Advisor ({filteredAdvisors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'teams'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>By Team / Group ({filteredTeams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Detailed Item Ledger ({filteredAdjustments.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by advisor name, code, or team..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Item Types</option>
            <option value="advance">Cash Advances Only</option>
            <option value="gift">Promotional Gifts Only</option>
            <option value="other">Other Adjustments</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="owed_only">Outstanding Owed Only</option>
            <option value="all">All Statuses (Inc. Cleared)</option>
            <option value="cleared">Cleared / Fully Paid Only</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            title="Items per page"
          >
            <option value={10}>10 / Page</option>
            <option value={25}>25 / Page</option>
            <option value={50}>50 / Page</option>
            <option value={100}>100 / Page</option>
            <option value={-1}>Show All</option>
          </select>
        </div>
      </div>

      {searchTerm.trim() && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-xs text-blue-300 print:hidden">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Search results for "<strong>{searchTerm}</strong>": Found{' '}
            <button onClick={() => setActiveTab('advisors')} className="underline font-bold hover:text-white">
              {filteredAdvisors.length} Advisor(s)
            </button>
            ,{' '}
            <button onClick={() => setActiveTab('teams')} className="underline font-bold hover:text-white">
              {filteredTeams.length} Team(s)
            </button>
            , and{' '}
            <button onClick={() => setActiveTab('ledger')} className="underline font-bold hover:text-white">
              {filteredAdjustments.length} Ledger Item(s)
            </button>
            .
          </span>
        </div>
      )}

      {/* VIEW 1: BY ADVISOR */}
      {activeTab === 'advisors' && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Advisor Liabilities Breakdown</h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any advisor row to view full itemized debt statement</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total Matching Advisors: {filteredAdvisors.length}
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Advisor</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4 text-right">Advances Owed</th>
                  <th className="py-3 px-4 text-right">Gifts Owed</th>
                  <th className="py-3 px-4 text-right">Other Owed</th>
                  <th className="py-3 px-4 text-right">Total Owed</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedAdvisors.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 italic">
                      No advisors match "{searchTerm || 'selected filter'}".
                    </td>
                  </tr>
                ) : (
                  paginatedAdvisors.map((adv) => (
                    <tr 
                      key={adv.advisorId} 
                      onClick={() => setSelectedAdvisor(adv)}
                      className={`hover:bg-slate-800/60 transition-colors cursor-pointer group ${
                        searchTerm && adv.advisorName.toLowerCase().includes(searchTerm.toLowerCase()) 
                          ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 text-sm group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                          <span>{adv.advisorName}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {adv.email && <div className="text-[10px] text-slate-400">{adv.email}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {adv.advisorCode}
                      </td>
                      <td className="py-3 px-4">
                        {adv.advisorGroupName ? (
                          <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 font-medium text-[11px] border border-blue-500/20">
                            {adv.advisorGroupName}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Unassigned (Individual)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400 text-xs">
                        R {adv.advancesOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-purple-400 text-xs">
                        R {adv.giftsOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-400 text-xs">
                        R {adv.otherOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-sm ${adv.totalOwed > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                        R {adv.totalOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {adv.totalOwed > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            <span>{adv.activeAdjustmentsCount} Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Cleared</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAdvisor(adv);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[11px] font-semibold transition-all border border-blue-500/30"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BY TEAM / GROUP */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          {paginatedTeams.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium text-sm">No teams found matching your filter criteria.</p>
            </div>
          ) : (
            paginatedTeams.map((team) => {
              const isExpanded = !!expandedTeams[team.groupId];

              return (
                <div 
                  key={team.groupId} 
                  className="bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-700/80"
                >
                  <div 
                    onClick={() => toggleTeamExpand(team.groupId)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-900/90 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">{team.groupName}</h3>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700">
                            {team.memberCount} Members
                          </span>
                        </div>
                        {team.description && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{team.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-wrap">
                      {(team.directGroupAdvancesOwed > 0 || team.directGroupGiftsOwed > 0) && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">Direct Team Debt</span>
                          <span className="text-xs font-medium text-slate-300">
                            R {(team.directGroupAdvancesOwed + team.directGroupGiftsOwed + team.directGroupOtherOwed).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-emerald-500/80 tracking-wider block">Members Advances</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          R {team.membersAdvancesOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-semibold text-purple-500/80 tracking-wider block">Members Gifts</span>
                        <span className="text-xs font-semibold text-purple-400">
                          R {team.membersGiftsOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-right min-w-[140px]">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Team Owed</span>
                        <span className={`text-base font-bold ${team.totalTeamOwed > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          R {team.totalTeamOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 md:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          <span>Team Member Owed Breakdown</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Click any advisor to view full statement
                        </span>
                      </div>

                      {team.members.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2">No advisors assigned to this team.</p>
                      ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                                <th className="py-2.5 px-3">Advisor Name</th>
                                <th className="py-2.5 px-3">Advisor Code</th>
                                <th className="py-2.5 px-3 text-right">Advances Owed</th>
                                <th className="py-2.5 px-3 text-right">Gifts Owed</th>
                                <th className="py-2.5 px-3 text-right">Other Owed</th>
                                <th className="py-2.5 px-3 text-right">Total Owed</th>
                                <th className="py-2.5 px-3 text-center">Status</th>
                                <th className="py-2.5 px-3 text-right">Report</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {team.members.map((member) => (
                                <tr 
                                  key={member.advisorId} 
                                  onClick={() => setSelectedAdvisor(member)}
                                  className={`hover:bg-slate-900/80 transition-colors cursor-pointer group ${
                                    searchTerm && member.advisorName.toLowerCase().includes(searchTerm.toLowerCase())
                                      ? 'bg-blue-500/10 font-bold'
                                      : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 font-semibold text-slate-200 group-hover:text-blue-400">
                                    {member.advisorName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                                    {member.advisorCode}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-emerald-400">
                                    R {member.advancesOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-purple-400">
                                    R {member.giftsOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-slate-400">
                                    R {member.otherOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className={`py-2.5 px-3 text-right font-bold ${member.totalOwed > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                                    R {member.totalOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {member.activeAdjustmentsCount > 0 ? (
                                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                                        {member.activeAdjustmentsCount} Pending
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-[10px] border border-emerald-500/20">
                                        Cleared
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedAdvisor(member);
                                      }}
                                      className="px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-semibold transition-all"
                                    >
                                      Report
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 3: DETAILED ITEM LEDGER */}
      {activeTab === 'ledger' && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Itemized Adjustments Ledger</h3>
              <p className="text-xs text-slate-400 mt-0.5">Every advance and gift record in the system</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Total Records: {filteredAdjustments.length}
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Date Incurred</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Original Total</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                      No adjustments found matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  paginatedAdjustments.map((adj) => {
                    const isAdvance = adj.type === AdjustmentType.Advance;
                    const isGift = adj.type === AdjustmentType.PromotionalItem;
                    const isCleared = adj.remainingBalance === 0;
                    const isPartial = !isCleared && adj.remainingBalance < adj.totalAmount;

                    return (
                      <tr 
                        key={adj.id} 
                        className={`hover:bg-slate-800/40 transition-colors ${
                          searchTerm && (adj.advisorName?.toLowerCase().includes(searchTerm.toLowerCase()) || adj.description?.toLowerCase().includes(searchTerm.toLowerCase()))
                            ? 'bg-blue-500/10 border-l-2 border-blue-500'
                            : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {new Date(adj.dateIncurred).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-4">
                          {isAdvance && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
                              <Wallet className="w-3 h-3" />
                              <span>Advance</span>
                            </span>
                          )}
                          {isGift && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-400 font-semibold text-[11px] border border-purple-500/20">
                              <Package className="w-3 h-3" />
                              <span>Gift Item</span>
                            </span>
                          )}
                          {!isAdvance && !isGift && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium text-[11px]">
                              <span>Other</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {adj.advisorName ? (
                            <div>
                              <span className="font-semibold text-slate-200">{adj.advisorName}</span>
                              <span className="text-[10px] text-slate-500 block">Individual Advisor</span>
                            </div>
                          ) : adj.advisorGroupName ? (
                            <div>
                              <span className="font-semibold text-blue-400">{adj.advisorGroupName}</span>
                              <span className="text-[10px] text-slate-500 block">Team Group Liability</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unspecified</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-xs font-medium">
                          {adj.description || adj.promotionalItemName || 'No description'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-400">
                          R {adj.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold text-sm ${isCleared ? 'text-slate-400' : 'text-amber-400'}`}>
                          R {adj.remainingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCleared && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                              Cleared
                            </span>
                          )}
                          {isPartial && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-[10px] border border-blue-500/20">
                              Partially Paid
                            </span>
                          )}
                          {!isCleared && !isPartial && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer Controls */}
      {pageSize > 0 && activeTotalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-400 print:hidden shadow-lg">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-200">{Math.min((currentPage - 1) * pageSize + 1, activeTotalItems)}</strong> to{' '}
              <strong className="text-slate-200">{Math.min(currentPage * pageSize, activeTotalItems)}</strong> of{' '}
              <strong className="text-slate-200">{activeTotalItems}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white font-semibold text-xs">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* DETAILED ADVISOR REPORT MODAL */}
      {selectedAdvisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                  {selectedAdvisor.advisorName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedAdvisor.advisorName}</h2>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono font-semibold border border-slate-700">
                      {selectedAdvisor.advisorCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                    {selectedAdvisor.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedAdvisor.email}</span>
                      </span>
                    )}
                    {selectedAdvisor.phoneNumber && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{selectedAdvisor.phoneNumber}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-blue-400 font-medium">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{selectedAdvisor.advisorGroupName || 'Individual Advisor (Unassigned)'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportAdvisorStatementCSV}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Export Advisor Statement CSV"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedAdvisor(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Advisor Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/20 relative overflow-hidden">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Total Outstanding Owed</div>
                  <div className="text-2xl font-bold text-amber-400">
                    R {selectedAdvisor.totalOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    {selectedAdvisor.activeAdjustmentsCount} pending item(s) awaiting deduction
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/20">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Cash Advances Owed</div>
                  <div className="text-2xl font-bold text-emerald-400">
                    R {selectedAdvisor.advancesOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Original Total: R {selectedAdvisor.totalInitialAdvances.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/20">
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">Promotional Gifts Owed</div>
                  <div className="text-2xl font-bold text-purple-400">
                    R {selectedAdvisor.giftsOwed.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Original Total: R {selectedAdvisor.totalInitialGifts.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Adjustments Filter & Table Header */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Itemized Adjustments & Gifts History</h3>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setAdvisorModalFilter('all')}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      advisorModalFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Items ({advisorAdjustments.length})
                  </button>
                  <button
                    onClick={() => setAdvisorModalFilter('pending')}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      advisorModalFilter === 'pending' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pending Only
                  </button>
                  <button
                    onClick={() => setAdvisorModalFilter('cleared')}
                    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      advisorModalFilter === 'cleared' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cleared
                  </button>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                        <th className="py-3 px-4">Date Incurred</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Description / Gift</th>
                        <th className="py-3 px-4 text-right">Original Total</th>
                        <th className="py-3 px-4 text-right">Paid / Deducted</th>
                        <th className="py-3 px-4 text-right">Remaining Balance</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {advisorAdjustments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                            No adjustments found for this advisor under "{advisorModalFilter}" filter.
                          </td>
                        </tr>
                      ) : (
                        advisorAdjustments.map((adj) => {
                          const isAdvance = adj.type === AdjustmentType.Advance;
                          const isGift = adj.type === AdjustmentType.PromotionalItem;
                          const paid = adj.totalAmount - adj.remainingBalance;
                          const isCleared = adj.remainingBalance === 0;

                          return (
                            <tr key={adj.id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                                {new Date(adj.dateIncurred).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td className="py-3 px-4">
                                {isAdvance && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                                    <Wallet className="w-3 h-3" />
                                    <span>Advance</span>
                                  </span>
                                )}
                                {isGift && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold text-[10px] border border-purple-500/20">
                                    <Package className="w-3 h-3" />
                                    <span>Gift</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-200 font-medium max-w-xs">
                                {adj.description || adj.promotionalItemName || 'No description'}
                                {adj.quantity > 1 && (
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                                    Qty: {adj.quantity}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-slate-400">
                                R {adj.totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-emerald-400">
                                R {paid.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </td>
                              <td className={`py-3 px-4 text-right font-bold text-sm ${isCleared ? 'text-slate-400' : 'text-amber-400'}`}>
                                R {adj.remainingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isCleared ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                                    Cleared
                                  </span>
                                ) : paid > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-[10px] border border-blue-500/20">
                                    Partially Paid
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-[10px] border border-amber-500/20">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span>Advisor Statement generated dynamically from active account adjustments.</span>
              </div>
              <button
                onClick={() => setSelectedAdvisor(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
