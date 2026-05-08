import axios from 'axios';
import { auth } from './firebase';
import type { Submission, SubmissionCreateDto, PolicyPaymentCreateDto, Commission, Advisor } from './types';

const api = axios.create({
  baseURL: 'http://localhost:5137/api', // Match your actual API backend port
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
};

export const advisorsApi = {
  getAll: async () => {
    const response = await api.get<Advisor[]>('/Advisors');
    return response.data;
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
  handleLapse: async (submissionId: number) => {
    await api.post(`/Financials/submissions/${submissionId}/lapse`);
  },
};

export default api;
