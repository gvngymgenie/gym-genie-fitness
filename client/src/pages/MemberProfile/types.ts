import type { BmiRecord, Member, WorkoutProgram, DietPlan, WorkoutProgramAssignment, DietPlanAssignment } from "@shared/schema";

export interface MemberMembership {
  id: string;
  receiptNumber: string;
  plan: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  status: 'Active' | 'Expired';
}

export interface MemberMeasurement {
  id: string;
  date: string;
  chest: number;
  waist: number;
  arms: number;
  thighs: number;
}

export interface MemberBodyComposition {
  id: string;
  date: string;
  weight: number;
  bmi: number;
  fatPercentage: number;
  lbm: number;
}

export interface BmiRecordWithId extends BmiRecord {
  id: string;
}

export interface MemberProfileProps {
  memberId: string;
}

export interface MemberProfileHeaderProps {
  memberId: string;
  member: Member | undefined;
  onEditClick?: () => void;
}

export interface MemberProfileCardProps {
  memberId: string;
  member: Member | undefined;
  trainers: any[];
}

export interface MemberAttendanceCalendarProps {
  attendanceData?: { date: string }[];
}

export interface CameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void;
}

export interface BmiMetric {
  key: keyof BmiRecord;
  label: string;
}

export interface WorkoutAssignment {
  id: string;
  programId: string;
  memberId: string;
  assignedDate: string;
  workoutProgram: WorkoutProgram;
}

export interface DietAssignment {
  id: string;
  dietPlanId: string;
  memberId: string;
  assignedDate: string;
  dietPlan: DietPlan;
}