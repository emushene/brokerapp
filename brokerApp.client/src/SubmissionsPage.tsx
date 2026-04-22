import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FilePlus, Search, Filter, Loader2, CheckCircle2, Users, Check, ChevronDown, X } from 'lucide-react';
import api from './lib/api';
import { SubmissionType } from './lib/types';
import type { Submission, Advisor } from './lib/types';

// Validation Schema matching Backend
const submissionSchema = z.object({
  applicantSurname: z.string().min(1, 'Surname is required'),
  initials: z.string().min(1, 'Initials are required'),
  idNumber: z.string().regex(/^\d{13}$/, 'ID Number must be exactly 13 digits'),
  premium: z.number().positive('Premium must be greater than zero'),
  salaryRefNo: z.string().min(1, 'Salary Ref No is required'),
  applicantPhoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  type: z.nativeEnum(SubmissionType),
  date: z.string().min(1, 'Date is required'),
  advisorIds: z.array(z.number()).min(1, 'At least one advisor must be selected'),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availableAdvisors, setAvailableAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [advisorSearch, setAdvisorSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      type: SubmissionType.Individual,
      date: new Date().toISOString().split('T')[0],
      advisorIds: [],
    }
  });

  const selectedAdvisorIds = watch('advisorIds');
  const submissionType = watch('type');

  const fetchSubmissions = async () => {
    try {
      const response = await api.get('/Submissions/all');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submissions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisors = async () => {
    try {
      const response = await api.get('/Advisors');
      setAvailableAdvisors(response.data);
    } catch (error) {
      console.error('Error fetching advisors', error);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchAdvisors();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = async (data: SubmissionFormValues) => {
    setSubmitting(true);
    try {
      await api.post('/Submissions', data);
      setSuccess(true);
      reset();
      fetchSubmissions();
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (error) {
      console.error('Error creating submission:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAdvisor = (id: number) => {
    const current = selectedAdvisorIds || [];
    if (submissionType === SubmissionType.Individual) {
      setValue('advisorIds', [id], { shouldValidate: true });
      setIsDropdownOpen(false);
    } else {
      if (current.includes(id)) {
        setValue('advisorIds', current.filter(aid => aid !== id), { shouldValidate: true });
      } else {
        setValue('advisorIds', [...current, id], { shouldValidate: true });
      }
    }
  };

  const filteredAdvisors = availableAdvisors.filter(a => 
    a.name.toLowerCase().includes(advisorSearch.toLowerCase()) || 
    a.code.toLowerCase().includes(advisorSearch.toLowerCase())
  );

  const selectedAdvisorsData = availableAdvisors.filter(a => selectedAdvisorIds.includes(a.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Policy Submissions</h1>
          <p className="text-slate-400 mt-2">Manage and track your policy applications.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
        >
          {showForm ? 'Cancel' : (
            <>
              <FilePlus className="w-5 h-5" />
              New Submission
            </>
          )}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-bold text-white mb-6">Create New Submission</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="md:col-span-2 lg:col-span-3 space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-2">
              <label className="text-sm font-bold text-blue-400 uppercase tracking-wider">Submission Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setValue('type', SubmissionType.Individual);
                    setValue('advisorIds', []);
                  }}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    submissionType === SubmissionType.Individual
                      ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${submissionType === SubmissionType.Individual ? 'border-white' : 'border-slate-700'}`}>
                    {submissionType === SubmissionType.Individual && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="font-bold">Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue('type', SubmissionType.Group);
                    setValue('advisorIds', []);
                  }}
                  className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    submissionType === SubmissionType.Group
                      ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${submissionType === SubmissionType.Group ? 'border-white' : 'border-slate-700'}`}>
                    {submissionType === SubmissionType.Group && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="font-bold">Group (Joint)</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Applicant Surname</label>
              <input {...register('applicantSurname')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.applicantSurname && <p className="text-red-500 text-xs">{errors.applicantSurname.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Initials</label>
              <input {...register('initials')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.initials && <p className="text-red-500 text-xs">{errors.initials.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Government ID Number (13 Digits)</label>
              <input {...register('idNumber')} placeholder="e.g. 9001015000081" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.idNumber && <p className="text-red-500 text-xs">{errors.idNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Monthly Premium (R)</label>
              <input type="number" step="0.01" {...register('premium', { valueAsNumber: true })} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.premium && <p className="text-red-500 text-xs">{errors.premium.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Salary Ref No</label>
              <input {...register('salaryRefNo')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.salaryRefNo && <p className="text-red-500 text-xs">{errors.salaryRefNo.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Phone Number</label>
              <input {...register('applicantPhoneNumber')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.applicantPhoneNumber && <p className="text-red-500 text-xs">{errors.applicantPhoneNumber.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Date</label>
              <input type="date" {...register('date')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
            </div>

            <div className="md:col-span-2 lg:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-300">
                {submissionType === SubmissionType.Individual ? 'Select Advisor' : 'Select Advisors (Joint Policy)'}
              </label>
              
              <div className="relative" ref={dropdownRef}>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer flex items-center justify-between min-h-[50px]"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAdvisorsData.length > 0 ? (
                      selectedAdvisorsData.map(advisor => (
                        <span key={advisor.id} className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          {advisor.name}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-white/70" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAdvisor(advisor.id);
                            }}
                          />
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500 text-sm">Choose advisors...</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-700">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input 
                          autoFocus
                          placeholder="Search advisors..."
                          value={advisorSearch}
                          onChange={(e) => setAdvisorSearch(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
                      {filteredAdvisors.length > 0 ? (
                        filteredAdvisors.map(advisor => {
                          const isSelected = selectedAdvisorIds.includes(advisor.id);
                          return (
                            <div
                              key={advisor.id}
                              onClick={() => toggleAdvisor(advisor.id)}
                              className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{advisor.name}</span>
                                <span className="text-[10px] opacity-50 font-mono tracking-wider">{advisor.code}</span>
                              </div>
                              {isSelected && <Check className="w-4 h-4" />}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-500 text-sm">No advisors found.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.advisorIds && <p className="text-red-500 text-xs">{errors.advisorIds.message}</p>}
            </div>

            <div className="md:col-span-2 lg:col-span-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  success ? <CheckCircle2 className="w-5 h-5" /> : 'Submit Application'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-800/20 p-4 rounded-2xl border border-slate-700/30">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input placeholder="Search applicants..." className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:ring-2 focus:ring-blue-500/50" />
        </div>
        <button className="flex items-center gap-2 bg-slate-800 text-slate-300 px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Submissions Table */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-5">ID</th>
                <th className="px-6 py-5">Type</th>
                <th className="px-6 py-5">Applicant Details</th>
                <th className="px-6 py-5">ID Number</th>
                <th className="px-6 py-5">Premium</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Advisors</th>
                <th className="px-6 py-5">Date Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Fetching submissions...</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No submissions found.</td></tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-slate-500 text-xs font-mono">#{s.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
                        s.type === 'Group' 
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-white">{s.applicantSurname}, {s.initials}</div>
                      <div className="text-xs text-slate-500 mt-1 uppercase">Ref: {s.salaryRefNo}</div>
                    </td>
                    <td className="px-6 py-5 text-slate-300 font-mono text-sm">{s.idNumber}</td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-green-500">R {s.premium.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-5 text-slate-400 text-sm">{s.applicantPhoneNumber}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-1">
                        {s.advisors.map(a => (
                          <span key={a.id} className="inline-flex items-center gap-1 bg-slate-900/50 border border-slate-700 text-[10px] text-slate-300 px-2 py-1 rounded-md">
                            <Users className="w-3 h-3" />
                            {a.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString()}
                      <div className="text-[10px] opacity-50">{new Date(s.createdAt).toLocaleTimeString()}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubmissionsPage;
