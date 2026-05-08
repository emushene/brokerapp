export const SubmissionType = {
  Individual: 0,
  Group: 1,
} as const;

export type SubmissionType = (typeof SubmissionType)[keyof typeof SubmissionType];

export const PaymentMethod = {
  Salary: 0,
  BankDebit: 1,
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const SubmissionStatus = {
  Submitted: 0,
  Active: 1,
  Lapsed: 2,
  Cancelled: 3,
} as const;

export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export interface Advisor {
  id: number;
  name: string;
  code: string;
  phoneNumber: string;
}

export interface SubmissionDocument {
  id: number;
  storageKey: string;
  fileName: string;
  fileUrl: string;
  dateModified: string;
}

export interface Submission {
  id: number;
  applicantSurname: string;
  initials: string;
  idNumber: string;
  premium: number;
  salaryRefNo: string;
  applicantPhoneNumber: string;
  type: string;
  method: string;
  status: string;
  date: string;
  advisors: Advisor[];
  documents: SubmissionDocument[];
  createdAt: string;
}

export interface SubmissionCreateDto {
  applicantSurname: string;
  initials: string;
  idNumber: string;
  premium: number;
  salaryRefNo: string;
  applicantPhoneNumber: string;
  type: SubmissionType;
  method: PaymentMethod;
  status: SubmissionStatus;
  date: string;
  fileUrl?: string;
  advisorIds: number[];
  applicationForm?: File;
}

export interface PolicyPaymentCreateDto {
  submissionId: number;
  amountReceived: number;
  dateReceived: string;
  reference: string;
}

export interface Commission {
  id: number;
  policyPaymentId?: number;
  amountReceived: number;
  reference: string;
  advisorId: number;
  advisorName: string;
  applicantSurname: string;
  applicantInitials: string;
  commissionAmount: number;
  dateCalculated: string;
  isPaid: boolean;
  datePaid?: string;
  payoutReference?: string;
}
