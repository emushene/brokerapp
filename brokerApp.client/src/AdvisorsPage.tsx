import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Pencil, Trash2, Loader2, Phone, UserPlus, BarChart3, X, FileText, CheckCircle2, AlertCircle, Clock, DollarSign, Receipt, Mail, Percent, Users, User, Plus, Check, Wallet, Package, Activity, CreditCard, ShieldCheck, Calendar, Search } from 'lucide-react';
import api, { advisorsApi, submissionsApi, financialsApi, advisorGroupsApi } from './lib/api';
import type { Advisor, Submission, Commission, AdvisorGroup, AdvisorGroupDto, PromotionalItem, AccountAdjustment } from './lib/types';
import { AdjustmentType } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';
import { useNavigate } from 'react-router-dom';

const advisorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  code: z.string().min(1, 'Code is required'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  commissionPercentage1stYear: z.coerce.number().min(0).max(100),
  commissionPercentage2ndYear: z.coerce.number().min(0).max(100),
  salesforceName: z.string().optional(),
});

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
  description: z.string().optional(),
  memberIds: z.array(z.number()).min(1, 'At least one member is required'),
});

type AdvisorFormValues = z.infer<typeof advisorSchema>;
type GroupFormValues = z.infer<typeof groupSchema>;

const AdvisorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'advisors' | 'groups' | 'catalog'>('advisors');
  
  // Advisors State
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);
  const [submittingAdvisor, setSubmittingAdvisor] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);

  // Groups State
  const [groups, setGroups] = useState<AdvisorGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdvisorGroup | null>(null);

  // New Modal States
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Ledger State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerTarget, setLedgerTarget] = useState<{ type: 'advisor' | 'group', id: number, name: string } | null>(null);
  const [chargeToGroupId, setChargeToGroupId] = useState<number | null>(null);
  const [outstandingAdjustments, setOutstandingAdjustments] = useState<AccountAdjustment[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [catalogItems, setCatalogItems] = useState<PromotionalItem[]>([]);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const targetAdvisorGroups = useMemo(() => {
    if (ledgerTarget?.type === 'advisor') {
      return groups.filter(g => g.memberIds.includes(ledgerTarget.id));
    }
    return [];
  }, [ledgerTarget, groups]);

  // Modal State
  const [showInsights, setShowInsights] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [advisorSubmissions, setAdvisorSubmissions] = useState<Submission[]>([]);
  const [advisorCommissions, setAdvisorCommissions] = useState<Commission[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const advisorForm = useForm<AdvisorFormValues>({
    resolver: zodResolver(advisorSchema) as any,
    defaultValues: {
      name: '', email: '', code: '', phoneNumber: '',
      commissionPercentage1stYear: 70,
      commissionPercentage2ndYear: 70,
    }
  });

  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '', description: '', memberIds: []
    }
  });

  const adjustmentForm = useForm<{
    type: AdjustmentType;
    totalAmount: number;
    description: string;
    promotionalItemId?: number;
  }>({
    defaultValues: {
      totalAmount: 0,
      description: '',
    }
  });

  // Catalog State
  const [submittingCatalogItem, setSubmittingCatalogItem] = useState(false);
  const catalogSchema = z.object({
    name: z.string().min(1, 'Item name is required'),
    price: z.coerce.number().min(0, 'Price must be positive'),
    category: z.string().min(1, 'Category is required'),
    sizes: z.string().optional(),
  });
  type CatalogFormValues = z.infer<typeof catalogSchema>;
  const catalogForm = useForm<CatalogFormValues>({
    resolver: zodResolver(catalogSchema) as any,    defaultValues: { name: '', price: 0, category: 'Uniform', sizes: '' }
  });

  const onCatalogSubmit = async (data: CatalogFormValues) => {
    setSubmittingCatalogItem(true);
    try {
      await financialsApi.addPromotionalItem(data);
      catalogForm.reset();
      setShowCatalogModal(false);
      const items = await financialsApi.getPromotionalItems();
      setCatalogItems(items);
    } catch (error) {
      console.error('Error saving catalog item:', error);
    } finally {
      setSubmittingCatalogItem(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoadingAdvisors(true);
      setLoadingGroups(true);
      const [advData, groupData, catalogData] = await Promise.all([
        advisorsApi.getAll(),
        advisorGroupsApi.getAll(),
        financialsApi.getPromotionalItems()
      ]);
      setAdvisors(advData);
      setGroups(groupData);
      setCatalogItems(catalogData);
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      setLoadingAdvisors(false);
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Advisor Handlers ---
  const onAdvisorSubmit = async (data: AdvisorFormValues) => {
    setSubmittingAdvisor(true);
    try {
      if (editingAdvisor) {
        await api.put(`/Advisors/${editingAdvisor.id}`, data);
      } else {
        await api.post('/Advisors', data);
      }
      advisorForm.reset();
      setEditingAdvisor(null);
      setShowAdvisorModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving advisor:', error);
    } finally {
      setSubmittingAdvisor(false);
    }
  };

  const handleEditAdvisor = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    advisorForm.setValue('name', advisor.name);
    advisorForm.setValue('email', advisor.email);
    advisorForm.setValue('code', advisor.code);
    advisorForm.setValue('phoneNumber', advisor.phoneNumber);
    advisorForm.setValue('commissionPercentage1stYear', advisor.commissionPercentage1stYear);
    advisorForm.setValue('commissionPercentage2ndYear', advisor.commissionPercentage2ndYear);
    advisorForm.setValue('salesforceName', advisor.salesforceName || '');
    setShowAdvisorModal(true);
  };

  // --- Group Handlers ---
  const onGroupSubmit = async (data: GroupFormValues) => {
    setSubmittingGroup(true);
    try {
      if (editingGroup) {
        await advisorGroupsApi.update(editingGroup.id, data);
      } else {
        await advisorGroupsApi.create(data);
      }
      groupForm.reset();
      setEditingGroup(null);
      setShowGroupModal(false);
      setMemberSearchTerm('');
      fetchData();
    } catch (error) {
      console.error('Error saving group:', error);
    } finally {
      setSubmittingGroup(false);
    }
  };

  const handleEditGroup = (group: AdvisorGroup) => {
    setEditingGroup(group);
    groupForm.setValue('name', group.name);
    groupForm.setValue('description', group.description);
    groupForm.setValue('memberIds', group.memberIds);
    setShowGroupModal(true);
  };

  const handleDeleteGroup = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await advisorGroupsApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handleShowInsights = async (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setShowInsights(true);
    setLoadingInsights(true);
    try {
      const [subs, comms] = await Promise.all([
        submissionsApi.getByAdvisorId(advisor.id),
        financialsApi.getCommissions(advisor.id)
      ]);
      setAdvisorSubmissions(subs);
      setAdvisorCommissions(comms);
    } catch (error) {
      console.error('Error fetching advisor insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleOpenLedger = async (target: { type: 'advisor' | 'group', id: number, name: string }) => {
    setLedgerTarget(target);
    setChargeToGroupId(null);
    setShowLedgerModal(true);
    setLoadingAdjustments(true);
    try {
      const [items, adjustments] = await Promise.all([
        financialsApi.getPromotionalItems(),
        financialsApi.getOutstandingAdjustments(target.type === 'advisor' ? { advisorId: target.id } : { groupId: target.id })
      ]);
      setCatalogItems(items);
      setOutstandingAdjustments(adjustments);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  // Watch for promotional item selection to auto-fill amount
  const selectedPromoId = adjustmentForm.watch('promotionalItemId');
  useEffect(() => {
    if (selectedPromoId) {
      const item = catalogItems.find(i => i.id === selectedPromoId);
      if (item) {
        adjustmentForm.setValue('totalAmount', item.price);
        adjustmentForm.setValue('description', `Catalog: ${item.name}`);
      }
    }
  }, [selectedPromoId, catalogItems]);

  const onAdjustmentSubmit = async (data: any) => {
    if (!ledgerTarget) return;
    setSubmittingAdjustment(true);
    try {
      await financialsApi.createAdjustment({
        ...data,
        advisorId: ledgerTarget.type === 'advisor' ? ledgerTarget.id : undefined,
        advisorGroupId: ledgerTarget.type === 'advisor' ? (chargeToGroupId ?? undefined) : ledgerTarget.id
      });
      adjustmentForm.reset();
      const adjustments = await financialsApi.getOutstandingAdjustments(ledgerTarget.type === 'advisor' ? { advisorId: ledgerTarget.id } : { groupId: ledgerTarget.id });
      setOutstandingAdjustments(adjustments);
      setChargeToGroupId(null);
    } catch (error) {
      console.error('Error creating adjustment:', error);
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const advisorColumns: Column<Advisor>[] = [
    {
      header: 'Profile',
      accessor: (advisor) => (
        <div>
          <div className="font-bold text-white">{advisor.name}</div>
          <div className="flex flex-col gap-1 mt-1">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Code: {advisor.code}</span>
            {advisor.salesforceName && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium tracking-wide w-fit">
                Alias: {advisor.salesforceName}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Payout Rates',
      accessor: (advisor) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
            <span className="text-[10px] text-slate-500 font-normal uppercase">1st Yr:</span>
            {advisor.commissionPercentage1stYear}%
          </div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
            <span className="text-[10px] text-slate-500 font-normal uppercase">2nd Yr:</span>
            {advisor.commissionPercentage2ndYear}%
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      accessor: (advisor) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Mail className="w-3 h-3 text-slate-500" />
            {advisor.email}
          </div>
          <div className="flex items-center gap-2 text-slate-300 text-xs">
            <Phone className="w-3 h-3 text-slate-500" />
            {advisor.phoneNumber}
          </div>
        </div>
      )
    },
    {
      header: 'Teams',
      accessor: (advisor) => {
        const advisorGroups = groups.filter(g => g.memberIds.includes(advisor.id));
        return (
          <div className="flex flex-wrap gap-1">
            {advisorGroups.map(g => (
              <span key={g.id} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {g.name}
              </span>
            ))}
            {advisorGroups.length === 0 && <span className="text-[9px] text-slate-600 italic">Independent</span>}
          </div>
        );
      }
    }
  ];

  const groupColumns: Column<AdvisorGroup>[] = [
    {
      header: 'Team Name',
      className: 'w-[250px]',
      accessor: (group) => (
        <div>
          <div className="font-bold text-white text-base">{group.name}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{group.description || 'No description provided'}</div>
        </div>
      )
    },
    {
      header: 'Members',
      accessor: (group) => (
        <div className="flex flex-wrap gap-2 py-1">
          {group.members?.map((m) => (
            <div 
              key={m.id} 
              className="group/member flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 pl-2 pr-3 py-1.5 rounded-xl hover:border-blue-500/50 transition-all hover:bg-slate-800"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-black text-blue-400">
                {m.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-tight">{m.name}</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter leading-none mt-0.5">{m.code}</span>
              </div>
            </div>
          ))}
          {(!group.members || group.members.length === 0) && (
            <div className="flex items-center gap-2 text-slate-600 px-2 py-2">
              <Users className="w-4 h-4 opacity-20" />
              <span className="text-xs italic">No members assigned to this team</span>
            </div>
          )}
        </div>
      )
    }
  ];

  const advisorActions = [
    { icon: <Wallet className="w-4 h-4" />, label: 'Ledger', onClick: (a: Advisor) => handleOpenLedger({ type: 'advisor', id: a.id, name: a.name }), className: 'text-emerald-400 hover:bg-emerald-400/10' },
    { icon: <BarChart3 className="w-4 h-4" />, label: 'Insights', onClick: handleShowInsights, className: 'text-purple-400 hover:bg-purple-400/10' },
    { icon: <Receipt className="w-4 h-4" />, label: 'Pay Slips', onClick: (a: Advisor) => navigate(`/payslips/${a.id}`), className: 'text-blue-400 hover:bg-blue-400/10' },
    { icon: <Pencil className="w-4 h-4" />, label: 'Edit', onClick: handleEditAdvisor, className: 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10' },
    { icon: <Trash2 className="w-4 h-4" />, label: 'Delete', onClick: (a: Advisor) => {}, className: 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' }
  ];

  const groupActions = [
    { icon: <Wallet className="w-4 h-4" />, label: 'Team Ledger', onClick: (g: AdvisorGroup) => handleOpenLedger({ type: 'group', id: g.id, name: g.name }), className: 'text-emerald-400 hover:bg-emerald-400/10' },
    { icon: <Pencil className="w-4 h-4" />, label: 'Edit Team', onClick: handleEditGroup, className: 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10' },
    { icon: <Trash2 className="w-4 h-4" />, label: 'Disband', onClick: (g: AdvisorGroup) => handleDeleteGroup(g.id), className: 'text-slate-400 hover:text-red-400 hover:bg-red-400/10' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Organization</h1>
          <p className="text-slate-400 mt-2">Manage individual advisors and collaborative teams.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700/50">
            <button 
              onClick={() => setActiveTab('advisors')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'advisors' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              <User className="w-4 h-4" /> Advisors
            </button>
            <button 
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'groups' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4" /> Teams
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'catalog' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Package className="w-4 h-4" /> Catalog
            </button>
          </div>

          <div className="h-8 w-px bg-slate-800 mx-2 hidden md:block" />

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {activeTab === 'advisors' && (
              <button 
                onClick={() => { setEditingAdvisor(null); advisorForm.reset(); setShowAdvisorModal(true); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <UserPlus className="w-4 h-4" /> Register Advisor
              </button>
            )}
            {activeTab === 'groups' && (
              <button 
                onClick={() => { setEditingGroup(null); groupForm.reset(); setShowGroupModal(true); }}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/20"
              >
                <Plus className="w-4 h-4" /> Create Team
              </button>
            )}
            {activeTab === 'catalog' && (
              <button 
                onClick={() => { catalogForm.reset(); setShowCatalogModal(true); }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/10 p-3 rounded-2xl">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Total Advisors</p>
              <p className="text-2xl font-black text-white">{advisors.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="bg-purple-600/10 p-3 rounded-2xl">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Active Teams</p>
              <p className="text-2xl font-black text-white">{groups.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600/10 p-3 rounded-2xl">
              <Package className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Catalog Items</p>
              <p className="text-2xl font-black text-white">{catalogItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="bg-amber-600/10 p-3 rounded-2xl">
              <Activity className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Org Health</p>
              <p className="text-2xl font-black text-white">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* List Column */}
        <div>
          {activeTab === 'advisors' ? (
            <DataTable data={advisors} columns={advisorColumns} actions={advisorActions} loading={loadingAdvisors} searchPlaceholder="Search advisors..." />
          ) : activeTab === 'groups' ? (
            <DataTable data={groups} columns={groupColumns} actions={groupActions} loading={loadingGroups} searchPlaceholder="Search teams..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalogItems.map((item) => (
                <div key={item.id} className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-3xl hover:border-emerald-500/50 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                      <Package className="w-6 h-6 text-emerald-500" />
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 uppercase">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                  <p className="text-2xl font-black text-white">R {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  {item.sizes && (
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-2 tracking-widest">
                      Available Sizes: {item.sizes}
                    </p>
                  )}
                </div>
              ))}
              {catalogItems.length === 0 && (
                <div className="md:col-span-2 py-20 text-center opacity-30">
                  <Package className="w-16 h-16 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest">No items in catalog</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ledger / Adjustments Modal */}
      {showLedgerModal && ledgerTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-4xl h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{ledgerTarget.name} - Account Ledger</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Assign Debts, Advances & Items</p>
                </div>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Form Side */}
              <div className="w-full md:w-1/2 p-6 border-r border-slate-800 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">New Adjustment</h4>
                
                <form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Adjustment Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { type: AdjustmentType.PromotionalItem, label: 'Catalog Item', icon: <Package className="w-3 h-3" /> },
                        { type: AdjustmentType.Advance, label: 'Cash Advance', icon: <CreditCard className="w-3 h-3" />, disabled: ledgerTarget.type === 'group' },
                        { type: AdjustmentType.Damage, label: 'Damage Fee', icon: <AlertCircle className="w-3 h-3" /> },
                        { type: AdjustmentType.Maintenance, label: 'Maintenance', icon: <Activity className="w-3 h-3" /> },
                        { type: AdjustmentType.EventFee, label: 'Event Fee', icon: <Calendar className="w-3 h-3" /> },
                        { type: AdjustmentType.Other, label: 'Other', icon: <Plus className="w-3 h-3" /> },
                      ].map((btn) => (
                        <button
                          key={btn.type}
                          type="button"
                          disabled={btn.disabled}
                          onClick={() => {
                            adjustmentForm.setValue('type', btn.type as any);
                            if (btn.type !== AdjustmentType.PromotionalItem) adjustmentForm.setValue('promotionalItemId', undefined);
                          }}
                          className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                            adjustmentForm.watch('type') === btn.type
                              ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                              : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700 disabled:opacity-20'
                          }`}
                        >
                          {btn.icon} {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {ledgerTarget.type === 'advisor' && targetAdvisorGroups.length > 0 && adjustmentForm.watch('type') !== AdjustmentType.Advance && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Charge To</label>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          type="button"
                          onClick={() => setChargeToGroupId(null)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${chargeToGroupId === null ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                          <User className="w-3 h-3" /> Personal
                        </button>
                        {targetAdvisorGroups.map(g => (
                          <button 
                            key={g.id}
                            type="button"
                            onClick={() => setChargeToGroupId(g.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[10px] font-bold uppercase transition-all ${chargeToGroupId === g.id ? 'bg-purple-600/10 border-purple-500 text-white shadow-lg shadow-purple-500/10' : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                          >
                            <Users className="w-3 h-3" /> Team: {g.name}
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-500 italic mt-1">If a team is selected, the debt will be shared by all team members.</p>
                    </div>
                  )}

                  {adjustmentForm.watch('type') === AdjustmentType.PromotionalItem && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Select Item from Catalog</label>
                      <select 
                        {...adjustmentForm.register('promotionalItemId', { valueAsNumber: true })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none"
                      >
                        <option value="">Choose item...</option>
                        {catalogItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} (R {item.price})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Amount (R)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        {...adjustmentForm.register('totalAmount')}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-lg focus:ring-2 focus:ring-blue-500/50 outline-none" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300">Reference / Description</label>
                      <input 
                        {...adjustmentForm.register('description')}
                        placeholder="e.g. Broken Kettle replacement" 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingAdjustment}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    {submittingAdjustment ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    Confirm Adjustment
                  </button>
                </form>
              </div>

              {/* List Side */}
              <div className="w-full md:w-1/2 p-6 bg-slate-900/30 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Outstanding Debts</h4>
                  <div className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-[10px] font-black border border-red-500/20 uppercase tracking-tighter">
                    Total Due: R {outstandingAdjustments.reduce((sum, a) => sum + a.remainingBalance, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="space-y-3">
                  {loadingAdjustments ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Loading Records...</p>
                    </div>
                  ) : outstandingAdjustments.length > 0 ? (
                    /* Group by type */
                    Object.entries(outstandingAdjustments.reduce((acc, adj) => {
                      const type = adj.type;
                      if (!acc[type]) acc[type] = { type: type, total: 0, count: 0 };
                      acc[type].total += adj.remainingBalance;
                      acc[type].count += 1;
                      return acc;
                    }, {} as { [key: number]: { type: number, total: number, count: number } })).map(([typeStr, group]) => {
                      const type = parseInt(typeStr);
                      const typeLabel = ['Advance', 'Promotional Item', 'Damage', 'Maintenance', 'Event Fee', 'Other'][type] || 'Other';
                      
                      return (
                        <div key={type} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 ${
                              type === AdjustmentType.Advance ? 'bg-amber-500/10 text-amber-500' :
                              type === AdjustmentType.Damage ? 'bg-red-500/10 text-red-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>
                              {type === AdjustmentType.PromotionalItem ? <Package className="w-5 h-5" /> :
                               type === AdjustmentType.Advance ? <Wallet className="w-5 h-5" /> :
                               <Activity className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase tracking-tight">{typeLabel}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{group.count} Active {group.count === 1 ? 'Record' : 'Records'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-white">R {group.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 opacity-30">
                      <p className="text-xs font-black uppercase tracking-widest">Clear Account</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights Modal */}
      {showInsights && selectedAdvisor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-6xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">{selectedAdvisor.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-slate-400 font-mono text-sm tracking-widest uppercase">{selectedAdvisor.code}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedAdvisor.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowInsights(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all p-3 rounded-2xl border border-slate-700/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
              {loadingInsights ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                  <p className="font-bold uppercase tracking-widest text-xs">Analyzing Portfolio...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-3xl">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Policies</p>
                      <p className="text-3xl font-black text-white">{advisorSubmissions.length}</p>
                    </div>
                    <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-3xl">
                      <p className="text-green-500/60 text-[10px] font-black uppercase tracking-widest mb-1">Active Policies</p>
                      <p className="text-3xl font-black text-green-500">
                        {advisorSubmissions.filter(s => s.status === 'Active').length}
                      </p>
                    </div>
                    <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl">
                      <p className="text-red-500/60 text-[10px] font-black uppercase tracking-widest mb-1">Lapsed Policies</p>
                      <p className="text-3xl font-black text-red-500">
                        {advisorSubmissions.filter(s => s.status === 'Lapsed').length}
                      </p>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl">
                      <p className="text-blue-500/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Earnings</p>
                      <p className="text-3xl font-black text-blue-500">
                        R {advisorCommissions.reduce((sum, c) => sum + c.commissionAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-widest px-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> In-Force & Pending
                      </h4>
                      <div className="space-y-4">
                        {advisorSubmissions.filter(s => s.status !== 'Lapsed').map(s => (
                          <div key={s.id} className="bg-slate-800/20 border border-slate-700/30 p-5 rounded-2xl group">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-600/10 p-2 rounded-xl group-hover:bg-blue-600/20 transition-colors">
                                  <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-white font-bold">{s.applicantSurname}, {s.initials}</p>
                                  <p className="text-[10px] text-slate-500 font-mono">ID: {s.idNumber}</p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${s.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{s.status.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/50">
                              <div className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.date).toLocaleDateString()}</div>
                              <div className="text-white font-bold">R {s.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[9px] text-slate-500 font-normal">p/m</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-widest px-2">
                        <AlertCircle className="w-4 h-4 text-red-500" /> Lapsed & Commissions
                      </h4>
                      <div className="space-y-4">
                        {advisorSubmissions.filter(s => s.status === 'Lapsed').map(s => (
                          <div key={s.id} className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl grayscale hover:grayscale-0 transition-all opacity-60">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-500/10 p-2 rounded-xl"><FileText className="w-5 h-5 text-red-500" /></div>
                                <div><p className="text-slate-300 font-bold">{s.applicantSurname}, {s.initials}</p><p className="text-[10px] text-slate-600 font-mono">ID: {s.idNumber}</p></div>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">LAPSED</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
              <button onClick={() => setShowInsights(false)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl border border-slate-700/50 transition-all">Close Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Advisor Registration Modal */}
      {showAdvisorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-lg">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-white">{editingAdvisor ? 'Edit Advisor' : 'Register Advisor'}</h2>
              </div>
              <button onClick={() => setShowAdvisorModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={advisorForm.handleSubmit(onAdvisorSubmit)} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Full Name</label>
                <input {...advisorForm.register('name')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {advisorForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{advisorForm.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Email Address</label>
                <input {...advisorForm.register('email')} type="email" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {advisorForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{advisorForm.formState.errors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Advisor Code</label>
                  <input {...advisorForm.register('code')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                  {advisorForm.formState.errors.code && <p className="text-red-500 text-xs mt-1">{advisorForm.formState.errors.code.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Phone Number</label>
                  <input {...advisorForm.register('phoneNumber')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                  {advisorForm.formState.errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{advisorForm.formState.errors.phoneNumber.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Salesforce Name / Insurer Alias (Optional)</label>
                <input {...advisorForm.register('salesforceName')} placeholder="e.g. J. JOSPET, SMITH J" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                <p className="text-[10px] text-slate-500">Add any variations used by insurers to match statements when policy numbers cannot link automatically.</p>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Percent className="w-3 h-3" /> Payout Configurations</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">1st Year %</label>
                    <input {...advisorForm.register('commissionPercentage1stYear')} type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">2nd Year %</label>
                    <input {...advisorForm.register('commissionPercentage2ndYear')} type="number" step="0.1" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAdvisorModal(false)} className="flex-1 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submittingAdvisor} className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                  {submittingAdvisor ? <Loader2 className="w-5 h-5 animate-spin" /> : editingAdvisor ? 'Update Advisor' : 'Register Advisor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team Creation Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-purple-600/20 p-2 rounded-lg">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-white">{editingGroup ? 'Edit Team' : 'Create Team'}</h2>
              </div>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Team Name</label>
                <input {...groupForm.register('name')} placeholder="e.g., Alpha Group" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none" />
                {groupForm.formState.errors.name && <p className="text-red-500 text-xs mt-1">{groupForm.formState.errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Description</label>
                <textarea {...groupForm.register('description')} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none resize-none" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-300">Select Team Members</label>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{groupForm.watch('memberIds').length} Selected</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                  <input 
                    type="text" 
                    placeholder="Search advisors..." 
                    value={memberSearchTerm}
                    onChange={(e) => setMemberSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  />
                </div>

                <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {advisors.filter(a => 
                    a.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                    a.code.toLowerCase().includes(memberSearchTerm.toLowerCase())
                  ).map(advisor => {
                    const isSelected = groupForm.watch('memberIds').includes(advisor.id);
                    return (
                      <div 
                        key={advisor.id} 
                        onClick={() => {
                          const currentIds = groupForm.getValues('memberIds');
                          if (isSelected) {
                            groupForm.setValue('memberIds', currentIds.filter(id => id !== advisor.id));
                          } else {
                            groupForm.setValue('memberIds', [...currentIds, advisor.id]);
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-purple-600/10 border-purple-500/50 text-white' : 'bg-slate-950/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{advisor.name.charAt(0)}</div>
                          <div>
                            <p className="text-xs font-bold leading-none">{advisor.name}</p>
                            <p className="text-[9px] mt-1 font-mono uppercase opacity-50">{advisor.code}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-500" />}
                      </div>
                    );
                  })}
                </div>
                {groupForm.formState.errors.memberIds && <p className="text-red-500 text-xs mt-1">{groupForm.formState.errors.memberIds.message}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowGroupModal(false)} className="flex-1 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submittingGroup} className="flex-[2] bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2">
                  {submittingGroup ? <Loader2 className="w-5 h-5 animate-spin" /> : editingGroup ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-700/50 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-600/20 p-2 rounded-lg">
                  <Package className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Add Catalog Item</h2>
              </div>
              <button onClick={() => setShowCatalogModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={catalogForm.handleSubmit(onCatalogSubmit)} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Item Name</label>
                <input {...catalogForm.register('name')} placeholder="e.g., Blazer - Small" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Price (R)</label>
                <input {...catalogForm.register('price')} type="number" step="0.01" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Category</label>
                  <select {...catalogForm.register('category')} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none">
                    <option value="Uniform">Uniform</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">Sizes</label>
                  <input {...catalogForm.register('sizes')} placeholder="S, M, L, XL" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCatalogModal(false)} className="flex-1 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={submittingCatalogItem} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                  {submittingCatalogItem ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorsPage;
