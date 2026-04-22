export const SubmissionType = {
  Individual: 0,
  Group: 1,
} as const;

export type SubmissionType = (typeof SubmissionType)[keyof typeof SubmissionType];

export interface Advisor {
  id: number;
  name: string;
  code: string;
}

export interface Submission {
  id: number;
  applicantSurname: string;
  initials: string;
  idNumber: string;
  premium: number;
  salaryRefNo: string;
  applicantPhoneNumber: string;
  type: string; // From backend enum as string
  date: string;
  advisors: Advisor[];
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
  date: string;
  advisorIds: number[];
}
