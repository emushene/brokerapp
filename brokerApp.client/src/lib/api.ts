import axios from 'axios';
import { auth } from './firebase';
import type { Submission, SubmissionCreateDto, PolicyPaymentCreateDto, Commission, Advisor, CommissionStatement, AdvisorGroup, PromotionalItem, AccountAdjustment } from './types';

const api = axios.create({
  baseURL: '/api', // Use relative path for Vite dev proxy
});

// Interceptor to add Firebase JWT token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (tokenError) {
      console.error('Error getting auth token:', tokenError);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const submissionsApi = {
  getAll: async () => {
    const response = await api.get<Submission[]>('/Submissions/all');
    return response.data;
  },
  getAllPaged: async (page = 1, pageSize = 10) => {
    const response = await api.get<Submission[]>(`/Submissions/all?page=${page}&pageSize=${pageSize}`);
    return {
      items: response.data,
      totalCount: parseInt(response.headers['x-total-count'] || '0', 10)
    };
  },
  getByAdvisorId: async (advisorId: number) => {
    const response = await api.get<Submission[]>(`/Submissions/advisor/${advisorId}`);
    return response.data;
  },
  create: async (data: SubmissionCreateDto) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'advisorIds' && Array.isArray(value)) {
        value.forEach((id) => formData.append('advisorIds', id.toString()));
      } else if (key === 'applicationForm' && value instanceof File) {
        formData.append('applicationForm', value);
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await api.post<Submission>('/Submissions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadDocument: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Submission>(`/Submissions/${id}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  search: async (query: string) => {
    const response = await api.get<Submission[]>(`/Submissions/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
  searchPaged: async (query: string, page = 1, pageSize = 10) => {
    const response = await api.get<Submission[]>(`/Submissions/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`);
    return {
      items: response.data,
      totalCount: parseInt(response.headers['x-total-count'] || '0', 10)
    };
  },
};

export const advisorsApi = {
  getAll: async () => {
    const response = await api.get<Advisor[]>('/Advisors');
    return response.data;
  },
  getAdvisorSummary: async (id: number) => {
    const response = await api.get<any>(`/Advisors/${id}/summary`);
    return response.data;
  },
};

export const advisorGroupsApi = {
  getAll: async () => {
    const response = await api.get<any[]>('/AdvisorGroups');
    return response.data;
  },
  getById: async (id: number) => {
    const response = await api.get<any>(`/AdvisorGroups/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post<any>('/AdvisorGroups', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    await api.put(`/AdvisorGroups/${id}`, data);
  },
  delete: async (id: number) => {
    await api.delete(`/AdvisorGroups/${id}`);
  },
};

export const financialsApi = {
  recordPayment: async (payment: PolicyPaymentCreateDto) => {
    const response = await api.post<Commission>('/Financials/payments', payment);
    return response.data;
  },
  getCommissions: async (advisorId?: number) => {
    const params = advisorId ? { advisorId } : {};
    const response = await api.get<Commission[]>('/Financials/commissions', { params });
    return response.data;
  },
  markAsPaid: async (id: number, payoutReference: string) => {
    await api.post(`/Financials/commissions/${id}/pay`, payoutReference, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  markAdvisorStatementAsPaid: async (advisorId: number, statementId: number, payoutReference: string) => {
    await api.post(`/Financials/advisors/${advisorId}/statements/${statementId}/pay`, payoutReference, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },
  bulkSettle: async (data: { advisorId: number, statementId: number, payoutReference: string, deductions: { adjustmentId: number, amount: number }[] }) => {
    await api.post('/Financials/bulk-settle', data);
  },
  handleLapse: async (submissionId: number) => {
    await api.post(`/Financials/submissions/${submissionId}/lapse`);
  },
  importStatement: async (file: File, statementDate: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('statementDate', statementDate);
    const response = await api.post<CommissionStatement>('/Financials/import-statement', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getStatements: async () => {
    const response = await api.get<CommissionStatement[]>('/Financials/statements');
    return response.data;
  },
  getStatementDetails: async (id: number) => {
    const response = await api.get<CommissionStatement>(`/Financials/statements/${id}`);
    return response.data;
  },
  deleteStatement: async (id: number) => {
    await api.delete(`/Financials/statements/${id}`);
  },
  confirmStatementItem: async (id: number, data: { selectedAdvisorIds?: number[], advisorGroupId?: number }) => {
    await api.post(`/Financials/statement-items/${id}/confirm`, data);
  },
  confirmMovementItem: async (id: number, data: { selectedAdvisorIds?: number[], advisorGroupId?: number }) => {
    await api.post(`/Financials/movement-items/${id}/confirm`, data);
  },
  linkStatementItem: async (itemId: number, submissionId: number, selectedAdvisorIds?: number[], advisorGroupId?: number) => {
    await api.post(`/Financials/statement-items/${itemId}/link`, { submissionId, selectedAdvisorIds, advisorGroupId });
  },
  linkMovementItem: async (itemId: number, submissionId: number, selectedAdvisorIds?: number[], advisorGroupId?: number) => {
    await api.post(`/Financials/movement-items/${itemId}/link`, { submissionId, selectedAdvisorIds, advisorGroupId });
  },
  concludeStatement: async (id: number) => {
    await api.post(`/Financials/statements/${id}/conclude`);
  },
  getAdvisorPayslips: async (advisorId: number) => {
    const response = await api.get<any[]>(`/Financials/advisors/${advisorId}/payslips`);
    return response.data;
  },
  getPayslipDetails: async (advisorId: number, statementId: number) => {
    const response = await api.get<any>(`/Financials/advisors/${advisorId}/payslips/${statementId}`);
    return response.data;
  },
  getStatementPayslips: async (id: number) => {
    const response = await api.get<any>(`/Financials/statements/${id}/payslips`);
    return response.data;
  },
  getPromotionalItems: async () => {
    const response = await api.get<PromotionalItem[]>('/Financials/promotional-items');
    return response.data;
  },
  addPromotionalItem: async (item: Partial<PromotionalItem>) => {
    const response = await api.post<PromotionalItem>('/Financials/promotional-items', item);
    return response.data;
  },
  createAdjustment: async (adjustment: Partial<AccountAdjustment>) => {
    const response = await api.post<AccountAdjustment>('/Financials/adjustments', adjustment);
    return response.data;
  },
  getOutstandingAdjustments: async (params: { advisorId?: number, groupId?: number }) => {
    const response = await api.get<AccountAdjustment[]>('/Financials/adjustments/outstanding', { params });
    return response.data;
  },
  applyDeduction: async (adjustmentId: number, amount: number, statementId: number) => {
    await api.post(`/Financials/adjustments/${adjustmentId}/deduct`, { amount, statementId });
  },
  applyDeductionToType: async (advisorId: number, type: number, amount: number, statementId: number) => {
    await api.post(`/Financials/advisors/${advisorId}/adjustments/type/${type}/deduct`, { amount, statementId });
  },
};

export const syncApi = {
  trigger: async () => {
    const response = await api.post('/Sync/trigger');
    return response.data;
  },
};

export default api;
