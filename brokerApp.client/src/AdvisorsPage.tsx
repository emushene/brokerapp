import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Pencil, Trash2, Loader2 } from 'lucide-react';
import api from './lib/api';
import type { Advisor } from './lib/types';

const advisorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
});

type AdvisorFormValues = z.infer<typeof advisorSchema>;

const AdvisorsPage: React.FC = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingAdvisor, setEditingAdvisor] = useState<Advisor | null>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AdvisorFormValues>({
    resolver: zodResolver(advisorSchema),
  });

  const fetchAdvisors = async () => {
    try {
      const response = await api.get('/Advisors');
      setAdvisors(response.data);
    } catch (error) {
      console.error('Error fetching advisors', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors();
  }, []);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Financial Advisors</h1>
        <p className="text-slate-400 mt-2">Register and manage advisor profiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingAdvisor ? 'Edit Advisor' : 'Add New Advisor'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Full Name</label>
                <input {...register('name')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">Advisor Code</label>
                <input {...register('code')} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none" />
                {errors.code && <p className="text-red-500 text-xs">{errors.code.message}</p>}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : editingAdvisor ? 'Update' : 'Register'}
                </button>
                {editingAdvisor && (
                  <button
                    type="button"
                    onClick={() => { setEditingAdvisor(null); reset(); }}
                    className="px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-5">Name</th>
                  <th className="px-6 py-5">Code</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">Loading advisors...</td></tr>
                ) : advisors.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500">No advisors registered yet.</td></tr>
                ) : (
                  advisors.map((advisor) => (
                    <tr key={advisor.id} className="hover:bg-slate-700/20 transition-colors group">
                      <td className="px-6 py-5 font-bold text-white">{advisor.name}</td>
                      <td className="px-6 py-5 text-slate-300 font-mono text-sm">{advisor.code}</td>
                      <td className="px-6 py-5 text-right space-x-2">
                        <button
                          onClick={() => handleEdit(advisor)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(advisor.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvisorsPage;
