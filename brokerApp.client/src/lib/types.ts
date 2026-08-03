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
  email: string;
  code: string;
  phoneNumber: string;
  commissionPercentage1stYear: number;
  commissionPercentage2ndYear: number;
  salesforceName?: string;
}

export interface AdvisorGroup {
  id: number;
  name: string;
  description: string;
  memberIds: number[];
  members?: Advisor[];
}

export interface AdvisorGroupDto {
  id?: number;
  name: string;
  description: string;
  memberIds: number[];
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
  advisorGroupId?: number;
  advisorGroupName?: string;
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
  advisorGroupId?: number;
  applicationForm?: File;
}

export interface PolicyPaymentCreateDto {
  submissionId: number;
  amountReceived: number;
  dateReceived: string;
  reference: string;
  selectedAdvisorIds?: number[];
}

export interface Commission {
  id: number;
  policyPaymentId?: number;
  commissionStatementId?: number;
  accountAdjustmentId?: number;
  amountReceived: number;
  reference: string;
  advisorId: number;
  advisorName: string;
  applicantSurname: string;
  applicantInitials: string;
  commissionAmount: number;
  grossCommission?: number;
  commissionRetention?: number;
  clawBackGross?: number;
  clawBackRetention?: number;
  nettCommission?: number;
  splitPercentage?: number;
  product?: string;
  policyNumber?: string;
  premium?: number;
  dateCalculated: string;
  isPaid: boolean;
  datePaid?: string;
  payoutReference?: string;
  fileUrl?: string;
}

export interface StatementItem {
  id: number;
  clientName: string;
  policyNumber: string;
  product?: string;
  commissionType: string;
  commissionSubType: string;
  amount: number;
  premium: number;
  category?: string;
  salesForceName?: string;
  clawBack?: number;
  clawBackRetention?: number;
  clawBackReason?: string;
  matchedSubmissionId?: number;
  matchedSubmission?: Submission;
  advisorName?: string;
  fileUrl?: string;
  googleDriveLink?: string;
  isMatched: boolean;
  isConfirmed: boolean;
}

export interface MovementItem {
  id: number;
  policyNumber: string;
  clientName: string;
  movementType: string;
  effectiveDate?: string;
  premium: number;
  category?: string;
  matchedSubmissionId?: number;
  matchedSubmission?: Submission;
  advisorName?: string;
  fileUrl?: string;
  googleDriveLink?: string;
  isMatched: boolean;
  isConfirmed: boolean;
}

export interface UnpayablePolicyItem {
  id: number;
  policyNumber: string;
  policyId?: string;
  clientName: string;
  clientMobile?: string;
  premium: number;
  premiumBalance: number;
  reason: string;
  policyStatus?: string;
  paymethod?: string;
  capturedDate?: string;
  inceptionDate?: string;
  matchedSubmissionId?: number;
  matchedSubmission?: Submission;
  advisorName?: string;
  isMatched: boolean;
}

export interface CommissionStatement {
  id: number;
  fileName: string;
  fileUrl?: string;
  googleSheetUrl?: string;
  statementDate: string;
  uploadDate: string;
  totalCommission: number;
  totalRows: number;
  matchedRows: number;
  status: string;
  emailSentDate?: string;
  items: StatementItem[];
  movementItems: MovementItem[];
  unpayableItems?: UnpayablePolicyItem[];
}

export interface WeeklyStats {
  weekStarting: string;
  weekLabel: string;
  submissionCount: number;
  totalPremium: number;
}

export interface AdvisorPerformance {
  advisorId: number;
  advisorName: string;
  weeklyStats: WeeklyStats[];
}

export const AdjustmentType = {
  Advance: 0,
  PromotionalItem: 1,
  Damage: 2,
  Maintenance: 3,
  EventFee: 4,
  Other: 5
} as const;

export type AdjustmentType = (typeof AdjustmentType)[keyof typeof AdjustmentType];

export const AdjustmentStatus = {
  Pending: 0,
  PartiallyPaid: 1,
  Cleared: 2
} as const;

export type AdjustmentStatus = (typeof AdjustmentStatus)[keyof typeof AdjustmentStatus];

export interface PromotionalItem {
  id: number;
  name: string;
  price: number;
  category: string;
  sizes: string;
  description?: string;
}

export interface AccountAdjustment {
  id: number;
  totalAmount: number;
  remainingBalance: number;
  targetMonthlyRepayment?: number;
  quantity: number;
  description: string;
  dateIncurred: string;
  type: AdjustmentType;
  status: AdjustmentStatus;
  advisorId?: number;
  advisorName?: string;
  advisorGroupId?: number;
  advisorGroupName?: string;
  promotionalItemId?: number;
  promotionalItemName?: string;
  promotionalItem?: PromotionalItem;
}

export interface ReportSummary {
  totalAdvancesOwed: number;
  totalGiftsOwed: number;
  totalOtherOwed: number;
  grandTotalOwed: number;
  activeDebtorAdvisorsCount: number;
  activeDebtorTeamsCount: number;
  totalActiveAdjustmentsCount: number;
}

export interface AdvisorDebtSummary {
  advisorId: number;
  advisorName: string;
  advisorCode: string;
  phoneNumber: string;
  email: string;
  advisorGroupId?: number;
  advisorGroupName?: string;
  advancesOwed: number;
  giftsOwed: number;
  otherOwed: number;
  totalOwed: number;
  totalInitialAdvances: number;
  totalInitialGifts: number;
  activeAdjustmentsCount: number;
}

export interface TeamDebtSummary {
  groupId: number;
  groupName: string;
  description: string;
  directGroupAdvancesOwed: number;
  directGroupGiftsOwed: number;
  directGroupOtherOwed: number;
  membersAdvancesOwed: number;
  membersGiftsOwed: number;
  totalTeamOwed: number;
  memberCount: number;
  members: AdvisorDebtSummary[];
}

export interface AdvancesGiftsReport {
  summary: ReportSummary;
  advisors: AdvisorDebtSummary[];
  teams: TeamDebtSummary[];
  adjustments: AccountAdjustment[];
  page?: number;
  pageSize?: number;
  totalAdvisors?: number;
  totalTeams?: number;
  totalAdjustments?: number;
}


