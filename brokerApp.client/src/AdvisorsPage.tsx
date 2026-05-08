import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Pencil, Trash2, Loader2, Phone, UserPlus, BarChart3, X, FileText, CheckCircle2, AlertCircle, Clock, DollarSign } from 'lucide-react';
import api, { advisorsApi, submissionsApi, financialsApi } from './lib/api';
import type { Advisor, Submission, Commission } from './lib/types';
import { DataTable } from './components/DataTable';
import type { Column } from './components/DataTable';

const advisorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
});

type AdvisorFormValues = z.infer<typeof advisorSchema>;

const AdvisorsPage: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);

  // Modal State
  const [showInsights, setShowInsights] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [advisorSubmissions, setAdvisorSubmissions] = useState<Submission[]>([]);
  const [advisorCommissions, setAdvisorCommissions] = useState<Commission[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AdvisorFormValues>({
    resolver: zodResolver(advisorSchema),
    defaultValues: {
      name: '',
      code: '',
      phoneNumber: '',
    }
  });

  const fetchAdvisors = async () => {
    try {
      setLoading(true);
      const data = await advisorsApi.getAll();
      setAdvisors(data);
    } catch (error) {
      console.error('Error fetching advisors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

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

  const onSubmit = async (data: AdvisorFormValues) => {
    setSubmitting(true);
    try {
      if (editingAdvisor) {
        await api.put(`/Advisors/${editingAdvisor.id}`, data);
      } else {
        await api.post('/Advisors', data);
      }
      reset();
      setEditingAdvisor(null);
      fetchAdvisors();
    } catch (error) {
      console.error('Error saving advisor:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (advisor: Advisor) => {
    setEditingAdvisor(advisor);
    setValue('name', advisor.name);
    setValue('code', advisor.code);
    setValue('phoneNumber', advisor.phoneNumber);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this advisor?')) return;
    try {
      await api.delete(`/Advisors/${id}`);
      fetchAdvisors();
    } catch (error) {
      console.error('Error deleting advisor:', error);
    }
  };

  const columns: Column<Advisor>[] = [
    {
      header: 'Profile',
      accessor: (advisor) => (
        <div>
          <div className="font-bold text-white">{advisor.name}</div>
          <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Code: {advisor.code}</div>
        </div>
      )
    },
    {
      header: 'Phone Number',
      accessor: (advisor) => (
        <div className="flex items-center gap-2 text-slate-300">
          <Phone className="w-3 h-3 text-slate-500" />
          {advisor.phoneNumber}
        </div>
      )
    }
  ];

  const actions = [
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Insights',
      onClick: handleShowInsights,
      className: 'text-purple-400 hover:bg-purple-400/10'
    },
    {
      icon: <Pencil className="w-4 h-4" />,
      label: 'Edit',
      onClick: handleEdit,
      className: 'text-slate-400 hover:text-blue-400 hover:bg-blue-400/10'
    },
    {
      icon: <Trash2 className="w-4 h-4" />,
      label: 'Delete',
      onClick: (advisor: Advisor) => handleDelete(advisor.id),
      className: 'text-slate-400 hover:text-red-400 hover:bg-red-400/10'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Advisors</h1>
        <p className="text-slate-400 mt-2">Manage advisor profiles and track their portfolio performance.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="xl:col-span-4">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 sticky top-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <UserPlus className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {editingAdvisor ? 'Edit Advisor' : 'Register Advisor'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Full Name</label>
                <input {...register('name')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Advisor Code</label>
                <input {...register('code')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Phone Number</label>
                <input {...register('phoneNumber')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber.message}</p>}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingAdvisor ? 'Update Advisor' : 'Register Advisor'}
                </button>
                {editingAdvisor && (
                  <button
                    type="button"
                    onClick={() => { setEditingAdvisor(null); reset(); }}
                    className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="xl:col-span-8">
          <DataTable
            data={advisors}
            columns={columns}
            actions={actions}
            loading={loading}
            searchPlaceholder="Search advisors by name or code..."
          />
        </div>
      </div>

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
                  {/* Advisor Stats Grid */}
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
                        R {advisorCommissions.reduce((sum, c) => sum + c.commissionAmount, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Policy Grouping */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Active & Submitted */}
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-widest px-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        In-Force & Pending
                      </h4>
                      <div className="space-y-4">
                        {advisorSubmissions.filter(s => s.status !== 'Lapsed').length > 0 ? (
                          advisorSubmissions.filter(s => s.status !== 'Lapsed').map(s => (
                            <div key={s.id} className="bg-slate-800/20 border border-slate-700/30 p-5 rounded-2xl hover:border-slate-600 transition-colors group">
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
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                  s.status === 'Active' 
                                    ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {s.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800/50">
                                <div className="text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(s.date).toLocaleDateString()}
                                </div>
                                <div className="text-white font-bold">R {s.premium.toLocaleString()} <span className="text-[9px] text-slate-500 font-normal">p/m</span></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center bg-slate-800/10 border border-dashed border-slate-700/50 rounded-2xl text-slate-600 text-sm">
                            No active policies found.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Lapsed & Commissions */}
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-2 text-sm font-black text-slate-300 uppercase tracking-widest px-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Lapsed & Commissions
                      </h4>
                      
                      <div className="space-y-4">
                        {advisorSubmissions.filter(s => s.status === 'Lapsed').map(s => (
                          <div key={s.id} className="bg-red-500/5 border border-red-500/10 p-5 rounded-2xl grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-500/10 p-2 rounded-xl">
                                  <FileText className="w-5 h-5 text-red-500" />
                                </div>
                                <div>
                                  <p className="text-slate-300 font-bold">{s.applicantSurname}, {s.initials}</p>
                                  <p className="text-[10px] text-slate-600 font-mono">ID: {s.idNumber}</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                LAPSED
                              </span>
                            </div>
                          </div>
                        ))}

                        {/* Recent Earnings Mini-List */}
                        <div className="mt-8 space-y-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Commission History</p>
                          {advisorCommissions.slice(0, 5).map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 bg-slate-800/10 border border-slate-800 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${c.isPaid ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                  <DollarSign className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs text-white font-bold">{c.applicantSurname}</p>
                                  <p className="text-[9px] text-slate-500">{new Date(c.dateCalculated).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-black ${c.commissionAmount < 0 ? 'text-red-500' : 'text-blue-400'}`}>
                                  R {c.commissionAmount.toLocaleString()}
                                </p>
                                <p className="text-[8px] text-slate-600 uppercase font-bold">{c.isPaid ? 'Paid' : 'Due'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
              <p className="text-[10px] text-slate-500 max-w-md">
                This dashboard shows a consolidated view of the advisor's performance based on recorded submissions and financials.
              </p>
              <button 
                onClick={() => setShowInsights(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-3 rounded-xl border border-slate-700/50 transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorsPage;
