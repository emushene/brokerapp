import React, { useEffect, useState, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { DollarSign, TrendingUp, Calendar, Hash, Users, CheckCircle, X, Loader2, Upload, Activity, FileText, History, ChevronRight, FileSpreadsheet, AlertCircle, Filter, ExternalLink, Trash2, ShieldCheck, ShieldAlert, Search, Link, Wallet, Package, ArrowRight, UserPlus } from 'lucide-react';
import { financialsApi, submissionsApi, advisorsApi, advisorGroupsApi } from './lib/api';
import type { Commission, CommissionStatement, StatementItem, MovementItem, UnpayablePolicyItem, Submission, AccountAdjustment, Advisor, AdvisorGroup } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const getEmbedUrl = (url: string | null | undefined) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const match = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  return url;
};

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const cat = category?.toLowerCase() || 'unknown';
  if (cat.includes('lapse')) {
    return (
      <span className="text-[10px] font-medium bg-rose-950/30 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded uppercase tracking-wider">
        Lapse
      </span>
    );
  }
  if (cat.includes('1st') || cat.includes('first')) {
    return (
      <span className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded uppercase tracking-wider">
        1st Year
      </span>
    );
  }
  if (cat.includes('2nd') || cat.includes('second')) {
    return (
      <span className="text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/80 px-2 py-0.5 rounded uppercase tracking-wider">
        2nd Year
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700/80 px-2 py-0.5 rounded uppercase tracking-wider">
      {category}
    </span>
  );
};

const FinancialsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [groups, setGroups] = useState<AdvisorGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [globalAdjustments, setGlobalAdjustments] = useState<AccountAdjustment[]>([]);

  // View state
  const [importResult, setImportResult] = useState<CommissionStatement | null>(null);

  // Statement Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  // PDF Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  // Search Modal State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Submission[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [linkingItem, setLinkingItem] = useState<{ id: number, type: 'statement' | 'movement' } | null>(null);
  const [selectedSubmissionForLinking, setSelectedSubmissionForLinking] = useState<Submission | null>(null);
  const [presentAdvisorIds, setPresentAdvisorIds] = useState<number[]>([]);
  const [selectedAdvisorGroupId, setSelectedAdvisorGroupId] = useState<number | null>(null);
  const [ownerType, setOwnerType] = useState<'submission' | 'all' | 'group'>('submission');
  const [advisorSearchQuery, setAdvisorSearchQuery] = useState('');
  
  // Confirmation for pre-matched items
  const [confirmingItem, setConfirmingItem] = useState<{ id: number, submission: Submission, type: 'statement' | 'movement' } | null>(null);

  // Direct Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningItem, setAssigningItem] = useState<{ id: number, type: 'statement' | 'movement', policyNumber: string, amount: number, clientName: string } | null>(null);
  const [assignSelectedAdvisorIds, setAssignSelectedAdvisorIds] = useState<number[]>([]);
  const [assignSelectedGroupId, setAssignSelectedGroupId] = useState<number | null>(null);
  const [assignOwnerType, setAssignOwnerType] = useState<'all' | 'group'>('all');
  const [isAssigning, setIsAssigning] = useState(false);

  // Conclude Run / Deduction State
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [concludeData, setConcludeData] = useState<{ advisorId: number, name: string, commission: number, adjustments: AccountAdjustment[] }[]>([]);
  const [deductions, setDeductions] = useState<{ [advisorId: number]: { [adjId: number]: number } }>({});
  const [concluding, setConcluding] = useState(false);

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'policy' | 'advisor'>('policy');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [commData, stmtData, adjData, advData, groupData] = await Promise.all([
        financialsApi.getCommissions(),
        financialsApi.getStatements(),
        financialsApi.getOutstandingAdjustments({}), // Global fetch for stats
        advisorsApi.getAll(),
        advisorGroupsApi.getAll()
      ]);
      setCommissions(commData);
      setStatements(stmtData);
      setGlobalAdjustments(adjData);
      setAdvisors(advData);
      setGroups(groupData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImportStatement = async () => {
    if (!statementFile) return;
    try {
      setIsUploading(true);
      const result = await financialsApi.importStatement(statementFile, statementDate);
      
      // Fetch full details for the newly created statement to show in view
      const details = await financialsApi.getStatementDetails(result.id);
      setImportResult(details);
      
      setStatementFile(null);
      fetchData(); // Refresh history list in background
    } catch (error: any) {
      console.error('Error importing statement:', error);
      const message = error.response?.data || error.message || 'Failed to process statement.';
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  const loadStatementDetails = async (id: number) => {
    try {
      setLoading(true);
      const details = await financialsApi.getStatementDetails(id);
      setImportResult(details);
    } catch (error) {
      console.error('Error loading statement details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatement = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this report? This will also delete the associated Google Sheet and stored Excel file.')) return;
    try {
      setLoading(true);
      await financialsApi.deleteStatement(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting statement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, manualQuery?: string) => {
    if (e) e.preventDefault();
    const q = manualQuery || searchQuery;
    if (!q) return;

    try {
      setIsSearching(true);
      const results = await submissionsApi.search(q);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching submissions:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLinkSubmission = async (submissionId: number) => {
    if (!linkingItem) return;
    try {
      setLoading(true);
      const data = {
        submissionId,
        selectedAdvisorIds: ownerType === 'all' || ownerType === 'submission' ? presentAdvisorIds : [],
        advisorGroupId: ownerType === 'group' ? selectedAdvisorGroupId : undefined
      };

      if (linkingItem.type === 'statement') {
        await financialsApi.linkStatementItem(linkingItem.id, data.submissionId, data.selectedAdvisorIds, data.advisorGroupId || undefined);
      } else {
        await financialsApi.linkMovementItem(linkingItem.id, data.submissionId, data.selectedAdvisorIds, data.advisorGroupId || undefined);
      }
      setIsSearchModalOpen(false);
      setSelectedSubmissionForLinking(null);
      setPresentAdvisorIds([]);
      setSelectedAdvisorGroupId(null);
      setOwnerType('submission');
      if (importResult) loadStatementDetails(importResult.id);
    } catch (error) {
      console.error('Error linking submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStatementItem = async (item: StatementItem) => {
    if (item.matchedSubmission) {
      setConfirmingItem({ id: item.id, submission: item.matchedSubmission, type: 'statement' });
      setPresentAdvisorIds(item.matchedSubmission.advisors.map(a => a.id));
      setSelectedAdvisorGroupId(item.matchedSubmission.advisorGroupId || null);
      setOwnerType('submission');
    } else if (item.salesForceName) {
      const matchedAdv = advisors.find(a => 
        (a.salesforceName && a.salesforceName.toLowerCase() === item.salesForceName?.toLowerCase()) ||
        (a.name && a.name.toLowerCase() === item.salesForceName?.toLowerCase())
      );
      if (matchedAdv) {
        if (window.confirm(`No submission form matched, but Salesforce Name matches Advisor: "${matchedAdv.name}". Would you like to confirm and assign this policy directly to them?`)) {
          try {
            setLoading(true);
            await financialsApi.directAssignStatementItem(item.id, [matchedAdv.id], undefined);
            if (importResult) loadStatementDetails(importResult.id);
            await fetchData();
          } catch (error) {
            console.error('Error confirming direct Salesforce match:', error);
          } finally {
            setLoading(false);
          }
        }
      }
    }
  };

  const handleConfirmMovementItem = async (item: MovementItem) => {
    if (!item.matchedSubmission) return;
    setConfirmingItem({ id: item.id, submission: item.matchedSubmission, type: 'movement' });
    setPresentAdvisorIds(item.matchedSubmission.advisors.map(a => a.id));
    setSelectedAdvisorGroupId(item.matchedSubmission.advisorGroupId || null);
    setOwnerType('submission');
  };

  const executeConfirmation = async () => {
    if (!confirmingItem) return;
    try {
      setLoading(true);
      const data = {
        selectedAdvisorIds: ownerType === 'all' || ownerType === 'submission' ? presentAdvisorIds : [],
        advisorGroupId: ownerType === 'group' ? selectedAdvisorGroupId || undefined : undefined
      };

      if (confirmingItem.type === 'statement') {
        await financialsApi.confirmStatementItem(confirmingItem.id, data);
      } else {
        await financialsApi.confirmMovementItem(confirmingItem.id, data);
      }
      setConfirmingItem(null);
      setPresentAdvisorIds([]);
      setSelectedAdvisorGroupId(null);
      setOwnerType('submission');
      if (importResult) loadStatementDetails(importResult.id);
    } catch (error) {
      console.error('Error confirming item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDirectAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningItem) return;
    try {
      setLoading(true);
      const selectedIds = assignOwnerType === 'all' ? assignSelectedAdvisorIds : [];
      const groupId = assignOwnerType === 'group' ? assignSelectedGroupId || undefined : undefined;

      if (assigningItem.type === 'statement') {
        await financialsApi.directAssignStatementItem(assigningItem.id, selectedIds, groupId);
      } else {
        await financialsApi.directAssignMovementItem(assigningItem.id, selectedIds, groupId);
      }
      
      setIsAssignModalOpen(false);
      setAssigningItem(null);
      setAssignSelectedAdvisorIds([]);
      setAssignSelectedGroupId(null);
      setAssignOwnerType('all');
      
      if (importResult) loadStatementDetails(importResult.id);
      await fetchData();
    } catch (error) {
      console.error('Error assigning advisor directly:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConcludeRun = async () => {
    if (!importResult) return;
    console.log('Starting conclude run check for statement:', importResult.id);
    try {
      setLoading(true);
      // 1. Identify all advisors with earnings in this statement
      const earners = new Set<number>();
      
      if (importResult.items) {
        importResult.items.forEach(i => {
          if (i.isConfirmed && i.matchedSubmission?.advisors) {
             i.matchedSubmission.advisors.forEach(a => earners.add(a.id));
          }
        });
      }
      
      if (importResult.movementItems) {
        importResult.movementItems.forEach(i => {
          if (i.isConfirmed && i.matchedSubmission?.advisors) {
             i.matchedSubmission.advisors.forEach(a => earners.add(a.id));
          }
        });
      }

      console.log(`Identified ${earners.size} unique earners.`);

      // 2. Fetch their data & outstanding adjustments
      const concludeList = [];
      const initialDeductions: { [advisorId: number]: { [adjId: number]: number } } = {};

      for (const id of Array.from(earners)) {
        try {
          const ad = await financialsApi.getPayslipDetails(id, importResult.id);
          const outstanding = await financialsApi.getOutstandingAdjustments({ advisorId: id });
          
          const totalComm = ad.commissions.reduce((sum: number, c: any) => sum + c.commissionAmount, 0);

          if (totalComm > 0 || outstanding.length > 0) {
            concludeList.push({
              advisorId: id,
              name: ad.commissions[0]?.advisorName || 'Advisor ' + id,
              commission: totalComm,
              adjustments: outstanding
            });
            
            initialDeductions[id] = {};
            let remainingCommission = totalComm;
            
            // Group adjustments by type for the conclude run modal
            const grouped = outstanding.reduce((acc, adj) => {
              if (!acc[adj.type]) acc[adj.type] = 0;
              acc[adj.type] += adj.remainingBalance;
              return acc;
            }, {} as { [key: number]: number });

            Object.entries(grouped).forEach(([typeStr, totalBalance]) => {
              const type = parseInt(typeStr);
              // Auto-suggest deduction for advances (AdjustmentType.Advance is 0)
              if (type === 0 && remainingCommission > 0) {
                const suggestedDeduction = Math.min(remainingCommission, totalBalance);
                initialDeductions[id][type] = suggestedDeduction;
                remainingCommission -= suggestedDeduction;
              } else {
                initialDeductions[id][type] = 0; 
              }
            });
          }
        } catch (err) {
          console.error(`Error fetching data for advisor ${id}:`, err);
        }
      }

      console.log('Conclude list prepared:', concludeList.length, 'entries.');
      setConcludeData(concludeList);
      setDeductions(initialDeductions);
      setShowConcludeModal(true);
    } catch (error) {
      console.error('Error identifying earners', error);
      alert('Failed to prepare commission run. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const executeConcludeRun = async () => {
    if (!importResult) return;
    try {
      setConcluding(true);
      // 1. Apply all deductions first (grouped by type)
      for (const advisorIdStr in deductions) {
        const advisorId = parseInt(advisorIdStr);
        for (const typeStr in deductions[advisorId]) {
          const type = parseInt(typeStr);
          const amount = deductions[advisorId][type];
          if (amount > 0) {
            await financialsApi.applyDeductionToType(advisorId, type, amount, importResult.id);
          }
        }
      }

      // 2. Conclude the statement (generates payslips and sends emails)
      await financialsApi.concludeStatement(importResult.id);
      
      setShowConcludeModal(false);
      setImportResult(null);
      fetchData();
    } catch (error) {
      console.error('Error concluding run:', error);
    } finally {
      setConcluding(false);
    }
  };

  const openPdfViewer = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setSelectedPdfUrl(url);
    setShowPdfModal(true);
  };

  const filteredMovementItems = useMemo(() => {
    if (!importResult) return [];
    if (categoryFilter === 'All') return importResult.movementItems;
    
    return importResult.movementItems.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (categoryFilter === '1st Year') return cat.includes('1st') || cat.includes('first');
      if (categoryFilter === '2nd Year') return cat.includes('2nd') || cat.includes('second');
      if (categoryFilter === 'Lapse') return cat.includes('lapse');
      if (categoryFilter === 'Other') return !cat.includes('1st') && !cat.includes('first') && !cat.includes('2nd') && !cat.includes('second') && !cat.includes('lapse');
      return true;
    });
  }, [importResult, categoryFilter]);

  const filteredStatementItems = useMemo(() => {
    if (!importResult) return [];
    if (categoryFilter === 'All') return importResult.items;
    
    return importResult.items.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (categoryFilter === '1st Year') return cat.includes('1st') || cat.includes('first');
      if (categoryFilter === '2nd Year') return cat.includes('2nd') || cat.includes('second');
      if (categoryFilter === 'Lapse') return cat.includes('lapse');
      if (categoryFilter === 'Other') return !cat.includes('1st') && !cat.includes('first') && !cat.includes('2nd') && !cat.includes('second') && !cat.includes('lapse');
      return true;
    });
  }, [importResult, categoryFilter]);

  const filteredUnpayableItems = useMemo(() => {
    if (!importResult || !importResult.unpayableItems) return [];
    if (categoryFilter === 'All') return importResult.unpayableItems;
    return importResult.unpayableItems.filter(item => {
      const reasonLower = (item.reason || '').toLowerCase();
      if (categoryFilter === 'Lapse') return reasonLower.includes('cancellation') || reasonLower.includes('surrender');
      return true;
    });
  }, [importResult, categoryFilter]);

  const groupedByAdvisor = useMemo(() => {
    if (!importResult) return [];
    
    const groups: { [advisorId: number]: { 
      advisorId: number, 
      name: string, 
      items: StatementItem[], 
      movements: MovementItem[],
      totalCommission: number,
      totalMovements: number
    } } = {};

    // Helper to add to group
    const addToGroup = (advisor: Advisor, item: any, isMovement: boolean) => {
      if (!groups[advisor.id]) {
        groups[advisor.id] = {
          advisorId: advisor.id,
          name: advisor.name,
          items: [],
          movements: [],
          totalCommission: 0,
          totalMovements: 0
        };
      }
      
      if (isMovement) {
        groups[advisor.id].movements.push(item);
        groups[advisor.id].totalMovements += item.premium;
      } else {
        groups[advisor.id].items.push(item);
        // We calculate projected commission here based on advisor rates if we wanted to,
        // but for now let's just show the item amount.
        groups[advisor.id].totalCommission += item.amount / (item.matchedSubmission?.advisors?.length || 1);
      }
    };

    // Process Statement Items
    importResult.items.forEach(item => {
      if (item.isMatched && item.matchedSubmission?.advisors) {
        item.matchedSubmission.advisors.forEach(a => addToGroup(a, item, false));
      } else {
        // Unmatched or no advisor info - group under "Unassigned"
        const unassignedId = -1;
        if (!groups[unassignedId]) {
          groups[unassignedId] = { advisorId: unassignedId, name: 'Unassigned / Pending Match', items: [], movements: [], totalCommission: 0, totalMovements: 0 };
        }
        groups[unassignedId].items.push(item);
        groups[unassignedId].totalCommission += item.amount;
      }
    });

    // Process Movement Items
    importResult.movementItems.forEach(item => {
      if (item.isMatched && item.matchedSubmission?.advisors) {
        item.matchedSubmission.advisors.forEach(a => addToGroup(a, item, true));
      } else {
        const unassignedId = -1;
        if (!groups[unassignedId]) {
          groups[unassignedId] = { advisorId: unassignedId, name: 'Unassigned / Pending Match', items: [], movements: [], totalCommission: 0, totalMovements: 0 };
        }
        groups[unassignedId].movements.push(item);
      }
    });

    return Object.values(groups).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [importResult]);

  const filterElement = (
    <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-1">
      <Filter className="w-3.5 h-3.5 text-slate-500" />
      <select 
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="bg-transparent text-xs text-white outline-none cursor-pointer py-1 min-w-[100px]"
      >
        <option value="All" className="bg-slate-900">All Categories</option>
        <option value="1st Year" className="bg-slate-900">1st Year</option>
        <option value="2nd Year" className="bg-slate-900">2nd Year</option>
        <option value="Lapse" className="bg-slate-900">Lapse</option>
        <option value="Other" className="bg-slate-900">Other</option>
      </select>
    </div>
  );

  const historyColumns: Column<CommissionStatement>[] = [
    {
      header: 'Statement File',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <div className="bg-green-600/10 p-2 rounded-lg">
            <FileSpreadsheet className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className="font-bold text-white">{s.fileName}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{new Date(s.statementDate).toLocaleDateString()}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Earnings',
      accessor: (s) => (
        <p className="font-black text-white">R {s.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      )
    },
    {
      header: 'Status',
      accessor: (s) => (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-tighter ${
          s.status === 'Emailed' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
          s.status === 'Concluded' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
          'bg-amber-500/10 text-amber-500 border-amber-500/20'
        }`}>
          {s.status}
        </span>
      )
    }
  ];

  const movementItemColumns: Column<MovementItem>[] = [
    {
      header: 'Policy Number',
      accessor: (i) => (
        <div className="flex items-center gap-2">
           <Hash className="w-3 h-3 text-slate-500" />
           <span className="font-mono text-xs font-bold text-white">{i.policyNumber || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Client Name',
      accessor: (i) => <p className="text-xs font-bold text-slate-300">{i.clientName}</p>
    },
    {
      header: 'Matched Advisor',
      accessor: (i) => (
        <div className="flex items-center gap-2">
          {i.advisorName ? (
            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-tight">{i.advisorName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-500/10 px-2.5 py-1 rounded-full border border-slate-500/20">
              <ShieldAlert className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-tight">No Match Found</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Scan',
      accessor: (i) => {
        const url = i.fileUrl || i.googleDriveLink || (i.matchedSubmission?.documents && i.matchedSubmission.documents.length > 0 ? i.matchedSubmission.documents[0].fileUrl : null);
        return url ? (
          <button
            onClick={(e) => openPdfViewer(e, url)}
            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-all"
            title="View Matched Document"
          >
            <FileText className="w-4 h-4 text-blue-400" />
          </button>
        ) : (
          <span className="text-[10px] text-slate-600 font-medium italic">—</span>
        );
      }
    },
    {
      header: 'Premium',
      accessor: (i) => <p className="text-xs font-black text-white">R {i.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    },
    {
      header: 'Movement Type',
      accessor: (i) => <p className="text-xs font-semibold text-slate-400">{i.movementType}</p>
    },
    {
      header: 'Status',
      accessor: (i) => (
        <div className="flex items-center gap-1.5">
           {i.isConfirmed ? (
             <span className="text-[9px] font-black text-green-500 uppercase bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">Confirmed</span>
           ) : (
             <span className="text-[9px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">Draft</span>
           )}
        </div>
      )
    }
  ];

  const statementItemColumns: Column<StatementItem>[] = [
    {
      header: 'Policy Number',
      accessor: (i) => <span className="font-mono text-xs font-bold text-white">{i.policyNumber}</span>
    },
    {
      header: 'Client Name',
      accessor: (i) => <p className="text-xs font-bold text-slate-300">{i.clientName}</p>
    },
    {
      header: 'Category',
      accessor: (i) => <CategoryBadge category={i.category || 'Unknown'} />
    },
    {
      header: 'Sales Force Name',
      accessor: (i) => <p className="text-xs font-semibold text-slate-400">{i.salesForceName || 'N/A'}</p>
    },
    {
      header: 'Matched Advisor',
      accessor: (i) => (
        <div className="flex items-center gap-2">
          {i.advisorName ? (
            <div className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
              <ShieldCheck className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-tight">{i.advisorName}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-500/10 px-2.5 py-1 rounded-full border border-slate-500/20">
              <ShieldAlert className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-black uppercase tracking-tight">No Match Found</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Scan',
      accessor: (i) => {
        const url = i.fileUrl || i.googleDriveLink || (i.matchedSubmission?.documents && i.matchedSubmission.documents.length > 0 ? i.matchedSubmission.documents[0].fileUrl : null);
        return url ? (
          <button
            onClick={(e) => openPdfViewer(e, url)}
            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-all"
            title="View Matched Document"
          >
            <FileText className="w-4 h-4 text-blue-400" />
          </button>
        ) : (
          <span className="text-[10px] text-slate-600 font-medium italic">—</span>
        );
      }
    },
    {
      header: 'Premium',
      accessor: (i) => <p className="text-xs font-black text-white">R {i.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    },
    {
      header: 'Net Comm.',
      accessor: (i) => <p className={`text-xs font-black ${i.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>R {i.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    }
  ];

  const unpayableItemColumns: Column<UnpayablePolicyItem>[] = [
    {
      header: 'Policy Number',
      accessor: (i) => (
        <div className="flex items-center gap-2">
           <Hash className="w-3 h-3 text-slate-500" />
           <span className="font-mono text-xs font-bold text-white">{i.policyNumber || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Client Name',
      accessor: (i) => (
        <div>
          <p className="text-xs font-bold text-slate-300">{i.clientName}</p>
          {i.clientMobile && <p className="text-[10px] text-slate-500">{i.clientMobile}</p>}
        </div>
      )
    },
    {
      header: 'Premium',
      accessor: (i) => <p className="text-xs font-black text-white">R {i.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    },
    {
      header: 'Unpayable Reason',
      accessor: (i) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${
          i.reason.toLowerCase().includes('premium not received') 
            ? 'bg-amber-950/30 text-amber-300 border-amber-800/40' 
            : i.reason.toLowerCase().includes('replacement') 
            ? 'bg-slate-800 text-slate-300 border-slate-700/80'
            : i.reason.toLowerCase().includes('fraud') 
            ? 'bg-rose-950/30 text-rose-300 border-rose-800/40'
            : 'bg-slate-800 text-slate-300 border-slate-700/80'
        }`}>
          {i.reason}
        </span>
      )
    },
    {
      header: 'Matched Advisor',
      accessor: (i) => (
        <div className="flex items-center gap-2">
           <Users className="w-3.5 h-3.5 text-blue-400" />
           <span className="text-xs font-semibold text-slate-300">{i.advisorName || 'Not Assigned'}</span>
        </div>
      )
    },
    {
      header: 'Scan',
      accessor: (i) => {
        const url = (i.matchedSubmission?.documents && i.matchedSubmission.documents.length > 0 ? i.matchedSubmission.documents[0].fileUrl : null);
        return url ? (
          <button
            onClick={(e) => openPdfViewer(e, url)}
            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg transition-all"
            title="View Matched Document"
          >
            <FileText className="w-4 h-4 text-blue-400" />
          </button>
        ) : (
          <span className="text-[10px] text-slate-600 font-medium italic">—</span>
        );
      }
    }
  ];

  const totalNet = commissions.filter(c => c.isPaid).reduce((sum, c) => sum + c.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Commission Statements</h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm">Reconcile insurance statements and manage payouts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 w-full sm:w-auto">
            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <input 
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold outline-none border-none focus:ring-0 w-full"
            />
          </div>
          <div className="relative group w-full sm:w-auto">
            <input 
              type="file" 
              accept=".xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && !file.name.endsWith('.xlsx')) {
                  alert('Please upload an .xlsx file. Legacy .xls files are not supported.');
                  e.target.value = '';
                  return;
                }
                setStatementFile(file);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors border border-slate-700 w-full">
              <Upload className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate max-w-[180px]">{statementFile ? statementFile.name : 'Choose File'}</span>
            </div>
          </div>
          {statementFile && (
            <button 
              onClick={handleImportStatement}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Process'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Revenue</span>
           <span className="text-base sm:text-lg font-black text-white">R {totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Internal Debt</span>
           <span className="text-base sm:text-lg font-black text-amber-500">R {globalAdjustments.reduce((s, a) => s + a.remainingBalance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History</span>
           <span className="text-base sm:text-lg font-black text-blue-500">{statements.length}</span>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matched Items</span>
           <span className="text-base sm:text-lg font-black text-green-500">{importResult?.matchedRows || 0}</span>
        </div>
      </div>

      {importResult ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
             <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-500 w-5 h-5" />
                <div>
                   <h2 className="text-sm font-black text-white leading-none">{importResult.fileName}</h2>
                   <div className="flex items-center gap-2 mt-1">
                     <p className="text-[10px] text-slate-500 uppercase">Statement Date: {new Date(importResult.statementDate).toLocaleDateString()}</p>
                     <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${
                       importResult.status === 'Concluded' 
                         ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                         : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                     }`}>
                       {importResult.status}
                     </span>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
               {importResult.status === 'Draft' && (
                 <button 
                   onClick={handleConcludeRun}
                   className="text-xs font-bold text-white bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg border border-green-500/20 flex items-center gap-1.5 transition-all shadow-lg shadow-green-600/20"
                 >
                   <ShieldCheck className="w-3.5 h-3.5" />
                   Conclude Run
                 </button>
               )}
               {importResult.googleSheetUrl && (
                 <a 
                   href={importResult.googleSheetUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-xs font-bold text-green-500 hover:text-green-400 flex items-center gap-1 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20"
                 >
                   <FileSpreadsheet className="w-3.5 h-3.5" />
                   View Enhanced Sheet
                 </a>
               )}
               <button 
                 onClick={() => setImportResult(null)}
                 className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-green-500/20"
               >
                 <History className="w-3.5 h-3.5" />
                 Back to History
               </button>
             </div>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-2xl w-fit border border-slate-800">
            <button 
              onClick={() => setViewMode('policy')}
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${viewMode === 'policy' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Policy View
            </button>
            <button 
              onClick={() => setViewMode('advisor')}
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${viewMode === 'advisor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Advisor View
            </button>
          </div>

          {viewMode === 'policy' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5 px-1">
                <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                Movements
              </h3>
              <DataTable 
                data={filteredMovementItems} 
                columns={movementItemColumns} 
                pageSize={8} 
                filterElement={filterElement}
                actions={[
                  {
                    icon: <Search className="w-4 h-4" />,
                    label: (i) => i.isMatched ? 'Relink' : 'Search & Link',
                    onClick: (i) => {
                      const q = i.clientName || i.policyNumber || '';
                      setLinkingItem({ id: i.id, type: 'movement' });
                      setSearchQuery(q);
                      setIsSearchModalOpen(true);
                      handleSearch(undefined, q);
                    },
                    className: 'text-blue-500'
                  },
                  {
                    icon: <UserPlus className="w-4 h-4" />,
                    label: 'Assign Advisor',
                    onClick: (i) => {
                      setAssigningItem({ id: i.id, type: 'movement', policyNumber: i.policyNumber || '', amount: i.premium || 0, clientName: i.clientName || 'N/A' });
                      setAssignSelectedAdvisorIds([]);
                      setAssignSelectedGroupId(null);
                      setAssignOwnerType('all');
                      setIsAssignModalOpen(true);
                    },
                    className: (i) => i.isConfirmed ? 'hidden' : 'text-purple-400 hover:text-purple-300'
                  },
                  {
                    icon: <CheckCircle className="w-4 h-4" />,
                    label: 'Confirm',
                    onClick: (i) => handleConfirmMovementItem(i),
                    className: (i) => i.isConfirmed ? 'hidden' : 'text-green-500'
                  }
                ]}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5 px-1">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                Commissions Details
              </h3>
              <DataTable 
                data={filteredStatementItems} 
                columns={statementItemColumns} 
                pageSize={8} 
                filterElement={filterElement}
                actions={[
                  {
                    icon: <Search className="w-4 h-4" />,
                    label: (i) => i.isMatched ? 'Relink' : 'Search & Link',
                    onClick: (i) => {
                      const q = i.clientName || i.policyNumber || '';
                      setLinkingItem({ id: i.id, type: 'statement' });
                      setSearchQuery(q);
                      setIsSearchModalOpen(true);
                      handleSearch(undefined, q);
                    },
                    className: 'text-blue-500'
                  },
                   {
                    icon: <UserPlus className="w-4 h-4" />,
                    label: 'Assign Advisor',
                    onClick: (i) => {
                      setAssigningItem({ id: i.id, type: 'statement', policyNumber: i.policyNumber || '', amount: i.amount || 0, clientName: i.clientName || 'N/A' });
                      
                      let preselectedIds: number[] = [];
                      if (i.salesForceName) {
                        const sfName = i.salesForceName.toLowerCase();
                        const matchedAdv = advisors.find(a => 
                          (a.salesforceName && a.salesforceName.toLowerCase() === sfName) ||
                          (a.name && a.name.toLowerCase() === sfName)
                        );
                        if (matchedAdv) {
                          preselectedIds = [matchedAdv.id];
                        }
                      }
                      
                      setAssignSelectedAdvisorIds(preselectedIds);
                      setAssignSelectedGroupId(null);
                      setAssignOwnerType('all');
                      setIsAssignModalOpen(true);
                      },
                      className: (i) => i.isConfirmed ? 'hidden' : 'text-purple-400 hover:text-purple-300'
                    },
                    {
                      icon: <CheckCircle className="w-4 h-4" />,
                      label: 'Confirm',
                      onClick: (i) => handleConfirmStatementItem(i),
                      className: (i) => {
                        if (i.isConfirmed) return 'hidden';
                        const hasSubMatch = !!i.matchedSubmission;
                        const sfName = i.salesForceName ? i.salesForceName.toLowerCase() : null;
                        const hasSfMatch = sfName ? advisors.some(a => 
                          (a.salesforceName && a.salesforceName.toLowerCase() === sfName) ||
                          (a.name && a.name.toLowerCase() === sfName)
                        ) : false;
                        return (hasSubMatch || hasSfMatch) ? 'text-green-500' : 'hidden';
                      }
                    }
                ]}
              />
            </div>

            {importResult.unpayableItems && importResult.unpayableItems.length > 0 && (
              <div className="space-y-2 pt-4">
                <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5 px-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Unpayable / Unpaid Policies ({importResult.unpayableItems.length})
                </h3>
                <DataTable 
                  data={filteredUnpayableItems} 
                  columns={unpayableItemColumns} 
                  pageSize={8} 
                  filterElement={filterElement}
                />
              </div>
            )}
          </div>
        ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {groupedByAdvisor.map(group => (
                <div key={group.advisorId} className="bg-slate-800/20 border border-slate-700/50 rounded-[2.5rem] overflow-hidden">
                  <div className="p-6 bg-slate-800/40 flex items-center justify-between border-b border-slate-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl font-black text-white">
                        {group.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">{group.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {group.items.length + group.movements.length} Total Policies
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Projected Settlement</p>
                       <p className="text-2xl font-black text-emerald-500">
                         R {group.totalCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </p>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Commissions Detail</h5>
                       <div className="space-y-2">
                         {group.items.length > 0 ? group.items.map(item => (
                           <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                              <div>
                                <p className="text-xs font-bold text-white">{item.clientName}</p>
                                <p className="text-[9px] text-slate-500 font-mono">{item.policyNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-xs font-black ${item.amount < 0 ? 'text-red-500' : 'text-blue-400'}`}>R {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <CategoryBadge category={item.category || ''} />
                              </div>
                           </div>
                         )) : (
                           <p className="text-[10px] text-slate-600 italic px-4 py-2">No commissions in this run</p>
                         )}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Movements Detail</h5>
                       <div className="space-y-2">
                         {group.movements.length > 0 ? group.movements.map(item => (
                           <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                              <div>
                                <p className="text-xs font-bold text-white">{item.clientName}</p>
                                <p className="text-[9px] text-slate-500 font-mono">{item.policyNumber}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-white">R {item.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <CategoryBadge category={item.category || ''} />
                              </div>
                           </div>
                         )) : (
                           <p className="text-[10px] text-slate-600 italic px-4 py-2">No movements in this run</p>
                         )}
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <RouterLink 
                to="/advances"
                className="group bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 p-6 rounded-3xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-500/30 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-black text-white">Advances Ledger</h3>
                <p className="text-xs text-slate-500 mt-1">Manage upfront advisor payments and track debt recovery.</p>
              </RouterLink>

              <RouterLink 
                to="/promotional-gifts"
                className="group bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 p-6 rounded-3xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                    <Package className="w-6 h-6" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-500/30 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-black text-white">Promotional Catalog</h3>
                <p className="text-xs text-slate-500 mt-1">Track rewards, gifts, and equipment issued to teams.</p>
              </RouterLink>
            </div>

          <div className="space-y-2">
            <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5 px-1">
               <History className="w-3.5 h-3.5 text-blue-500" />
               Statement History
            </h3>
            <DataTable
              data={statements}
              columns={historyColumns}
              loading={loading}
              pageSize={10}
              actions={[
                {
                  icon: <ChevronRight className="w-4 h-4" />,
                  label: 'View Details',
                  onClick: (s) => loadStatementDetails(s.id),
                  className: 'text-blue-500'
                },
                {
                  icon: <Trash2 className="w-4 h-4" />,
                  label: 'Delete',
                  onClick: (s) => handleDeleteStatement(s.id),
                  className: 'text-red-500'
                  }
                  ]}
                  />
                  </div>
                  </div>
                  </div>
                  )}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Search className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Link Submission</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Manual Reconciliation Search</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSearchModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by client name, ID number, or policy number..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              </form>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Searching Records...</p>
                  </div>
                ) : selectedSubmissionForLinking ? (
                  <div className="space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-800/50 border border-blue-500/30 p-6 rounded-[2rem] flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-blue-600/20">
                            {selectedSubmissionForLinking.applicantSurname[0]}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-white">{selectedSubmissionForLinking.applicantSurname}, {selectedSubmissionForLinking.initials}</h4>
                            <p className="text-xs text-slate-500 font-mono tracking-wider">{selectedSubmissionForLinking.idNumber}</p>
                          </div>
                       </div>
                       <button 
                         onClick={() => {
                           setSelectedSubmissionForLinking(null);
                           setPresentAdvisorIds([]);
                         }}
                         className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                       >
                         Change Selection
                       </button>
                    </div>

                    <div className="space-y-4">
                       <div className="flex items-center gap-2 px-2">
                          <Users className="w-4 h-4 text-purple-500" />
                          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Commission Distribution</h4>
                       </div>

                       <div className="flex bg-slate-900/50 p-1 rounded-2xl">
                          <button 
                            onClick={() => {
                              setOwnerType('submission');
                              setPresentAdvisorIds(selectedSubmissionForLinking.advisors.map(a => a.id));
                              setSelectedAdvisorGroupId(selectedSubmissionForLinking.advisorGroupId || null);
                            }}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'submission' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            Current
                          </button>
                          <button 
                            onClick={() => {
                              setOwnerType('all');
                              setPresentAdvisorIds([]);
                              setSelectedAdvisorGroupId(null);
                              setAdvisorSearchQuery('');
                            }}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            Change Agent
                          </button>
                          <button 
                            onClick={() => {
                              setOwnerType('group');
                              setPresentAdvisorIds([]);
                              setSelectedAdvisorGroupId(null);
                              setAdvisorSearchQuery('');
                            }}
                            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'group' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                          >
                            Group
                          </button>
                        </div>
                       
                       {ownerType === 'all' && (
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="Search advisor by name or code..."
                              value={advisorSearchQuery}
                              onChange={(e) => setAdvisorSearchQuery(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                          </div>
                        )}

                       <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 gap-2 pr-2 custom-scrollbar">
                          {ownerType === 'submission' && selectedSubmissionForLinking.advisors.map(advisor => {
                            const isPresent = presentAdvisorIds.includes(advisor.id);
                            return (
                              <div 
                                key={advisor.id}
                                onClick={() => {
                                  if (isPresent) {
                                    setPresentAdvisorIds(prev => prev.filter(id => id !== advisor.id));
                                  } else {
                                    setPresentAdvisorIds(prev => [...prev, advisor.id]);
                                  }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                                  isPresent ? 'bg-purple-600/10 border-purple-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 opacity-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isPresent ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                     {advisor.name.charAt(0)}
                                   </div>
                                   <div>
                                     <p className="text-sm font-bold">{advisor.name}</p>
                                     <p className="text-[10px] font-mono uppercase opacity-50">{advisor.code}</p>
                                   </div>
                                </div>
                                {isPresent && <ShieldCheck className="w-5 h-5 text-purple-500" />}
                              </div>
                            );
                          })}

                          {ownerType === 'all' && advisors
                            .filter(a => 
                              a.name.toLowerCase().includes(advisorSearchQuery.toLowerCase()) || 
                              a.code.toLowerCase().includes(advisorSearchQuery.toLowerCase())
                            )
                            .map(advisor => {
                            const isPresent = presentAdvisorIds.includes(advisor.id);
                            return (
                              <div 
                                key={advisor.id}
                                onClick={() => {
                                  if (isPresent) {
                                    setPresentAdvisorIds(prev => prev.filter(id => id !== advisor.id));
                                  } else {
                                    setPresentAdvisorIds(prev => [...prev, advisor.id]);
                                  }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                                  isPresent ? 'bg-blue-600/10 border-blue-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 opacity-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isPresent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                     {advisor.name.charAt(0)}
                                   </div>
                                   <div>
                                     <p className="text-sm font-bold">{advisor.name}</p>
                                     <p className="text-[10px] font-mono uppercase opacity-50">{advisor.code}</p>
                                   </div>
                                </div>
                                {isPresent && <ShieldCheck className="w-5 h-5 text-blue-500" />}
                              </div>
                            );
                          })}

                          {ownerType === 'group' && groups.map(group => {
                            const isSelected = selectedAdvisorGroupId === group.id;
                            return (
                              <div 
                                key={group.id}
                                onClick={() => setSelectedAdvisorGroupId(group.id)}
                                className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                                  isSelected ? 'bg-orange-600/10 border-orange-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 opacity-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                     G
                                   </div>
                                   <div>
                                     <p className="text-sm font-bold">{group.name}</p>
                                     <p className="text-[10px] font-mono uppercase opacity-50">{group.members?.length || 0} Members</p>
                                   </div>
                                </div>
                                {isSelected && <ShieldCheck className="w-5 h-5 text-orange-500" />}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((sub) => (
                    <div 
                      key={sub.id}
                      className="group flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-2xl transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedSubmissionForLinking(sub);
                        setPresentAdvisorIds(sub.advisors.map(a => a.id));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-blue-500 transition-colors">
                          {sub.applicantSurname[0]}{sub.initials[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white">{sub.applicantSurname}, {sub.initials}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{sub.idNumber}</span>
                            <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 uppercase tracking-tighter">{sub.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 mr-2">
                          {sub.documents?.map((doc) => (
                            <button 
                              key={doc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openPdfViewer(e, doc.fileUrl);
                              }}
                              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-blue-500"
                              title={`Preview ${doc.fileName}`}
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-white">R {sub.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">{new Date(sub.date).toLocaleDateString()}</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-all">
                          <Link className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : searchQuery && (
                  <div className="text-center py-12">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No matching submissions found</p>
                  </div>
                )}
              </div>
            </div>
            {selectedSubmissionForLinking && (
              <div className="p-4 border-t border-slate-800 shrink-0">
                <button 
                  onClick={() => handleLinkSubmission(selectedSubmissionForLinking.id)}
                  disabled={loading || (ownerType !== 'group' && presentAdvisorIds.length === 0) || (ownerType === 'group' && !selectedAdvisorGroupId)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Link className="w-5 h-5" />}
                  Confirm Link & Process Commission
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isAssignModalOpen && assigningItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <UserPlus className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Direct Advisor Assignment</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Skip matching & route directly</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setAssigningItem(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleDirectAssignSubmit} className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Statement Row Context Card */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Policy Ref / Client</span>
                      <p className="text-sm font-black text-white">{assigningItem.policyNumber || 'No Policy Number'}</p>
                      <p className="text-xs text-slate-400">{assigningItem.clientName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Amount / Comm</span>
                      <p className="text-sm font-black text-emerald-400">R {assigningItem.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <span className="text-[9px] font-bold text-purple-400 uppercase bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full mt-1 inline-block tracking-widest">{assigningItem.type}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="w-4 h-4 text-purple-500" />
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Routing Owner Type</h4>
                  </div>

                  <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button 
                      type="button"
                      onClick={() => setAssignOwnerType('all')}
                      className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${assignOwnerType === 'all' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Individual Advisor(s)
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAssignOwnerType('group')}
                      className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold transition-all ${assignOwnerType === 'group' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Advisor Group / Team
                    </button>
                  </div>

                  {assignOwnerType === 'all' && (
                    <div className="relative">
                      <input 
                        type="text" 
                        value={advisorSearchQuery}
                        onChange={(e) => setAdvisorSearchQuery(e.target.value)}
                        placeholder="Filter advisors by name or code..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-purple-500/50"
                      />
                      <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}

                  <div className="max-h-[250px] overflow-y-auto grid grid-cols-1 gap-2 pr-2 custom-scrollbar">
                    {assignOwnerType === 'all' && advisors
                      .filter(a => 
                        a.name.toLowerCase().includes(advisorSearchQuery.toLowerCase()) || 
                        a.code.toLowerCase().includes(advisorSearchQuery.toLowerCase())
                      )
                      .map(advisor => {
                        const isPresent = assignSelectedAdvisorIds.includes(advisor.id);
                        return (
                          <div 
                            key={advisor.id}
                            onClick={() => {
                              if (isPresent) {
                                setAssignSelectedAdvisorIds(prev => prev.filter(id => id !== advisor.id));
                              } else {
                                setAssignSelectedAdvisorIds(prev => [...prev, advisor.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                              isPresent ? 'bg-purple-600/10 border-purple-500/30 text-white' : 'bg-slate-950/40 border-transparent text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${isPresent ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                {advisor.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-bold">{advisor.name}</p>
                                <p className="text-[10px] font-mono uppercase opacity-50">{advisor.code}</p>
                              </div>
                            </div>
                            {isPresent && <ShieldCheck className="w-5 h-5 text-purple-500 animate-in zoom-in-50 duration-150" />}
                          </div>
                        );
                    })}

                    {assignOwnerType === 'group' && groups.map(group => {
                      const isSelected = assignSelectedGroupId === group.id;
                      return (
                        <div 
                          key={group.id}
                          onClick={() => setAssignSelectedGroupId(group.id)}
                          className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                            isSelected ? 'bg-orange-600/10 border-orange-500/30 text-white' : 'bg-slate-950/40 border-transparent text-slate-500 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                              G
                            </div>
                            <div>
                              <p className="text-sm font-bold">{group.name}</p>
                              <p className="text-[10px] font-mono uppercase opacity-50">{group.members?.length || 0} Members</p>
                            </div>
                          </div>
                          {isSelected && <ShieldCheck className="w-5 h-5 text-orange-500 animate-in zoom-in-50 duration-150" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 shrink-0">
                <button 
                  type="submit"
                  disabled={loading || (assignOwnerType === 'all' && assignSelectedAdvisorIds.length === 0) || (assignOwnerType === 'group' && !assignSelectedGroupId)}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  Assign Advisor & Route Commission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPdfModal && selectedPdfUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm">Document Viewer</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Verifying Application Form</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedPdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
                  title="Open in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button 
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-slate-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-950 relative">
               <iframe 
                 src={getEmbedUrl(selectedPdfUrl)} 
                 className="w-full h-full border-none"
                 title="PDF Viewer"
               />
            </div>
            <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex justify-center">
               <button 
                 onClick={() => setShowPdfModal(false)}
                 className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all"
               >
                 Close Viewer
               </button>
            </div>
          </div>
        </div>
      )}

      {confirmingItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Confirm Distribution</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 tracking-wider">Follow the Money Policy</p>
              </div>
              <button onClick={() => setConfirmingItem(null)} className="text-slate-500 hover:text-white transition-colors p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-3xl shrink-0">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Policy Match</p>
                <h4 className="text-lg font-black text-white">{confirmingItem.submission.applicantSurname}, {confirmingItem.submission.initials}</h4>
                <p className="text-xs text-slate-500 font-mono mt-1">{confirmingItem.submission.idNumber}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest">Commission Distribution</h4>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-2xl sticky top-0 z-10">
                  <button 
                    onClick={() => {
                      setOwnerType('submission');
                      setPresentAdvisorIds(confirmingItem.submission.advisors.map(a => a.id));
                      setSelectedAdvisorGroupId(confirmingItem.submission.advisorGroupId || null);
                    }}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'submission' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    Current
                  </button>
                  <button 
                    onClick={() => {
                      setOwnerType('all');
                      setPresentAdvisorIds([]);
                      setSelectedAdvisorGroupId(null);
                      setAdvisorSearchQuery('');
                    }}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    Change Agent
                  </button>
                  <button 
                    onClick={() => {
                      setOwnerType('group');
                      setPresentAdvisorIds([]);
                      setSelectedAdvisorGroupId(null);
                      setAdvisorSearchQuery('');
                    }}
                    className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${ownerType === 'group' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                  >
                    Group
                  </button>
                </div>
                
                {ownerType === 'all' && (
                  <div className="relative sticky top-[44px] z-10 bg-slate-900 py-2">
                    <input 
                      type="text"
                      placeholder="Search advisor by name or code..."
                      value={advisorSearchQuery}
                      onChange={(e) => setAdvisorSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                    <Search className="absolute left-3 top-4.5 w-3.5 h-3.5 text-slate-500" />
                  </div>
                )}

                <div className="space-y-2 pr-2">
                  {ownerType === 'submission' && confirmingItem.submission.advisors.map(advisor => {
                    const isPresent = presentAdvisorIds.includes(advisor.id);
                    return (
                      <div 
                        key={advisor.id}
                        onClick={() => {
                          if (isPresent) {
                            setPresentAdvisorIds(prev => prev.filter(id => id !== advisor.id));
                          } else {
                            setPresentAdvisorIds(prev => [...prev, advisor.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                          isPresent ? 'bg-purple-600/10 border-purple-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${isPresent ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                             {advisor.name.charAt(0)}
                           </div>
                           <div>
                             <p className="text-xs font-bold">{advisor.name}</p>
                             <p className="text-[8px] font-mono uppercase opacity-50">{advisor.code}</p>
                           </div>
                        </div>
                        {isPresent && <ShieldCheck className="w-4 h-4 text-purple-500" />}
                      </div>
                    );
                  })}

                  {ownerType === 'all' && advisors
                    .filter(a => 
                      a.name.toLowerCase().includes(advisorSearchQuery.toLowerCase()) || 
                      a.code.toLowerCase().includes(advisorSearchQuery.toLowerCase())
                    )
                    .map(advisor => {
                    const isPresent = presentAdvisorIds.includes(advisor.id);
                    return (
                      <div 
                        key={advisor.id}
                        onClick={() => {
                          if (isPresent) {
                            setPresentAdvisorIds(prev => prev.filter(id => id !== advisor.id));
                          } else {
                            setPresentAdvisorIds(prev => [...prev, advisor.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                          isPresent ? 'bg-blue-600/10 border-blue-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${isPresent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                             {advisor.name.charAt(0)}
                           </div>
                           <div>
                             <p className="text-xs font-bold">{advisor.name}</p>
                             <p className="text-[8px] font-mono uppercase opacity-50">{advisor.code}</p>
                           </div>
                        </div>
                        {isPresent && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                      </div>
                    );
                  })}

                  {ownerType === 'group' && groups.map(group => {
                    const isSelected = selectedAdvisorGroupId === group.id;
                    return (
                      <div 
                        key={group.id}
                        onClick={() => setSelectedAdvisorGroupId(group.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${
                          isSelected ? 'bg-orange-600/10 border-orange-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                             G
                           </div>
                           <div>
                             <p className="text-xs font-bold">{group.name}</p>
                             <p className="text-[8px] font-mono uppercase opacity-50">{group.members?.length || 0} Members</p>
                           </div>
                        </div>
                        {isSelected && <ShieldCheck className="w-4 h-4 text-orange-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 shrink-0">
              <button 
                onClick={executeConfirmation}
                disabled={loading || (ownerType !== 'group' && presentAdvisorIds.length === 0) || (ownerType === 'group' && !selectedAdvisorGroupId)}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                Process Commission
              </button>
            </div>
          </div>
        </div>
      )}

      {showConcludeModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Conclude Commission Run</h3>
                <p className="text-slate-500 text-xs font-bold uppercase mt-1 tracking-widest">Review Net Payouts & Apply Deductions</p>
              </div>
              <button onClick={() => setShowConcludeModal(false)} className="text-slate-500 hover:text-white transition-colors p-2">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
              {concludeData.map((row) => (
                <div key={row.advisorId} className="bg-slate-800/30 border border-slate-700/50 rounded-3xl overflow-hidden">
                  <div className="p-6 bg-slate-800/50 flex items-center justify-between border-b border-slate-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl font-black text-white">
                        {row.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white">{row.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gross Commission: R {row.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Net Payout</p>
                       <p className="text-2xl font-black text-emerald-500">
                         R {(row.commission - Object.values(deductions[row.advisorId] || {}).reduce((a, b) => a + b, 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </p>
                    </div>
                  </div>

                  {row.adjustments.length > 0 ? (
                    <div className="p-6 space-y-4 bg-slate-900/20">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Wallet className="w-3 h-3 text-amber-500" /> Outstanding Adjustments (Grouped)
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Group by type for the UI */}
                        {Object.entries(row.adjustments.reduce((acc, adj) => {
                          if (!acc[adj.type]) acc[adj.type] = { type: adj.type, total: 0, items: [] };
                          acc[adj.type].total += adj.remainingBalance;
                          acc[adj.type].items.push(adj);
                          return acc;
                        }, {} as { [key: number]: { type: number, total: number, items: any[] } })).map(([typeStr, group]) => {
                          const type = parseInt(typeStr);
                          const typeLabel = ['Advance', 'Promotional Item', 'Damage', 'Maintenance', 'Event Fee', 'Other'][type] || 'Other';
                          
                          return (
                            <div key={type} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-xs font-black text-white uppercase tracking-tight">{typeLabel}</p>
                                <p className="text-[9px] text-slate-500 font-bold mt-1">Total Due: R {group.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[8px] text-slate-600 italic">({group.items.length} {group.items.length === 1 ? 'record' : 'records'})</p>
                              </div>
                              <div className="w-32">
                                <label className="text-[8px] font-black text-slate-600 uppercase mb-1 block">Deduct Total</label>
                                <div className="relative">
                                  <input 
                                    type="number" 
                                    max={group.total}
                                    value={deductions[row.advisorId][type] || 0}
                                    onChange={(e) => {
                                      const val = Math.min(parseFloat(e.target.value) || 0, group.total);
                                      setDeductions(prev => ({
                                        ...prev,
                                        [row.advisorId]: {
                                          ...prev[row.advisorId],
                                          [type]: val
                                        }
                                      }));
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500/50"
                                  />
                                  <span className="absolute right-2 top-1.5 text-[10px] text-slate-600 font-bold pointer-events-none">R</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center opacity-30 italic text-[10px] uppercase font-bold tracking-widest">No outstanding debts</div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                <AlertCircle className="w-5 h-5" />
                <p className="text-xs font-bold">This will finalize all pay slips and notify advisors.</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowConcludeModal(false)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">
                  Cancel
                </button>
                <button 
                  onClick={executeConcludeRun}
                  disabled={concluding}
                  className="px-10 py-3 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white font-black rounded-2xl transition-all shadow-xl shadow-green-600/20 flex items-center gap-2"
                >
                  {concluding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  Finalize & Send Payslips
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialsPage;
