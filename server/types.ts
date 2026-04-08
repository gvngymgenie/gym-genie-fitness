// TypeScript interfaces for database entities
export interface Member {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  address?: string;
  gender: string;
  dob?: string;
  height?: number;
  source: string;
  interestArea?: string;
  healthBackground?: string;
  plan: string;
  startDate: string;
  endDate: string;
  discount: number;
  totalDue: number;
  amountPaid: number;
  paymentMethod?: string;
  assignedStaff?: string;
  status: string;
  avatar?: string;
  branch?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  address?: string;
  gender: string;
  interestArea?: string;
  healthBackground?: string;
  source: string;
  priority: string;
  assignedStaff?: string;
  followUpDate?: string;
  dob?: string;
  height?: number;
  notes?: string;
  followUpCompleted: boolean;
  status: string;
  branch?: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  checkInTime: string;
  method: string;
  createdAt: string;
}

export interface WorkoutProgram {
  id: string;
  memberId?: string;
  day: string;
  name: string;
  difficulty: string;
  exercises: any[]; // JSON array
  duration: number;
  equipment: string;
  intensity: number;
  goal: string;
  createdAt: string;
}

export interface DietPlan {
  id: string;
  memberId?: string;
  meal: string;
  foods: any[]; // JSON array
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration: string;
  durationMonths: number;
  price: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  date: string;
  sentTo: string;
  sentToType: string;
  status: string;
  deliveryStatus: string;
  createdAt: string;
}

export interface WorkoutProgramAssignment {
  id: string;
  programId: string;
  memberId: string;
  assignedAt: string;
}

export interface DietPlanAssignment {
  id: string;
  dietPlanId: string;
  memberId: string;
  assignedAt: string;
}
