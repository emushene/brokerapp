import React, { useEffect, useState } from 'react';
import { Package, Plus, Loader2, Calendar, User, Search, Gift, Award, CheckCircle, Clock, Trash2, Wallet, Hash } from 'lucide-react';
import { financialsApi, advisorsApi, advisorGroupsApi } from './lib/api';
import { AdjustmentType, AdjustmentStatus } from './lib/types';
import type { AccountAdjustment, Advisor, PromotionalItem } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const PromotionalGiftsPage: React.FC = () => {
  const [adjustments, setAdjustments] = useState<AccountAdjustment[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<PromotionalItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State for Issuing
  const [issueData, setIssueData] = useState({
    targetType: 'individual' as 'individual' | 'group',
    targetId: '',
    promotionalItemId: '',
    quantity: '1',
    description: ''
  });

  // Form State for Catalog
  const [catalogData, setCatalogData] = useState({
    name: '',
    description: '',
    value: '' // Mapping to price
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adjData, advData, grpData, catData] = await Promise.all([
        financialsApi.getOutstandingAdjustments({}),
        advisorsApi.getAll(),
        advisorGroupsApi.getAll(),
        financialsApi.getPromotionalItems()
      ]);
      setAdjustments(adjData.filter(a => a.type === AdjustmentType.PromotionalItem));
      setAdvisors(advData);
      setGroups(grpData);
      setCatalog(catData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueData.targetId || !issueData.promotionalItemId) return;

    const selectedItem = catalog.find(i => i.id === parseInt(issueData.promotionalItemId));
    if (!selectedItem) return;

    const qty = parseInt(issueData.quantity) || 1;

    try {
      setSubmitting(true);
      await financialsApi.createAdjustment({
        advisorId: issueData.targetType === 'individual' ? parseInt(issueData.targetId) : undefined,
        advisorGroupId: issueData.targetType === 'group' ? parseInt(issueData.targetId) : undefined,
        promotionalItemId: selectedItem.id,
        quantity: qty,
        totalAmount: selectedItem.price * qty,
        description: issueData.description || `Gift: ${selectedItem.name} (x${qty})`,
        type: AdjustmentType.PromotionalItem
      });
      setIsIssueModalOpen(false);
      setIssueData({ targetType: 'individual', targetId: '', promotionalItemId: '', quantity: '1', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error issuing gift:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCatalogItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogData.name || !catalogData.value) return;

    try {
      setSubmitting(true);
      await financialsApi.addPromotionalItem({
        name: catalogData.name,
        category: 'Gift',
        sizes: '',
        price: parseFloat(catalogData.value)
      });
      setIsCatalogModalOpen(false);
      setCatalogData({ name: '', description: '', value: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding catalog item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<AccountAdjustment>[] = [
    {
      header: 'Recipient',
      accessor: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
             {a.advisorGroupId ? <Package className="w-4 h-4 text-emerald-500" /> : <User className="w-4 h-4 text-slate-400" />}
          </div>
          <div>
            <p className="font-bold text-white">{a.advisorName || a.advisorGroupName || 'Unknown'}</p>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
              {a.advisorGroupId ? 'Group' : 'Individual'}
            </p>
          </div>
        </div>
      )
    },
    {
      header: 'Gift Item',
      accessor: (a) => (
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-slate-300">{a.promotionalItemName || a.description}</span>
        </div>
      )
    },
    {
      header: 'Quantity',
      accessor: (a) => (
        <div className="flex items-center gap-2">
          <div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
             <span className="text-sm font-black text-blue-400">{a.quantity || 1}</span>
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Items</span>
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
      header: 'Total Value',
      accessor: (a) => (
        <div className="text-right">
          <p className="text-sm font-black text-white">R {(a.totalAmount || 0).toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-bold">Debt: R {(a.remainingBalance || 0).toLocaleString()}</p>
        </div>
      )
    }
  ];

  const totalItemsIssued = adjustments.reduce((s, a) => s + (a.quantity || 1), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-500" />
            Promotional Gifts
          </h1>
          <p className="text-slate-400 mt-2">Track rewards, gifts, and promotional equipment issued to advisors.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCatalogModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-3 rounded-2xl font-bold transition-all border border-slate-700"
          >
            <Award className="w-4 h-4 text-amber-500" />
            Manage Catalog
          </button>
          <button 
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Issue Gift
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Gift Value</p>
          <p className="text-3xl font-black text-white">R {adjustments.reduce((s, a) => s + (a.totalAmount || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Recoverable Amount</p>
          <p className="text-3xl font-black text-emerald-500">R {adjustments.reduce((s, a) => s + (a.remainingBalance || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Items Issued</p>
          <p className="text-3xl font-black text-white">{totalItemsIssued}</p>
          <div className="mt-4 flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <Hash className="w-3 h-3" />
            Across {adjustments.length} Issuances
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Catalog Items</p>
          <p className="text-3xl font-black text-amber-500">{catalog.length}</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden">
        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl">
              <Gift className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Issuance History</h2>
          </div>
        </div>
        
        <DataTable
          data={adjustments}
          columns={columns}
          loading={loading}
        />
      </div>

      {/* Issue Gift Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !submitting && setIsIssueModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-600/20 text-white">
                  <Gift className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Issue Reward / Gift</h3>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleIssueGift} className="p-8 space-y-6">
              <div className="flex bg-slate-800 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setIssueData({...issueData, targetType: 'individual', targetId: ''})}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${issueData.targetType === 'individual' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Individual
                </button>
                <button 
                  type="button"
                  onClick={() => setIssueData({...issueData, targetType: 'group', targetId: ''})}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${issueData.targetType === 'group' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Group
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select {issueData.targetType === 'individual' ? 'Advisor' : 'Group'}</label>
                <select
                  required
                  value={issueData.targetId}
                  onChange={(e) => setIssueData({...issueData, targetId: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Select...</option>
                  {issueData.targetType === 'individual' 
                    ? advisors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                    : groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                  }
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Catalog Item</label>
                  <select
                    required
                    value={issueData.promotionalItemId}
                    onChange={(e) => setIssueData({...issueData, promotionalItemId: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Select...</option>
                    {catalog.map(item => (
                      <option key={item.id} value={item.id}>{item.name} (R {(item.price || 0).toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      value={issueData.quantity}
                      onChange={(e) => setIssueData({...issueData, quantity: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <Hash className="absolute right-4 top-4 w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Note / Description</label>
                <textarea
                  placeholder="Optional custom description..."
                  value={issueData.description}
                  onChange={(e) => setIssueData({...issueData, description: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-emerald-500/50 min-h-[80px]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Confirm Issuance</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Catalog Modal */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !submitting && setIsCatalogModalOpen(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 p-2.5 rounded-2xl text-amber-500">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Gifts Catalog</h3>
              </div>
              <button onClick={() => setIsCatalogModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Add New Catalog Item Form */}
              <form onSubmit={handleAddCatalogItem} className="bg-slate-800/50 border border-slate-700 p-6 rounded-3xl space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add New Item to Catalog</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    required
                    placeholder="Item Name (e.g. Laptop)"
                    value={catalogData.name}
                    onChange={(e) => setCatalogData({...catalogData, name: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm"
                  />
                  <input
                    required
                    type="number"
                    placeholder="Value (R)"
                    value={catalogData.value}
                    onChange={(e) => setCatalogData({...catalogData, value: e.target.value})}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm"
                  />
                </div>
                <textarea
                  placeholder="Short description..."
                  value={catalogData.description}
                  onChange={(e) => setCatalogData({...catalogData, description: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none text-sm min-h-[60px]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Add to Catalog</>}
                </button>
              </form>

              {/* Catalog List */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existing Items</p>
                <div className="grid grid-cols-1 gap-3">
                  {catalog.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-800 rounded-xl text-emerald-500"><Gift className="w-4 h-4" /></div>
                        <div>
                          <p className="text-sm font-bold text-white">{item.name}</p>
                          <p className="text-xs text-slate-500">{item.description}</p>
                        </div>
                      </div>
                      <p className="font-black text-white">R {(item.price || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionalGiftsPage;
