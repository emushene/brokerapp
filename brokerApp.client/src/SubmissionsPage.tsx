import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FilePlus, Search, Filter, Loader2, CheckCircle2 } from 'lucide-react';
import api from './lib/api';

// Validation Schema matching Backend
const submissionSchema = z.object({
  applicantSurname: z.string().min(1, 'Surname is required'),
  initials: z.string().min(1, 'Initials are required'),
  idNumber: z.string().regex(/^\d{13}$/, 'ID Number must be exactly 13 digits'),
  premium: z.number().positive('Premium must be greater than zero'),
  salaryRefNo: z.string().min(1, 'Salary Ref No is required'),
  applicantPhoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  date: z.string().min(1, 'Date is required'),
  intermediaryName: z.string().min(1, 'Intermediary Name is required'),
  intermediaryCode: z.string().min(1, 'Intermediary Code is required'),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface Submission extends SubmissionFormValues {
  id: number;
  createdAt: string;
}

const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    }
  });

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

  useEffect(() => {
    fetchSubmissions();
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
      console.error('Error creating submission', error);
    } finally {
      setSubmitting(false);
    }
  };

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
            {/* Applicant Details */}
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

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Intermediary Name</label>
              <input {...register('intermediaryName')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.intermediaryName && <p className="text-red-500 text-xs">{errors.intermediaryName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Intermediary Code</label>
              <input {...register('intermediaryCode')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
              {errors.intermediaryCode && <p className="text-red-500 text-xs">{errors.intermediaryCode.message}</p>}
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
                <th className="px-6 py-5">Applicant Details</th>
                <th className="px-6 py-5">ID Number</th>
                <th className="px-6 py-5">Premium</th>
                <th className="px-6 py-5">Contact</th>
                <th className="px-6 py-5">Intermediary</th>
                <th className="px-6 py-5">Date Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Fetching submissions...</td></tr>
              ) : submissions.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No submissions found.</td></tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="text-slate-500 text-xs font-mono">#{s.id}</span>
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
                      <div className="text-white text-sm font-medium">{s.intermediaryName}</div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">CODE: {s.intermediaryCode}</div>
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
