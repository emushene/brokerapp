import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FilePlus, Loader2, CheckCircle2, Check, ChevronDown, X, DollarSign, Calendar, Hash, Search, Upload, AlertTriangle, ExternalLink, FileText, Users } from 'lucide-react';
import { submissionsApi, advisorsApi, financialsApi, advisorGroupsApi } from './lib/api';
import { SubmissionType, PaymentMethod, SubmissionStatus } from './lib/types';
import type { Submission, Advisor, AdvisorGroup } from './lib/types';
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

// Validation Schema matching Backend
const submissionSchema = z.object({
  applicantSurname: z.string().min(1, 'Surname is required'),
  initials: z.string().min(1, 'Initials are required'),
  idNumber: z.string().regex(/^\d{13}$/, 'ID Number must be exactly 13 digits'),
  premium: z.number().positive('Premium must be greater than zero'),
  salaryRefNo: z.string().min(1, 'Salary Ref No is required'),
  applicantPhoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  type: z.nativeEnum(SubmissionType),
  method: z.nativeEnum(PaymentMethod),
  date: z.string().min(1, 'Date is required'),
  advisorIds: z.array(z.number()),
  advisorGroupId: z.number().optional(),
  applicationForm: z.instanceof(File).optional(),
}).refine((data) => {
  if (data.type === SubmissionType.Individual) {
    return data.advisorIds.length > 0;
  }
  return data.advisorIds.length > 0 || data.advisorGroupId !== undefined;
}, {
  message: "At least one advisor or a group must be selected",
  path: ["advisorIds"]
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availableAdvisors, setAvailableAdvisors] = useState<Advisor[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AdvisorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Server-side pagination state
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [presentAdvisorIds, setPresentAdvisorIds] = useState<number[]>([]);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [showLapseModal, setShowLapseModal] = useState(false);
  const [submissionToLapse, setSubmissionToLapse] = useState<Submission | null>(null);
  const [lapsing, setLapsing] = useState(false);

  // Document viewer modal
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  // File upload state for existing record
  const [uploadingDocId, setUploadingDocId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advisor Search Dropdown in form
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [advisorSearch, setAdvisorSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      type: SubmissionType.Individual,
      method: PaymentMethod.Salary,
      date: new Date().toISOString().split('T')[0],
      advisorIds: [],
    }
  });

  const selectedAdvisorIds = watch('advisorIds');
  const submissionType = watch('type');
  const paymentMethod = watch('method');
  const selectedFile = watch('applicationForm');

  const fetchSubmissions = async (page = currentPage, term = searchTerm) => {
    try {
      setLoading(true);
      if (term.trim()) {
        const result = await submissionsApi.searchPaged(term, page, pageSize);
        setSubmissions(result.items);
        setTotalCount(result.totalCount);
      } else {
        const result = await submissionsApi.getAllPaged(page, pageSize);
        setSubmissions(result.items);
        setTotalCount(result.totalCount);
      }
    } catch (error) {
      console.error('Error fetching submissions', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvisors = async () => {
    try {
      const data = await advisorsApi.getAll();
      setAvailableAdvisors(data);
    } catch (error) {
      console.error('Error fetching advisors', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await advisorGroupsApi.getAll();
      setAvailableGroups(data);
    } catch (error) {
      console.error('Error fetching groups', error);
    }
  };

  useEffect(() => {
    fetchSubmissions(1, '');
    fetchAdvisors();
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchSubmissions(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      fetchSubmissions(1, term);
    }, 500);
  };

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

  useEffect(() => {
    if (showPdfModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPdfModal]);

  const openPdfViewer = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPdfUrl(url);
    setShowPdfModal(true);
  };

  const onSubmit = async (data: SubmissionFormValues) => {
    setSubmitting(true);
    try {
      await submissionsApi.create({
        ...data,
        status: SubmissionStatus.Submitted
      });
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

  const handleRecordPayment = async () => {
    if (!selectedSubmission || !paymentAmount) return;
    setRecordingPayment(true);
    
    // Autogenerate reference if not provided
    const finalRef = paymentRef || `INS-${selectedSubmission.applicantSurname.toUpperCase()}-${new Date().toISOString().slice(2,10).replace(/-/g, '')}-${selectedSubmission.id}`;
    
    try {
      await financialsApi.recordPayment({
        submissionId: selectedSubmission.id,
        amountReceived: parseFloat(paymentAmount),
        dateReceived: new Date().toISOString(),
        reference: finalRef,
        selectedAdvisorIds: presentAdvisorIds
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPresentAdvisorIds([]);
      fetchSubmissions();
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setRecordingPayment(false);
    }
  };

  useEffect(() => {
    if (showPaymentModal && selectedSubmission) {
      if (!paymentRef) {
        const dateStr = new Date().toISOString().slice(2,10).replace(/-/g, '');
        setPaymentRef(`INS-${selectedSubmission.applicantSurname.toUpperCase()}-${dateStr}-${selectedSubmission.id}`);
      }
      // Default to all advisors being present
      setPresentAdvisorIds(selectedSubmission.advisors.map(a => a.id));
    }
  }, [showPaymentModal, selectedSubmission]);

  const handleLapseSubmission = async () => {
    if (!submissionToLapse) return;
    setLapsing(true);
    try {
      await financialsApi.handleLapse(submissionToLapse.id);
      setShowLapseModal(false);
      setSubmissionToLapse(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error lapsing submission:', error);
    } finally {
      setLapsing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingDocId === null) return;

    try {
      setLoading(true);
      await submissionsApi.uploadDocument(uploadingDocId, file);
      fetchSubmissions();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploadingDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
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

  const columns: Column<Submission>[] = [
    {
      header: 'Applicant',
      accessor: (s) => (
        <div>
          <div className="font-bold text-white">{s.applicantSurname}, {s.initials}</div>
          <div className="text-[10px] text-slate-500">{s.applicantPhoneNumber}</div>
        </div>
      ),
      sortAccessor: (s) => `${s.applicantSurname} ${s.initials} ${s.applicantPhoneNumber}`
    },
    {
      header: 'ID & Type',
      accessor: (s) => (
        <div>
          <div className="text-slate-300 font-mono text-xs">{s.idNumber}</div>
          <div className="text-[10px] text-slate-500 uppercase">{s.type}</div>
        </div>
      ),
      sortAccessor: (s) => `${s.idNumber} ${s.type}`
    },
    {
      header: 'Method',
      accessor: (s) => (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${
          s.method === 'Salary' 
            ? 'bg-slate-800 text-blue-400 border-blue-500/30' 
            : 'bg-slate-800 text-green-400 border-green-500/30'
        }`}>
          {s.method}
        </span>
      ),
      sortAccessor: (s) => s.method,
      className: 'w-24'
    },
    {
      header: 'Premium',
      accessor: (s) => (
        <div>
          <div className="font-bold text-green-500 text-xs">R {s.premium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-slate-500 uppercase">Ref: {s.salaryRefNo}</div>
        </div>
      ),
      sortAccessor: (s) => `${s.premium} ${s.salaryRefNo}`
    },
    {
      header: 'Advisors',
      accessor: (s) => (
        <div className="flex flex-col gap-1">
          {s.advisorGroupName && (
            <div className="flex items-center gap-1.5 text-purple-400 font-bold text-[10px] mb-1">
               <Users className="w-3 h-3" />
               {s.advisorGroupName}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {s.advisors.map(a => (
              <span key={a.id} title={a.code} className="inline-flex items-center gap-0.5 bg-slate-900/50 border border-slate-700 text-[9px] text-slate-300 px-1.5 py-0.5 rounded">
                {a.name.split(' ')[0]}
              </span>
            ))}
          </div>
        </div>
      ),
      sortAccessor: (s) => `${s.advisorGroupName || ''} ${s.advisors.map(a => `${a.name} ${a.code}`).join(' ')}`
    },
    {
      header: 'Documents',
      accessor: (s) => (
        s.documents && s.documents.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
            {[...s.documents].sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime()).map(doc => (
              <a 
                key={doc.id}
                href={doc.fileUrl} 
                onClick={(e) => openPdfViewer(e, doc.fileUrl)}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors py-0.5 group"
                title={`Modified: ${new Date(doc.dateModified).toLocaleString()}`}
              >
                <div className="bg-blue-500/10 p-1 rounded group-hover:bg-blue-500/20">
                  <FileText className="w-3 h-3" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold truncate max-w-[120px] leading-tight" title={doc.fileName}>{doc.fileName}</span>
                  <span className="text-[8px] text-slate-500 leading-tight">{new Date(doc.dateModified).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-600">
             <div className="bg-slate-800 p-1 rounded">
               <FilePlus className="w-3 h-3 opacity-20" />
             </div>
             <span className="text-[10px] italic">Pending Scan</span>
          </div>
        )
      ),
      sortAccessor: (s) => s.documents?.length || 0,
      className: 'w-40'
    },
    {
      header: 'Policy Status',
      accessor: (s) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${
          s.status === 'Active' 
            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
            : s.status === 'Submitted'
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            : s.status === 'Lapsed'
            ? 'bg-red-500/20 text-red-400 border-red-500/30'
            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        }`}>
          {s.status}
        </span>
      ),
      sortAccessor: (s) => s.status,
      className: 'w-24 text-right'
    }
  ];

  const actions = [
    {
      icon: <Upload className="w-4 h-4" />,
      label: 'Upload Scan',
      onClick: (s: Submission) => {
        setUploadingDocId(s.id);
        fileInputRef.current?.click();
      },
      className: 'text-green-400 hover:bg-green-400/10'
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Pay',
      onClick: (s: Submission) => {
        setSelectedSubmission(s);
        setShowPaymentModal(true);
      },
      className: 'text-blue-400 hover:bg-blue-400/10'
    },
    {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Lapse',
      onClick: (s: Submission) => {
        setSubmissionToLapse(s);
        setShowLapseModal(true);
      },
      className: 'text-red-400 hover:bg-red-400/10'
    }
  ];

  return (
    <div className="space-y-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept="application/pdf,image/*"
      />
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
            
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-700/50 mb-2">
              <div className="space-y-4">
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

              <div className="space-y-4">
                <label className="text-sm font-bold text-green-400 uppercase tracking-wider">Payment Method</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setValue('method', PaymentMethod.Salary)}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === PaymentMethod.Salary
                        ? 'bg-green-600/10 border-green-500 text-white shadow-lg shadow-green-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === PaymentMethod.Salary ? 'border-white' : 'border-slate-700'}`}>
                      {paymentMethod === PaymentMethod.Salary && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold">Salary</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('method', PaymentMethod.BankDebit)}
                    className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === PaymentMethod.BankDebit
                        ? 'bg-green-600/10 border-green-500 text-white shadow-lg shadow-green-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === PaymentMethod.BankDebit ? 'border-white' : 'border-slate-700'}`}>
                      {paymentMethod === PaymentMethod.BankDebit && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold">Bank Debit</span>
                  </button>
                </div>
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

            <div className="md:col-span-2 lg:col-span-3 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300">
                    {submissionType === SubmissionType.Individual ? 'Select Advisor' : 'Individual Advisors (Joint Policy)'}
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

                {submissionType === SubmissionType.Group && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Assign to Advisor Group (Optional)</label>
                    <div className="relative">
                      <select 
                        {...register('advisorGroupId', { valueAsNumber: true })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none"
                      >
                        <option value="">No Group Assignment</option>
                        {availableGroups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-500">If assigned to a group, all members will be linked.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-1 space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                Scan Application Form
              </label>
              <div className="relative group">
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setValue('applicationForm', file, { shouldValidate: true });
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full bg-slate-900 border-2 border-dashed rounded-xl px-4 py-3 text-white flex items-center gap-3 transition-all ${
                  selectedFile ? 'border-blue-500 bg-blue-500/5' : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <div className={`p-2 rounded-lg ${selectedFile ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm font-medium truncate ${selectedFile ? 'text-blue-400' : 'text-slate-500'}`}>
                      {selectedFile ? selectedFile.name : 'Upload scanned form...'}
                    </span>
                    <span className="text-[10px] text-slate-600">PDF or Image up to 10MB</span>
                  </div>
                  {selectedFile && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setValue('applicationForm', undefined);
                      }}
                      className="ml-auto p-1 hover:bg-slate-800 rounded-md text-slate-500 hover:text-white z-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              {errors.applicationForm && <p className="text-red-500 text-xs">{errors.applicationForm.message as string}</p>}
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

      <DataTable
        data={submissions}
        columns={columns}
        loading={loading}
        onSearch={handleSearch}
        searchPlaceholder="Search applicants, ID numbers, or references..."
        serverSide={true}
        totalItems={totalCount}
        currentPage={currentPage}
        onPageChange={(page) => setCurrentPage(page)}
        pageSize={pageSize}
      />

      {/* Payment Modal */}
      {showPaymentModal && selectedSubmission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Record Payment</h3>
                <p className="text-slate-400 text-sm">Insurer payout for {selectedSubmission.applicantSurname}</p>
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">
                  <span>Policy ID</span>
                  <span>Method</span>
                </div>
                <div className="flex items-center justify-between text-white font-bold">
                  <span>#{selectedSubmission.id}</span>
                  <span className="bg-blue-600 px-2 py-0.5 rounded text-[10px]">{selectedSubmission.method}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Amount Received from Insurer (R)
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-600" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-blue-500" />
                    Payment Reference
                  </label>
                  <input 
                    type="text" 
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. INV-2024-001"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-600" 
                  />
                </div>

                {selectedSubmission.advisors.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Present Advisors (Commission Recipients)
                    </label>
                    <div className="grid grid-cols-1 gap-2 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                      {selectedSubmission.advisors.map(advisor => {
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
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                              isPresent ? 'bg-blue-600/10 border-blue-500/30 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isPresent ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-600'}`}>
                                 {advisor.name.charAt(0)}
                               </div>
                               <div>
                                 <p className="text-xs font-bold">{advisor.name}</p>
                                 <p className="text-[9px] font-mono uppercase opacity-50">{advisor.code}</p>
                               </div>
                            </div>
                            {isPresent && <Check className="w-4 h-4 text-blue-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-800/50 rounded-lg">
                  <Calendar className="w-3 h-3" />
                  Payment date will be recorded as today.
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/30 border-t border-slate-800">
              <button
                onClick={handleRecordPayment}
                disabled={recordingPayment || !paymentAmount}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {recordingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment & Calculate Commission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lapse Modal */}
      {showLapseModal && submissionToLapse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Lapse Policy</h3>
                <p className="text-slate-400 text-sm">Policy for {submissionToLapse.applicantSurname}</p>
              </div>
              <button 
                onClick={() => setShowLapseModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 text-center">
              <div className="bg-red-600/10 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-white font-bold mb-2 text-lg">Are you sure?</p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Lapsing this policy will mark it as inactive. <br/>
                  <span className="text-red-400 font-bold">ALL commissions paid so far will be clawed back</span> from the assigned advisors.
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex gap-4">
              <button
                onClick={() => setShowLapseModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLapseSubmission}
                disabled={lapsing}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {lapsing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Lapse & Clawback'}
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
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Application Form / Scan</p>
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
    </div>
  );
};

export default SubmissionsPage;
