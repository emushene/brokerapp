import React, { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Calendar, Hash, Users, Receipt, CheckCircle, Clock, ArrowDownLeft, X, Loader2, Upload, Activity, FileText, Download, History, ChevronRight, FileSpreadsheet, AlertCircle, Filter, ExternalLink } from 'lucide-react';
import { financialsApi } from './lib/api';
import type { Commission, CommissionStatement, StatementItem, MovementItem } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const cat = category?.toLowerCase() || 'unknown';
  if (cat.includes('lapse')) {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
        <AlertCircle className="w-2.5 h-2.5" />
        Lapse
      </span>
    );
  }
  if (cat.includes('1st') || cat.includes('first')) {
    return (
      <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
        1st Year
      </span>
    );
  }
  if (cat.includes('2nd') || cat.includes('second')) {
    return (
      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
        2nd Year
      </span>
    );
  }
  return (
    <span className="text-[9px] font-black bg-slate-500/10 text-slate-400 border border-slate-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
      {category}
    </span>
  );
};

const FinancialsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [statements, setStatements] = useState<CommissionStatement[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [importResult, setImportResult] = useState<CommissionStatement | null>(null);

  // Statement Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  // Payout Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [paying, setPaying] = useState(false);

  // PDF Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState('All');

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

  const handleImportStatement = async () => {
    if (!statementFile) return;
    try {
      setIsUploading(true);
      const result = await financialsApi.importStatement(statementFile, statementDate);
      setImportResult(result);
      setStatementFile(null);
      fetchData();
    } catch (error) {
      console.error('Error importing statement:', error);
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

  const handleMarkAsPaid = async () => {
    if (!selectedCommission || !payoutRef) return;
    setPaying(true);
    try {
      await financialsApi.markAsPaid(selectedCommission.id, payoutRef);
      setShowPayoutModal(false);
      setPayoutRef('');
      setSelectedCommission(null);
      fetchData();
    } catch (error) {
      console.error('Error marking commission as paid:', error);
    } finally {
      setPaying(false);
    }
  };

  const openPdfViewer = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPdfUrl(url);
    setShowPdfModal(true);
  };

  const historyColumns: Column<CommissionStatement>[] = [
    {
      header: 'Upload Date',
      accessor: (s) => <span className="text-xs">{new Date(s.uploadDate).toLocaleDateString()}</span>,
      sortAccessor: (s) => s.uploadDate,
      className: 'w-24'
    },
    {
      header: 'File Name',
      accessor: (s) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="text-xs font-bold text-white truncate">{s.fileName}</span>
          <span className="text-[10px] text-slate-500 uppercase">Statement: {new Date(s.statementDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      ),
      sortAccessor: (s) => s.fileName
    },
    {
      header: 'Total',
      accessor: (s) => <span className="text-xs font-bold text-green-500">R{s.totalCommission.toLocaleString()}</span>,
      sortAccessor: (s) => s.totalCommission,
      className: 'text-right w-24'
    },
    {
      header: 'Matched',
      accessor: (s) => (
        <div className="text-[10px] font-bold">
          <span className="text-green-500">{s.matchedRows}</span>
          <span className="text-slate-600 mx-0.5">/</span>
          <span className="text-slate-400">{s.totalRows}</span>
        </div>
      ),
      sortAccessor: (s) => s.matchedRows,
      className: 'text-center w-20'
    },
    {
      header: 'Link',
      accessor: (s) => s.fileUrl ? (
        <button 
          onClick={(e) => openPdfViewer(e, s.fileUrl!)} 
          className="p-1 hover:bg-slate-700 rounded transition-colors inline-block"
        >
          <Download className="w-3.5 h-3.5 text-blue-500" />
        </button>
      ) : null,
      className: 'text-center w-12'
    }
  ];

  const commissionColumns: Column<Commission>[] = [
    { header: 'Date', accessor: (c) => <span className="text-xs">{new Date(c.dateCalculated).toLocaleDateString()}</span>, sortAccessor: (c) => c.dateCalculated, className: 'w-24' },
    { header: 'Status', accessor: (c) => <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${c.isPaid ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{c.isPaid ? 'PAID' : 'DUE'}</span>, sortAccessor: (c) => c.isPaid, className: 'w-20' },
    { header: 'Advisor', accessor: (c) => <span className="text-xs font-bold text-white">{c.advisorName}</span>, sortAccessor: (c) => c.advisorName, className: 'w-40' },
    { header: 'Applicant', accessor: (c) => <span className="text-xs text-slate-300">{c.applicantSurname}, {c.applicantInitials}</span>, sortAccessor: (c) => c.applicantSurname },
    { header: 'Comm', accessor: (c) => <span className={`text-xs font-bold ${c.commissionAmount < 0 ? 'text-red-500' : 'text-green-500'}`}>R{c.commissionAmount.toLocaleString()}</span>, sortAccessor: (c) => c.commissionAmount, className: 'text-right w-24' },
    { 
      header: 'Scan', 
      accessor: (c) => c.fileUrl ? (
        <button 
          onClick={(e) => openPdfViewer(e, c.fileUrl!)} 
          className="p-1 hover:bg-slate-700 rounded transition-colors inline-block"
          title="View Original Scan"
        >
          <FileText className="w-3.5 h-3.5 text-blue-500" />
        </button>
      ) : (
        <span className="text-slate-700">
          <FileText className="w-3.5 h-3.5 opacity-20" />
        </span>
      ), 
      className: 'text-center w-12' 
    }
  ];

  const statementItemColumns: Column<StatementItem>[] = [
    { header: 'Category', accessor: (i) => <CategoryBadge category={i.category || ''} />, sortAccessor: (i) => i.category || '', className: 'w-24' },
    { header: 'Client / Policy', accessor: (i) => <div className="flex flex-col leading-none"><span className="text-[11px] font-bold text-white">{i.clientName}</span><span className="text-[9px] text-slate-500">{i.policyNumber}</span></div>, sortAccessor: (i) => i.clientName },
    { header: 'Advisor', accessor: (i) => <span className="text-[10px] font-bold text-blue-400">{i.advisorName || '—'}</span>, sortAccessor: (i) => i.advisorName || '', className: 'w-32' },
    { header: 'Premium', accessor: (i) => <span className="text-[11px] text-slate-300">R{i.premium.toLocaleString()}</span>, sortAccessor: (i) => i.premium, className: 'text-right w-24' },
    { header: 'Comm', accessor: (i) => <span className={`text-[11px] font-bold ${i.amount < 0 ? 'text-red-500' : 'text-white'}`}>R{i.amount.toLocaleString()}</span>, sortAccessor: (i) => i.amount, className: 'text-right w-24' },
    { 
      header: 'Links', 
      accessor: (i) => (
        <div className="flex items-center justify-center gap-1.5">
          {i.fileUrl ? (
            <button 
              onClick={(e) => openPdfViewer(e, i.fileUrl!)} 
              className="p-1 hover:bg-slate-700 rounded transition-colors" 
              title="View Scan"
            >
              <FileText className="w-3 h-3 text-blue-500" />
            </button>
          ) : <FileText className="w-3 h-3 text-slate-800" />}
          {i.googleDriveLink ? (
            <button 
              onClick={(e) => openPdfViewer(e, i.googleDriveLink!)} 
              className="p-1 hover:bg-slate-700 rounded transition-colors" 
              title="View in Google Drive"
            >
              <ExternalLink className="w-3 h-3 text-green-500" />
            </button>
          ) : <ExternalLink className="w-3 h-3 text-slate-800" />}
        </div>
      ),
      className: 'text-center w-20' 
    },
    { header: 'Match', accessor: (i) => i.isMatched ? <CheckCircle className="w-3 h-3 text-green-500 mx-auto" /> : <Clock className="w-3 h-3 text-slate-600 mx-auto" />, sortAccessor: (i) => i.isMatched ? 1 : 0, className: 'text-center w-16' }
  ];

  const movementItemColumns: Column<MovementItem>[] = [
    { header: 'Category', accessor: (i) => <CategoryBadge category={i.category || ''} />, sortAccessor: (i) => i.category || '', className: 'w-24' },
    { header: 'Client / Policy', accessor: (i) => <div className="flex flex-col leading-none"><span className="text-[11px] font-bold text-white">{i.clientName}</span><span className="text-[9px] text-slate-500">{i.policyNumber}</span></div>, sortAccessor: (i) => i.clientName },
    { header: 'Advisor', accessor: (i) => <span className="text-[10px] font-bold text-blue-400">{i.advisorName || '—'}</span>, sortAccessor: (i) => i.advisorName || '', className: 'w-32' },
    { header: 'Movement', accessor: (i) => <span className="text-[10px] text-blue-400 font-bold">{i.movementType}</span>, sortAccessor: (i) => i.movementType },
    { header: 'Premium', accessor: (i) => <span className={`text-[11px] ${i.premium < 0 ? 'text-red-500' : ''}`}>R{i.premium.toLocaleString()}</span>, sortAccessor: (i) => i.premium, className: 'text-right w-24' },
    { 
      header: 'Links', 
      accessor: (i) => (
        <div className="flex items-center justify-center gap-1.5">
          {i.fileUrl ? (
            <button 
              onClick={(e) => openPdfViewer(e, i.fileUrl!)} 
              className="p-1 hover:bg-slate-700 rounded transition-colors" 
              title="View Scan"
            >
              <FileText className="w-3 h-3 text-blue-500" />
            </button>
          ) : <FileText className="w-3 h-3 text-slate-800" />}
          {i.googleDriveLink ? (
            <button 
              onClick={(e) => openPdfViewer(e, i.googleDriveLink!)} 
              className="p-1 hover:bg-slate-700 rounded transition-colors" 
              title="View in Google Drive"
            >
              <ExternalLink className="w-3 h-3 text-green-500" />
            </button>
          ) : <ExternalLink className="w-3 h-3 text-slate-800" />}
        </div>
      ),
      className: 'text-center w-20' 
    },
    { header: 'Match', accessor: (i) => i.isMatched ? <CheckCircle className="w-3 h-3 text-green-500 mx-auto" /> : <Clock className="w-3 h-3 text-slate-600 mx-auto" />, sortAccessor: (i) => i.isMatched ? 1 : 0, className: 'text-center w-16' }
  ];

  const totalNet = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-black text-white leading-none">Financials</h1>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mt-1">Insurer Statement Reconciliation</p>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="relative">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              accept=".xlsx,.xls"
              onChange={(e) => setStatementFile(e.target.files?.[0] || null)}
            />
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex items-center gap-2">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              {statementFile ? statementFile.name : 'Choose File'}
            </div>
          </div>
          {statementFile && (
            <button 
              onClick={handleImportStatement}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Process'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Net Revenue</span>
           <span className="text-lg font-black text-white">R {totalNet.toLocaleString()}</span>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statement History</span>
           <span className="text-lg font-black text-blue-500">{statements.length}</span>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matched Items</span>
           <span className="text-lg font-black text-green-500">{importResult?.matchedRows || 0}</span>
        </div>
      </div>

      {importResult ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
             <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-green-500 w-5 h-5" />
                <div>
                   <h2 className="text-sm font-black text-white leading-none">{importResult.fileName}</h2>
                   <p className="text-[10px] text-slate-500 mt-1 uppercase">Statement Date: {new Date(importResult.statementDate).toLocaleDateString()}</p>
                </div>
             </div>
             <button 
               onClick={() => setImportResult(null)}
               className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
             >
               <History className="w-3.5 h-3.5" />
               Back to History
             </button>
          </div>

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
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
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
                }
              ]}
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xs font-black text-white uppercase flex items-center gap-1.5 px-1">
               <FileText className="w-3.5 h-3.5 text-slate-500" />
               Recent Payouts
            </h3>
            <DataTable
              data={commissions}
              columns={commissionColumns}
              loading={loading}
              pageSize={10}
              actions={[
                {
                  icon: <DollarSign className="w-4 h-4" />,
                  label: 'Pay',
                  onClick: (c) => { if (!c.isPaid) { setSelectedCommission(c); setShowPayoutModal(true); } },
                  className: (c) => c.isPaid ? 'hidden' : 'text-green-500'
                }
              ]}
            />
          </div>
        </div>
      )}

      {showPayoutModal && selectedCommission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
              <h3 className="font-bold text-white text-sm">Payout: {selectedCommission.advisorName}</h3>
              <button onClick={() => setShowPayoutModal(false)}><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            <div className="p-4 space-y-4">
               <div className="text-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Amount Due</p>
                  <p className="text-2xl font-black text-green-500">R {selectedCommission.commissionAmount.toLocaleString()}</p>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Reference</label>
                  <input type="text" value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500" />
               </div>
               <button onClick={handleMarkAsPaid} disabled={paying || !payoutRef} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all text-sm disabled:opacity-50">
                {paying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && selectedPdfUrl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
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
                 src={selectedPdfUrl} 
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
    </div>
  );
};

export default FinancialsPage;
