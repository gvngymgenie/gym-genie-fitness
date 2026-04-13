import { createHash } from "crypto";
import { db as drizzleDb } from "./db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import type { User, SafeUser, InsertUser, UpdateUser, MembershipPlan, InsertPlan, UpdatePlan, InventoryItem, InsertInventory, UpdateInventory, Lead, InsertLead, UpdateLead, Member, InsertMember, UpdateMember, CompanySettings, InsertCompanySettings, UpdateCompanySettings, Branch, InsertBranch, UpdateBranch, Attendance, InsertAttendance, StaffAttendance, InsertStaffAttendance, TrainerSalaryConfig, InsertTrainerSalaryConfig, UpdateTrainerSalaryConfig, TrainerPayout, InsertTrainerPayout, UpdateTrainerPayout, TrainerPayoutLineItem, InsertTrainerPayoutLineItem, WorkoutProgram, InsertWorkoutProgram, UpdateWorkoutProgram, DietPlan, InsertDietPlan, UpdateDietPlan, WorkoutProgramAssignment, InsertWorkoutProgramAssignment, DietPlanAssignment, InsertDietPlanAssignment, TrainerProfile, InsertTrainerProfile, UpdateTrainerProfile, TrainerAvailability, InsertTrainerAvailability, TrainerBooking, InsertTrainerBooking, UpdateTrainerBooking, TrainerFeedback, InsertTrainerFeedback, MemberOtp, InsertMemberOtp, BmiRecord, InsertBmiRecord, MemberMeasurement, InsertMemberMeasurement, UpdateMemberMeasurement, Notification, InsertNotification, UpdateNotification, PushSubscription, InsertPushSubscription, RolePermission, ModuleControl, InsertModuleControl, UpdateModuleControl } from "@shared/schema";
import * as schema from "../shared/schema";
import { transformMemberToCamelCase } from "./db";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function toSafeUser(user: User): SafeUser {
  const { password, ...safeUser } = user;
  return safeUser;
}

// Initialized via import from ./db

export interface IStorage {
  getUser(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<SafeUser | undefined>;
  getUserByEmail(email: string): Promise<SafeUser | undefined>;
  getUserWithPassword(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<SafeUser>;
  updateUser(id: string, user: UpdateUser): Promise<SafeUser | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<SafeUser[]>;
  getUsersByRole(role: string): Promise<SafeUser[]>;
  getStaffMembers(): Promise<SafeUser[]>;
  validatePassword(username: string, password: string): Promise<SafeUser | null>;
  // Membership Plans
  getAllPlans(): Promise<MembershipPlan[]>;
  getPlan(id: string): Promise<MembershipPlan | undefined>;
  createPlan(plan: InsertPlan): Promise<MembershipPlan>;
  updatePlan(id: string, plan: UpdatePlan): Promise<MembershipPlan | undefined>;
  deletePlan(id: string): Promise<boolean>;
  // Inventory Items
  getAllInventory(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventory): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: UpdateInventory): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  // Leads
  getAllLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: UpdateLead): Promise<Lead | undefined>;
  deleteLead(id: string): Promise<boolean>;
  // Members
  getAllMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  getMemberByEmail(email: string): Promise<Member | undefined>;
  getMemberByPhone(phone: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: UpdateMember): Promise<Member | undefined>;
  deleteMember(id: string): Promise<boolean>;
  // Company Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  createOrUpdateCompanySettings(settings: UpdateCompanySettings): Promise<CompanySettings>;
  // Branches
  getAllBranches(): Promise<Branch[]>;
  getBranch(id: string): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: string, branch: UpdateBranch): Promise<Branch | undefined>;
  deleteBranch(id: string): Promise<boolean>;
  // Attendance
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  getAttendanceByMember(memberId: string): Promise<Attendance[]>;
  createAttendance(record: InsertAttendance): Promise<Attendance>;
  deleteAttendance(id: string): Promise<boolean>;
  // Staff Attendance
  getStaffAttendanceByDate(date: string): Promise<StaffAttendance[]>;
  getStaffAttendanceByPerson(personId: string): Promise<StaffAttendance[]>;
  createStaffAttendance(record: InsertStaffAttendance): Promise<StaffAttendance>;
  deleteStaffAttendance(id: string): Promise<boolean>;
  // Trainer Salary
  getSalaryConfig(trainerId: string): Promise<TrainerSalaryConfig | undefined>;
  upsertSalaryConfig(trainerId: string, config: InsertTrainerSalaryConfig): Promise<TrainerSalaryConfig>;
  updateSalaryConfig(id: string, config: UpdateTrainerSalaryConfig): Promise<TrainerSalaryConfig | undefined>;
  getPayoutByMonth(trainerId: string, month: number, year: number): Promise<TrainerPayout | undefined>;
  getPayout(id: string): Promise<TrainerPayout | undefined>;
  getPayoutHistory(trainerId: string): Promise<TrainerPayout[]>;
  getAllPayouts(filters: { trainerId?: string; month?: number; year?: number }): Promise<TrainerPayout[]>;
  createPayout(payout: InsertTrainerPayout): Promise<TrainerPayout>;
  updatePayout(id: string, payout: UpdateTrainerPayout): Promise<TrainerPayout | undefined>;
  getPayoutLineItems(payoutId: string): Promise<TrainerPayoutLineItem[]>;
  createPayoutLineItem(item: InsertTrainerPayoutLineItem): Promise<TrainerPayoutLineItem>;
  deletePayoutLineItems(payoutId: string): Promise<boolean>;
  // Workout Programs
  getAllWorkoutPrograms(): Promise<WorkoutProgram[]>;
  getWorkoutProgramsByMember(memberId: string): Promise<WorkoutProgram[]>;
  createWorkoutProgram(program: InsertWorkoutProgram): Promise<WorkoutProgram>;
  updateWorkoutProgram(id: string, program: UpdateWorkoutProgram): Promise<WorkoutProgram | undefined>;
  deleteWorkoutProgram(id: string): Promise<boolean>;
  // Diet Plans
  getAllDietPlans(): Promise<DietPlan[]>;
  getDietPlansByMember(memberId: string): Promise<DietPlan[]>;
  createDietPlan(plan: InsertDietPlan): Promise<DietPlan>;
  updateDietPlan(id: string, plan: UpdateDietPlan): Promise<DietPlan | undefined>;
  deleteDietPlan(id: string): Promise<boolean>;
  // Workout Program Assignments
  getAssignmentsByProgram(programId: string): Promise<WorkoutProgramAssignment[]>;
  createAssignment(assignment: InsertWorkoutProgramAssignment): Promise<WorkoutProgramAssignment>;
  deleteAssignment(programId: string, memberId: string): Promise<boolean>;

  // Notifications
  getAllNotifications(): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: UpdateNotification): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  // Diet Plan Assignments
  getDietAssignmentsByPlan(dietPlanId: string): Promise<DietPlanAssignment[]>;
  createDietAssignment(assignment: InsertDietPlanAssignment): Promise<DietPlanAssignment>;
  deleteDietAssignment(dietPlanId: string, memberId: string): Promise<boolean>;
  // Assignments by Member
  getWorkoutAssignmentsByMember(memberId: string): Promise<WorkoutProgramAssignment[]>;
  getDietAssignmentsByMember(memberId: string): Promise<DietPlanAssignment[]>;
  // Trainer Profiles
  getTrainerProfile(trainerId: string): Promise<TrainerProfile | undefined>;
  createTrainerProfile(profile: InsertTrainerProfile): Promise<TrainerProfile>;
  updateTrainerProfile(trainerId: string, profile: UpdateTrainerProfile): Promise<TrainerProfile | undefined>;
  // Trainer Bookings
  getTrainerBookings(trainerId: string): Promise<TrainerBooking[]>;
  createTrainerBooking(booking: InsertTrainerBooking): Promise<TrainerBooking>;
  updateTrainerBooking(id: string, booking: UpdateTrainerBooking): Promise<TrainerBooking | undefined>;
  deleteTrainerBooking(id: string): Promise<boolean>;
  getTrainerBookingsByMonth(trainerId: string, month: number, year: number): Promise<TrainerBooking[]>;
  // Trainer Feedback
  getTrainerFeedback(trainerId: string): Promise<TrainerFeedback[]>;
  getTrainerFeedbackByMonth(trainerId: string, month: number, year: number): Promise<TrainerFeedback[]>;
  createTrainerFeedback(feedback: InsertTrainerFeedback): Promise<TrainerFeedback>;
  // Trainer Availability
  getTrainerAvailabilityByWeek(trainerId: string, weekDates: string[]): Promise<TrainerAvailability[]>;
  upsertTrainerAvailability(availability: InsertTrainerAvailability): Promise<TrainerAvailability>;
  getTrainerBookingsByWeek(trainerId: string, weekDates: string[]): Promise<TrainerBooking[]>;
  getMemberBookings(memberId: string): Promise<TrainerBooking[]>;
  // Member OTP
  createOtp(otp: InsertMemberOtp): Promise<MemberOtp>;
  getValidOtp(phone: string, otp: string): Promise<MemberOtp | undefined>;
  markOtpVerified(id: string): Promise<void>;
  cleanExpiredOtps(): Promise<void>;
  // BMI Records
  getBmiRecordsByMember(memberId: string): Promise<BmiRecord[]>;
  createBmiRecord(record: InsertBmiRecord): Promise<BmiRecord>;
  updateBmiRecord(id: string, record: Partial<InsertBmiRecord>): Promise<BmiRecord | undefined>;
  deleteBmiRecord(id: string): Promise<boolean>;
  // Member Measurements
  getMeasurementsByMember(memberId: string): Promise<MemberMeasurement[]>;
  getMeasurement(id: string): Promise<MemberMeasurement | undefined>;
  createMeasurement(measurement: InsertMemberMeasurement): Promise<MemberMeasurement>;
  updateMeasurement(id: string, measurement: UpdateMemberMeasurement): Promise<MemberMeasurement | undefined>;
  deleteMeasurement(id: string): Promise<boolean>;
  // Push Subscriptions
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | null>;
  getPushSubscriptionsByUser(userId?: string, memberId?: string): Promise<PushSubscription[]>;
  deactivatePushSubscription(endpoint: string): Promise<boolean>;
  reactivatePushSubscription(endpoint: string): Promise<boolean>;
  // Role Permissions
  getRolePermissions(): Promise<RolePermission[]>;
  getRolePermissionsByRole(role: string): Promise<RolePermission | null>;
  createRolePermission(role: string, permissions: string[]): Promise<RolePermission>;
  getPermissionsForRole(role: string): Promise<string[]>;
  updateRolePermissions(role: string, permissions: string[]): Promise<RolePermission | null>;
  upsertRolePermissions(role: string, permissions: string[]): Promise<RolePermission>;
  seedRolePermissions(): Promise<void>;
  // Module Control (Superadmin)
  getAllModuleControls(): Promise<ModuleControl[]>;
  getModuleControl(moduleName: string): Promise<ModuleControl | null>;
  updateModuleControl(moduleName: string, updates: UpdateModuleControl): Promise<ModuleControl | null>;
  upsertModuleControl(moduleControl: InsertModuleControl): Promise<ModuleControl>;
  seedModuleControls(): Promise<void>;
  getEnabledModules(): Promise<string[]>;
  isModuleEnabled(moduleName: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<SafeUser | undefined> {
    const [user] = await drizzleDb.select().from(schema.users).where(eq(schema.users.id, id));
    return user ? toSafeUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<SafeUser | undefined> {
    const [user] = await drizzleDb.select().from(schema.users).where(eq(schema.users.username, username));
    return user ? toSafeUser(user) : undefined;
  }

  async getUserByEmail(email: string): Promise<SafeUser | undefined> {
    const [user] = await drizzleDb.select().from(schema.users).where(eq(schema.users.email, email));
    return user ? toSafeUser(user) : undefined;
  }

  async getUserWithPassword(username: string): Promise<User | undefined> {
    const [user] = await drizzleDb.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<SafeUser> {
    const hashedPassword = hashPassword(insertUser.password);
    const [created] = await drizzleDb.insert(schema.users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return toSafeUser(created);
  }

  async updateUser(id: string, updateData: UpdateUser & { password?: string }): Promise<SafeUser | undefined> {
    // Hash password if it's being updated
    const processedData: any = { ...updateData };
    if (processedData.password) {
      processedData.password = hashPassword(processedData.password);
    }

    const fields = [];
    const [updated] = await drizzleDb.update(schema.users)
      .set(processedData)
      .where(eq(schema.users.id, id))
      .returning();

    return updated ? toSafeUser(updated) : undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.users).where(eq(schema.users.id, id)).returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const users = await drizzleDb.select().from(schema.users).orderBy(desc(schema.users.createdAt));
    return users.map(toSafeUser);
  }

  async getUsersByRole(role: string): Promise<SafeUser[]> {
    const users = await drizzleDb.select().from(schema.users)
      .where(eq(schema.users.role, role))
      .orderBy(desc(schema.users.createdAt));
    return users.map(toSafeUser);
  }

  async getStaffMembers(): Promise<SafeUser[]> {
    const staffRoles = ["admin", "manager", "trainer", "staff"];
    const users = await drizzleDb.select().from(schema.users)
      .where(and(inArray(schema.users.role, staffRoles), eq(schema.users.isActive, true)))
      .orderBy(desc(schema.users.createdAt));
    return users.map(toSafeUser);
  }

  async validatePassword(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserWithPassword(username);
    if (!user) return null;
    const hashedInput = hashPassword(password);
    if (user.password === hashedInput) {
      return toSafeUser(user);
    }
    return null;
  }

  // Membership Plans
  async getAllPlans(): Promise<MembershipPlan[]> {
    return await drizzleDb.select().from(schema.membershipPlans)
      .where(eq(schema.membershipPlans.isActive, true))
      .orderBy(schema.membershipPlans.durationMonths);
  }

  async getPlan(id: string): Promise<MembershipPlan | undefined> {
    const [plan] = await drizzleDb.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, id));
    return plan;
  }

  async createPlan(insertPlan: InsertPlan): Promise<MembershipPlan> {
    const [created] = await drizzleDb.insert(schema.membershipPlans).values(insertPlan).returning();
    return created;
  }

  async updatePlan(id: string, updateData: UpdatePlan): Promise<MembershipPlan | undefined> {
    const [updated] = await drizzleDb.update(schema.membershipPlans)
      .set(updateData)
      .where(eq(schema.membershipPlans.id, id))
      .returning();
    return updated;
  }

  async deletePlan(id: string): Promise<boolean> {
    const [updated] = await drizzleDb.update(schema.membershipPlans)
      .set({ isActive: false })
      .where(eq(schema.membershipPlans.id, id))
      .returning();
    return !!updated;
  }

  // Inventory Items
  async getAllInventory(): Promise<InventoryItem[]> {
    return await drizzleDb.select().from(schema.inventoryItems).orderBy(desc(schema.inventoryItems.createdAt));
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await drizzleDb.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<InventoryItem> {
    const [created] = await drizzleDb.insert(schema.inventoryItems).values(item).returning();
    return created;
  }

  async updateInventoryItem(id: string, item: UpdateInventory): Promise<InventoryItem | undefined> {
    const [updated] = await drizzleDb.update(schema.inventoryItems)
      .set(item)
      .where(eq(schema.inventoryItems.id, id))
      .returning();
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id)).returning();
    return result.length > 0;
  }

  // Leads
  async getAllLeads(): Promise<Lead[]> {
    return await drizzleDb.select().from(schema.leads).orderBy(desc(schema.leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await drizzleDb.select().from(schema.leads).where(eq(schema.leads.id, id));
    return lead;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await drizzleDb.insert(schema.leads).values(insertLead).returning();
    return lead;
  }

  async updateLead(id: string, lead: UpdateLead): Promise<Lead | undefined> {
    const [updated] = await drizzleDb.update(schema.leads).set(lead).where(eq(schema.leads.id, id)).returning();
    return updated;
  }

  async deleteLead(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.leads).where(eq(schema.leads.id, id)).returning();
    return result.length > 0;
  }

  // Members
  async getAllMembers(): Promise<Member[]> {
    try {
      console.log("Attempting to fetch all members...");
      const members = await drizzleDb.select().from(schema.members).orderBy(desc(schema.members.createdAt));
      console.log("Members fetched successfully, transforming...");
      return members.map(transformMemberToCamelCase);
    } catch (error: any) {
      console.error("Error fetching members:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error);
      
      // If trainer_id column doesn't exist yet, try without it
      if (error.code === '42703' && (error.message.includes('trainer_id') || error.message.includes('"trainer_id"'))) {
        console.log("trainer_id column not found, fetching without it...");
        try {
          const members = await drizzleDb.select({
            id: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
            phone: schema.members.phone,
            address: schema.members.address,
            gender: schema.members.gender,
            dob: schema.members.dob,
            height: schema.members.height,
            source: schema.members.source,
            interest_areas: schema.members.interest_areas,
            healthBackground: schema.members.healthBackground,
            plan: schema.members.plan,
            startDate: schema.members.startDate,
            endDate: schema.members.endDate,
            discount: schema.members.discount,
            totalDue: schema.members.totalDue,
            amountPaid: schema.members.amountPaid,
            paymentMethod: schema.members.paymentMethod,
            assignedStaff: schema.members.assignedStaff,
            status: schema.members.status,
            avatar: schema.members.avatar,
            avatarStaticUrl: schema.members.avatarStaticUrl,
            branch: schema.members.branch,
            createdAt: schema.members.createdAt,
          }).from(schema.members).orderBy(desc(schema.members.createdAt));
          
          console.log("Fallback query successful, mapping results...");
          return members.map(member => ({
            ...member,
            interestAreas: member.interest_areas || [],
            trainerId: null,
            trainingType: null,
          }));
        } catch (fallbackError: any) {
          console.error("Fallback query also failed:", fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async getMember(id: string): Promise<Member | undefined> {
    try {
      const [member] = await drizzleDb.select().from(schema.members).where(eq(schema.members.id, id));
      if (!member) return undefined;
      return transformMemberToCamelCase(member);
    } catch (error: any) {
      console.error("Error fetching member:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error);
      
      // If trainer_id column doesn't exist yet, try without it
      if (error.code === '42703' && (error.message.includes('trainer_id') || error.message.includes('"trainer_id"'))) {
        console.log("trainer_id column not found, fetching without it...");
        try {
          const [member] = await drizzleDb.select({
            id: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
            phone: schema.members.phone,
            address: schema.members.address,
            gender: schema.members.gender,
            dob: schema.members.dob,
            height: schema.members.height,
            source: schema.members.source,
            interest_areas: schema.members.interest_areas,
            healthBackground: schema.members.healthBackground,
            plan: schema.members.plan,
            startDate: schema.members.startDate,
            endDate: schema.members.endDate,
            discount: schema.members.discount,
            totalDue: schema.members.totalDue,
            amountPaid: schema.members.amountPaid,
            paymentMethod: schema.members.paymentMethod,
            assignedStaff: schema.members.assignedStaff,
            status: schema.members.status,
            avatar: schema.members.avatar,
            avatarStaticUrl: schema.members.avatarStaticUrl,
            branch: schema.members.branch,
            createdAt: schema.members.createdAt,
          }).from(schema.members).where(eq(schema.members.id, id));
          
          if (!member) return undefined;
          
          return {
            ...member,
            interestAreas: member.interest_areas || [],
            trainerId: null,
            trainingType: null,
          };
        } catch (fallbackError: any) {
          console.error("Fallback query also failed:", fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async getMemberByEmail(email: string): Promise<Member | undefined> {
    try {
      const [member] = await drizzleDb.select().from(schema.members).where(eq(schema.members.email, email));
      if (!member) return undefined;
      return transformMemberToCamelCase(member);
    } catch (error: any) {
      console.error("Error fetching member by email:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error);
      
      // If trainer_id column doesn't exist yet, try without it
      if (error.code === '42703' && (error.message.includes('trainer_id') || error.message.includes('"trainer_id"'))) {
        console.log("trainer_id column not found, fetching without it...");
        try {
          const [member] = await drizzleDb.select({
            id: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
            phone: schema.members.phone,
            address: schema.members.address,
            gender: schema.members.gender,
            dob: schema.members.dob,
            height: schema.members.height,
            source: schema.members.source,
            interest_areas: schema.members.interest_areas,
            healthBackground: schema.members.healthBackground,
            plan: schema.members.plan,
            startDate: schema.members.startDate,
            endDate: schema.members.endDate,
            discount: schema.members.discount,
            totalDue: schema.members.totalDue,
            amountPaid: schema.members.amountPaid,
            paymentMethod: schema.members.paymentMethod,
            assignedStaff: schema.members.assignedStaff,
            status: schema.members.status,
            avatar: schema.members.avatar,
            avatarStaticUrl: schema.members.avatarStaticUrl,
            branch: schema.members.branch,
            createdAt: schema.members.createdAt,
          }).from(schema.members).where(eq(schema.members.email, email));
          
          if (!member) return undefined;
          
          return {
            ...member,
            interestAreas: member.interest_areas || [],
            trainerId: null,
            trainingType: null,
          };
        } catch (fallbackError: any) {
          console.error("Fallback query also failed:", fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async getMemberByPhone(phone: string): Promise<Member | undefined> {
    try {
      const [member] = await drizzleDb.select().from(schema.members).where(eq(schema.members.phone, phone));
      if (!member) return undefined;
      return transformMemberToCamelCase(member);
    } catch (error: any) {
      console.error("Error fetching member by phone:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error);
      
      // If trainer_id column doesn't exist yet, try without it
      if (error.code === '42703' && (error.message.includes('trainer_id') || error.message.includes('"trainer_id"'))) {
        console.log("trainer_id column not found, fetching without it...");
        try {
          const [member] = await drizzleDb.select({
            id: schema.members.id,
            firstName: schema.members.firstName,
            lastName: schema.members.lastName,
            email: schema.members.email,
            phone: schema.members.phone,
            address: schema.members.address,
            gender: schema.members.gender,
            dob: schema.members.dob,
            height: schema.members.height,
            source: schema.members.source,
            interest_areas: schema.members.interest_areas,
            healthBackground: schema.members.healthBackground,
            plan: schema.members.plan,
            startDate: schema.members.startDate,
            endDate: schema.members.endDate,
            discount: schema.members.discount,
            totalDue: schema.members.totalDue,
            amountPaid: schema.members.amountPaid,
            paymentMethod: schema.members.paymentMethod,
            assignedStaff: schema.members.assignedStaff,
            status: schema.members.status,
            avatar: schema.members.avatar,
            avatarStaticUrl: schema.members.avatarStaticUrl,
            branch: schema.members.branch,
            createdAt: schema.members.createdAt,
          }).from(schema.members).where(eq(schema.members.phone, phone));
          
          if (!member) return undefined;
          
          return {
            ...member,
            interestAreas: member.interest_areas || [],
            trainerId: null,
            trainingType: null,
          };
        } catch (fallbackError: any) {
          console.error("Fallback query also failed:", fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }

  async createMember(memberData: InsertMember): Promise<Member> {
    const [created] = await drizzleDb.insert(schema.members).values(memberData).returning();
    return transformMemberToCamelCase(created);
  }

  async updateMember(id: string, memberData: UpdateMember): Promise<Member | undefined> {
    console.log("Updating member with ID:", id, "Data:", memberData);
    
    // Handle array fields explicitly for PostgreSQL
    const processedData: any = { ...memberData };
    if (processedData.interestAreas !== undefined) {
      // Ensure the array is a true array and not undefined/null
      processedData.interest_areas = Array.isArray(processedData.interestAreas)
        ? processedData.interestAreas
        : [];
      delete processedData.interestAreas;
    }

    console.log("Processed update object for Drizzle:", processedData);

    const [updated] = await drizzleDb.update(schema.members)
      .set(processedData)
      .where(eq(schema.members.id, id))
      .returning();
    console.log("Update result:", updated);
    if (!updated) return undefined;
    return transformMemberToCamelCase(updated);
  }

  async deleteMember(id: string): Promise<boolean> {
    console.log("Deleting member with ID:", id);

    // Get member to find phone number for OTP cleanup
    const member = await this.getMember(id);

    // Delete related records that don't have CASCADE
    await drizzleDb.delete(schema.payments).where(eq(schema.payments.memberId, id));
    await drizzleDb.delete(schema.memberCredits).where(eq(schema.memberCredits.memberId, id));
    await drizzleDb.delete(schema.creditTransactions).where(eq(schema.creditTransactions.memberId, id));
    await drizzleDb.delete(schema.memberMeasurements).where(eq(schema.memberMeasurements.memberId, id));
    await drizzleDb.delete(schema.bmiRecords).where(eq(schema.bmiRecords.memberId, id));
    await drizzleDb.delete(schema.attendance).where(eq(schema.attendance.memberId, id));
    await drizzleDb.delete(schema.workoutProgramAssignments).where(eq(schema.workoutProgramAssignments.memberId, id));
    await drizzleDb.delete(schema.dietPlanAssignments).where(eq(schema.dietPlanAssignments.memberId, id));

    // Delete member OTP records by phone
    if (member?.phone) {
      await drizzleDb.delete(schema.memberOtps).where(eq(schema.memberOtps.phone, member.phone));
    }

    // Delete the member
    const result = await drizzleDb.delete(schema.members)
      .where(eq(schema.members.id, id))
      .returning();
    console.log("Delete result:", result);
    return result.length > 0;
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const [settings] = await drizzleDb.select().from(schema.companySettings);
    return settings;
  }

  async createOrUpdateCompanySettings(updateData: UpdateCompanySettings): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    if (existing) {
      const [updated] = await drizzleDb.update(schema.companySettings)
        .set(updateData)
        .where(eq(schema.companySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await drizzleDb.insert(schema.companySettings)
        .values(updateData as any)
        .returning();
      return created;
    }
  }

  // Branches
  async getAllBranches(): Promise<Branch[]> {
    return await drizzleDb.select().from(schema.branches).orderBy(desc(schema.branches.createdAt));
  }

  async getBranch(id: string): Promise<Branch | undefined> {
    const [branch] = await drizzleDb.select().from(schema.branches).where(eq(schema.branches.id, id));
    return branch;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [created] = await drizzleDb.insert(schema.branches).values(branch).returning();
    return created;
  }

  async updateBranch(id: string, branch: UpdateBranch): Promise<Branch | undefined> {
    const [updated] = await drizzleDb.update(schema.branches)
      .set(branch)
      .where(eq(schema.branches.id, id))
      .returning();
    return updated;
  }

  async deleteBranch(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.branches).where(eq(schema.branches.id, id)).returning();
    return result.length > 0;
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return await drizzleDb.select().from(schema.attendance).where(eq(schema.attendance.date, date)).orderBy(schema.attendance.checkInTime);
  }

  async getAttendanceByMember(memberId: string): Promise<Attendance[]> {
    return await drizzleDb.select().from(schema.attendance).where(eq(schema.attendance.memberId, memberId)).orderBy(schema.attendance.date);
  }

  async createAttendance(record: InsertAttendance): Promise<Attendance> {
    const [created] = await drizzleDb.insert(schema.attendance).values(record).returning();
    return created;
  }

  async deleteAttendance(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.attendance).where(eq(schema.attendance.id, id)).returning();
    return result.length > 0;
  }

  // Staff Attendance
  async getStaffAttendanceByDate(date: string): Promise<StaffAttendance[]> {
    return await drizzleDb.select().from(schema.staffAttendance).where(eq(schema.staffAttendance.date, date)).orderBy(schema.staffAttendance.checkInTime);
  }

  async getStaffAttendanceByPerson(personId: string): Promise<StaffAttendance[]> {
    return await drizzleDb.select().from(schema.staffAttendance).where(eq(schema.staffAttendance.personId, personId)).orderBy(schema.staffAttendance.date);
  }

  async createStaffAttendance(record: InsertStaffAttendance): Promise<StaffAttendance> {
    const [created] = await drizzleDb.insert(schema.staffAttendance).values(record).returning();
    return created;
  }

  async deleteStaffAttendance(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.staffAttendance).where(eq(schema.staffAttendance.id, id)).returning();
    return result.length > 0;
  }

  // Trainer Salary
  async getSalaryConfig(trainerId: string): Promise<TrainerSalaryConfig | undefined> {
    const [config] = await drizzleDb.select().from(schema.trainerSalaryConfigs).where(eq(schema.trainerSalaryConfigs.trainerId, trainerId));
    return config;
  }

  async upsertSalaryConfig(trainerId: string, config: InsertTrainerSalaryConfig): Promise<TrainerSalaryConfig> {
    const [created] = await drizzleDb
      .insert(schema.trainerSalaryConfigs)
      .values(config)
      .onConflictDoUpdate({
        target: schema.trainerSalaryConfigs.trainerId,
        set: {
          baseSalary: config.baseSalary,
          perSessionRate: config.perSessionRate,
          attendanceBonusPerDay: config.attendanceBonusPerDay,
          attendanceBonusThreshold: config.attendanceBonusThreshold,
          reviewBonusMinRating: config.reviewBonusMinRating,
          reviewBonusAmount: config.reviewBonusAmount,
        },
      })
      .returning();
    return created;
  }

  async updateSalaryConfig(id: string, config: UpdateTrainerSalaryConfig): Promise<TrainerSalaryConfig | undefined> {
    const [updated] = await drizzleDb.update(schema.trainerSalaryConfigs).set(config).where(eq(schema.trainerSalaryConfigs.id, id)).returning();
    return updated;
  }

  async getPayoutByMonth(trainerId: string, month: number, year: number): Promise<TrainerPayout | undefined> {
    const [payout] = await drizzleDb
      .select()
      .from(schema.trainerPayouts)
      .where(and(eq(schema.trainerPayouts.trainerId, trainerId), eq(schema.trainerPayouts.month, month), eq(schema.trainerPayouts.year, year)));
    return payout;
  }

  async getPayout(id: string): Promise<TrainerPayout | undefined> {
    const [payout] = await drizzleDb
      .select()
      .from(schema.trainerPayouts)
      .where(eq(schema.trainerPayouts.id, id));
    return payout;
  }

  async getPayoutHistory(trainerId: string): Promise<TrainerPayout[]> {
    return await drizzleDb.select().from(schema.trainerPayouts).where(eq(schema.trainerPayouts.trainerId, trainerId)).orderBy(desc(schema.trainerPayouts.year), desc(schema.trainerPayouts.month));
  }

  async getAllPayouts(filters: { trainerId?: string; month?: number; year?: number }): Promise<TrainerPayout[]> {
    let query = drizzleDb.select().from(schema.trainerPayouts);
    const conditions = [];
    if (filters.trainerId) conditions.push(eq(schema.trainerPayouts.trainerId, filters.trainerId));
    if (filters.month) conditions.push(eq(schema.trainerPayouts.month, filters.month));
    if (filters.year) conditions.push(eq(schema.trainerPayouts.year, filters.year));
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }
    return await query.orderBy(desc(schema.trainerPayouts.year), desc(schema.trainerPayouts.month));
  }

  async createPayout(payout: InsertTrainerPayout): Promise<TrainerPayout> {
    const [created] = await drizzleDb.insert(schema.trainerPayouts).values(payout).returning();
    return created;
  }

  async updatePayout(id: string, payout: UpdateTrainerPayout): Promise<TrainerPayout | undefined> {
    const [updated] = await drizzleDb.update(schema.trainerPayouts).set(payout).where(eq(schema.trainerPayouts.id, id)).returning();
    return updated;
  }

  async getPayoutLineItems(payoutId: string): Promise<TrainerPayoutLineItem[]> {
    return await drizzleDb.select().from(schema.trainerPayoutLineItems).where(eq(schema.trainerPayoutLineItems.payoutId, payoutId)).orderBy(schema.trainerPayoutLineItems.type);
  }

  async createPayoutLineItem(item: InsertTrainerPayoutLineItem): Promise<TrainerPayoutLineItem> {
    const [created] = await drizzleDb.insert(schema.trainerPayoutLineItems).values(item).returning();
    return created;
  }

  async deletePayoutLineItems(payoutId: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.trainerPayoutLineItems).where(eq(schema.trainerPayoutLineItems.payoutId, payoutId)).returning();
    return result.length > 0;
  }


  // Workout Programs
  async getAllWorkoutPrograms(): Promise<WorkoutProgram[]> {
    return await drizzleDb.select().from(schema.workoutPrograms);
  }

  async getWorkoutProgramsByMember(memberId: string): Promise<WorkoutProgram[]> {
    return await drizzleDb.select().from(schema.workoutPrograms).where(eq(schema.workoutPrograms.memberId, memberId));
  }

  async createWorkoutProgram(program: InsertWorkoutProgram & { collectionIds?: string[] }): Promise<WorkoutProgram> {
    const [created] = await drizzleDb.insert(schema.workoutPrograms).values({
      ...program,
      memberId: program.memberId || null,
      customWorkoutPlan: (program as any).customWorkoutPlan || false,
      exercises: (program.exercises as any) || [],
      equipment: (program.equipment as any) || [],
    }).returning();
    
    // Handle collection assignments
    if ((program as any).collectionIds && (program as any).collectionIds.length > 0) {
      await this.addWorkoutToCollections(created.id, (program as any).collectionIds);
    }
    
    return created;
  }

  async updateWorkoutProgram(id: string, program: UpdateWorkoutProgram & { collectionIds?: string[] }): Promise<WorkoutProgram | undefined> {
    const [updated] = await drizzleDb.update(schema.workoutPrograms).set({
      ...program,
      memberId: program.memberId !== undefined ? program.memberId : undefined,
      customWorkoutPlan: (program as any).customWorkoutPlan !== undefined ? (program as any).customWorkoutPlan : undefined,
      exercises: program.exercises ? (program.exercises as any) : undefined,
      equipment: program.equipment ? (program.equipment as any) : undefined,
    }).where(eq(schema.workoutPrograms.id, id)).returning();
    
    // Handle collection assignments
    if ((program as any).collectionIds !== undefined) {
      await this.updateWorkoutCollections(id, (program as any).collectionIds);
    }
    
    return updated || undefined;
  }

  async deleteWorkoutProgram(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.workoutPrograms).where(eq(schema.workoutPrograms.id, id)).returning();
    return result.length > 0;
  }

  // Workout Collection Members
  async addWorkoutToCollections(workoutId: string, collectionIds: string[]): Promise<void> {
    const values = collectionIds.map(collectionId => ({
      workoutId,
      collectionId,
    }));
    await drizzleDb.insert(schema.workoutCollectionMembers).values(values).onConflictDoNothing({
      target: [schema.workoutCollectionMembers.workoutId, schema.workoutCollectionMembers.collectionId],
    });
  }

  async removeWorkoutFromCollections(workoutId: string, collectionIds: string[]): Promise<void> {
    await drizzleDb.delete(schema.workoutCollectionMembers).where(
      and(
        eq(schema.workoutCollectionMembers.workoutId, workoutId),
        inArray(schema.workoutCollectionMembers.collectionId, collectionIds)
      )
    );
  }

  async updateWorkoutCollections(workoutId: string, collectionIds: string[]): Promise<void> {
    // Remove all existing
    await drizzleDb.delete(schema.workoutCollectionMembers).where(
      eq(schema.workoutCollectionMembers.workoutId, workoutId)
    );
    // Add new
    if (collectionIds.length > 0) {
      const values = collectionIds.map(collectionId => ({
        workoutId,
        collectionId,
      }));
      await drizzleDb.insert(schema.workoutCollectionMembers).values(values);
    }
  }

  async getWorkoutCollections(workoutId: string): Promise<string[]> {
    const members = await drizzleDb
      .select({ collectionId: schema.workoutCollectionMembers.collectionId })
      .from(schema.workoutCollectionMembers)
      .where(eq(schema.workoutCollectionMembers.workoutId, workoutId));
    return members.map(m => m.collectionId);
  }

  // Diet Plans
  async getAllDietPlans(): Promise<DietPlan[]> {
    return await drizzleDb.select().from(schema.dietPlans);
  }

  async getDietPlansByMember(memberId: string): Promise<DietPlan[]> {
    return await drizzleDb.select().from(schema.dietPlans).where(eq(schema.dietPlans.memberId, memberId));
  }

  async createDietPlan(plan: InsertDietPlan): Promise<DietPlan> {
    const [created] = await drizzleDb.insert(schema.dietPlans).values({
      ...plan,
      memberId: plan.memberId || null,
      foods: (plan.foods as any) || [],
    }).returning();
    return created;
  }

  async updateDietPlan(id: string, plan: UpdateDietPlan): Promise<DietPlan | undefined> {
    const [updated] = await drizzleDb.update(schema.dietPlans).set({
      ...plan,
      memberId: plan.memberId !== undefined ? plan.memberId : undefined,
      foods: plan.foods ? (plan.foods as any) : undefined,
      updatedAt: new Date(),
    }).where(eq(schema.dietPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteDietPlan(id: string): Promise<boolean> {
    // First delete all assignments for this diet plan
    await drizzleDb.delete(schema.dietPlanAssignments).where(eq(schema.dietPlanAssignments.dietPlanId, id));
    // Then delete the diet plan
    const result = await drizzleDb.delete(schema.dietPlans).where(eq(schema.dietPlans.id, id)).returning();
    return result.length > 0;
  }

  // Workout Program Assignments
  async getAssignmentsByProgram(programId: string): Promise<WorkoutProgramAssignment[]> {
    return await drizzleDb.select().from(schema.workoutProgramAssignments).where(eq(schema.workoutProgramAssignments.programId, programId));
  }

  async createAssignment(assignment: InsertWorkoutProgramAssignment): Promise<WorkoutProgramAssignment> {
    const [created] = await drizzleDb.insert(schema.workoutProgramAssignments).values(assignment).returning();
    return created;
  }

  async deleteAssignment(programId: string, memberId: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.workoutProgramAssignments)
      .where(and(eq(schema.workoutProgramAssignments.programId, programId), eq(schema.workoutProgramAssignments.memberId, memberId)))
      .returning();
    return result.length > 0;
  }

  // Notifications
  async getAllNotifications(): Promise<Notification[]> {
    return await drizzleDb.select().from(schema.notifications).orderBy(desc(schema.notifications.createdAt));
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notif] = await drizzleDb.select().from(schema.notifications).where(eq(schema.notifications.id, id));
    return notif;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await drizzleDb.insert(schema.notifications).values(notification).returning();
    return created;
  }

  async updateNotification(id: string, notification: UpdateNotification): Promise<Notification | undefined> {
    const [updated] = await drizzleDb.update(schema.notifications)
      .set(notification)
      .where(eq(schema.notifications.id, id))
      .returning();
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.notifications).where(eq(schema.notifications.id, id)).returning();
    return result.length > 0;
  }

  // Diet Plan Assignments
  async getDietAssignmentsByPlan(dietPlanId: string): Promise<DietPlanAssignment[]> {
    return await drizzleDb.select().from(schema.dietPlanAssignments).where(eq(schema.dietPlanAssignments.dietPlanId, dietPlanId));
  }

  async createDietAssignment(assignment: InsertDietPlanAssignment): Promise<DietPlanAssignment> {
    const [created] = await drizzleDb.insert(schema.dietPlanAssignments).values(assignment).returning();
    return created;
  }

  async deleteDietAssignment(dietPlanId: string, memberId: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.dietPlanAssignments)
      .where(and(eq(schema.dietPlanAssignments.dietPlanId, dietPlanId), eq(schema.dietPlanAssignments.memberId, memberId)))
      .returning();
    return result.length > 0;
  }

  // Assignments by Member
  async getWorkoutAssignmentsByMember(memberId: string): Promise<WorkoutProgramAssignment[]> {
    return await drizzleDb.select().from(schema.workoutProgramAssignments).where(eq(schema.workoutProgramAssignments.memberId, memberId));
  }

  async getDietAssignmentsByMember(memberId: string): Promise<DietPlanAssignment[]> {
    return await drizzleDb.select().from(schema.dietPlanAssignments).where(eq(schema.dietPlanAssignments.memberId, memberId));
  }

  // Trainer Profiles
  async getTrainerProfile(trainerId: string): Promise<TrainerProfile | undefined> {
    const [profile] = await drizzleDb.select().from(schema.trainerProfiles).where(eq(schema.trainerProfiles.trainerId, trainerId));
    return profile || undefined;
  }

  async createTrainerProfile(profile: InsertTrainerProfile): Promise<TrainerProfile> {
    const [created] = await drizzleDb.insert(schema.trainerProfiles).values(profile).returning();
    return created;
  }

  async updateTrainerProfile(trainerId: string, updateData: UpdateTrainerProfile): Promise<TrainerProfile | undefined> {
    const [updated] = await drizzleDb
      .update(schema.trainerProfiles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.trainerProfiles.trainerId, trainerId))
      .returning();
    return updated || undefined;
  }

  // Trainer Bookings
  async getTrainerBookings(trainerId: string): Promise<TrainerBooking[]> {
    return await drizzleDb.select().from(schema.trainerBookings).where(eq(schema.trainerBookings.trainerId, trainerId));
  }

  async createTrainerBooking(booking: InsertTrainerBooking): Promise<TrainerBooking> {
    const [created] = await drizzleDb.insert(schema.trainerBookings).values(booking).returning();
    return created;
  }

  async updateTrainerBooking(id: string, updateData: UpdateTrainerBooking): Promise<TrainerBooking | undefined> {
    const [updated] = await drizzleDb.update(schema.trainerBookings).set(updateData).where(eq(schema.trainerBookings.id, id)).returning();
    return updated || undefined;
  }

  async deleteTrainerBooking(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.trainerBookings).where(eq(schema.trainerBookings.id, id)).returning();
    return result.length > 0;
  }

  async getTrainerBookingsByMonth(trainerId: string, month: number, year: number): Promise<TrainerBooking[]> {
    const allBookings = await drizzleDb.select().from(schema.trainerBookings).where(eq(schema.trainerBookings.trainerId, trainerId));
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    return allBookings.filter(b => b.bookingDate.startsWith(monthStr) && b.status === "completed");
  }

  // Trainer Feedback
  async getTrainerFeedback(trainerId: string): Promise<TrainerFeedback[]> {
    return await drizzleDb.select().from(schema.trainerFeedback).where(eq(schema.trainerFeedback.trainerId, trainerId));
  }

  async getTrainerFeedbackByMonth(trainerId: string, month: number, year: number): Promise<TrainerFeedback[]> {
    const allFeedback = await drizzleDb.select().from(schema.trainerFeedback).where(eq(schema.trainerFeedback.trainerId, trainerId));
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    return allFeedback.filter(f => {
      const date = f.submittedAt instanceof Date ? f.submittedAt.toISOString() : String(f.submittedAt);
      return date.startsWith(monthStr);
    });
  }

  async createTrainerFeedback(feedback: InsertTrainerFeedback): Promise<TrainerFeedback> {
    const [created] = await drizzleDb.insert(schema.trainerFeedback).values(feedback).returning();
    return created;
  }

  // Trainer Availability
  async getTrainerAvailabilityByWeek(trainerId: string, weekDates: string[]): Promise<TrainerAvailability[]> {
    const allAvailability = await drizzleDb.select().from(schema.trainerAvailability).where(eq(schema.trainerAvailability.trainerId, trainerId));
    return allAvailability.filter(a => weekDates.includes(a.slotDate));
  }

  async upsertTrainerAvailability(availability: InsertTrainerAvailability): Promise<TrainerAvailability> {
    const existing = await drizzleDb.select().from(schema.trainerAvailability)
      .where(and(
        eq(schema.trainerAvailability.trainerId, availability.trainerId),
        eq(schema.trainerAvailability.slotDate, availability.slotDate),
        eq(schema.trainerAvailability.period, availability.period)
      ));

    if (existing.length > 0) {
      const [updated] = await drizzleDb.update(schema.trainerAvailability)
        .set({ slotCapacity: availability.slotCapacity, updatedAt: new Date() })
        .where(eq(schema.trainerAvailability.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await drizzleDb.insert(schema.trainerAvailability).values(availability).returning();
      return created;
    }
  }

  async getTrainerBookingsByWeek(trainerId: string, weekDates: string[]): Promise<TrainerBooking[]> {
    const allBookings = await drizzleDb.select().from(schema.trainerBookings).where(eq(schema.trainerBookings.trainerId, trainerId));
    return allBookings.filter(b => weekDates.includes(b.bookingDate));
  }

  async getMemberBookings(memberId: string): Promise<TrainerBooking[]> {
    return await drizzleDb.select().from(schema.trainerBookings).where(eq(schema.trainerBookings.memberId, memberId));
  }

  // Member OTP
  async createOtp(otp: InsertMemberOtp): Promise<MemberOtp> {
    const [created] = await drizzleDb.insert(schema.memberOtps).values(otp).returning();
    return created;
  }

  async getValidOtp(phone: string, otp: string): Promise<MemberOtp | undefined> {
    const now = new Date();
    const results = await drizzleDb.select().from(schema.memberOtps).where(
      and(
        eq(schema.memberOtps.phone, phone),
        eq(schema.memberOtps.otp, otp),
        eq(schema.memberOtps.verified, false)
      )
    );
    // Find one that hasn't expired
    const validOtp = results.find(r => r.expiresAt > now);
    return validOtp;
  }

  async markOtpVerified(id: string): Promise<void> {
    await drizzleDb.update(schema.memberOtps).set({ verified: true }).where(eq(schema.memberOtps.id, id));
  }

  async cleanExpiredOtps(): Promise<void> {
    const now = new Date();
    // Delete expired OTPs older than 24 hours
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    await drizzleDb.delete(schema.memberOtps).where(eq(schema.memberOtps.verified, true));
  }

  // BMI Records
  async getBmiRecordsByMember(memberId: string): Promise<BmiRecord[]> {
    return await drizzleDb.select().from(schema.bmiRecords).where(eq(schema.bmiRecords.memberId, memberId));
  }

  async createBmiRecord(record: InsertBmiRecord): Promise<BmiRecord> {
    const [created] = await drizzleDb.insert(schema.bmiRecords).values(record).returning();
    return created;
  }

  async updateBmiRecord(id: string, record: Partial<InsertBmiRecord>): Promise<BmiRecord | undefined> {
    const [updated] = await drizzleDb.update(schema.bmiRecords)
      .set(record)
      .where(eq(schema.bmiRecords.id, id))
      .returning();
    return updated;
  }

  async deleteBmiRecord(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.bmiRecords).where(eq(schema.bmiRecords.id, id)).returning();
    return result.length > 0;
  }

  // Member Measurements
  async getMeasurementsByMember(memberId: string): Promise<MemberMeasurement[]> {
    return await drizzleDb.select().from(schema.memberMeasurements).where(eq(schema.memberMeasurements.memberId, memberId));
  }

  async getMeasurement(id: string): Promise<MemberMeasurement | undefined> {
    const [ms] = await drizzleDb.select().from(schema.memberMeasurements).where(eq(schema.memberMeasurements.id, id));
    return ms;
  }

  async createMeasurement(measurement: InsertMemberMeasurement): Promise<MemberMeasurement> {
    const [created] = await drizzleDb.insert(schema.memberMeasurements).values(measurement).returning();
    return created;
  }

  async updateMeasurement(id: string, measurement: UpdateMemberMeasurement): Promise<MemberMeasurement | undefined> {
    const [updated] = await drizzleDb.update(schema.memberMeasurements).set(measurement).where(eq(schema.memberMeasurements.id, id)).returning();
    return updated || undefined;
  }

  async deleteMeasurement(id: string): Promise<boolean> {
    const result = await drizzleDb.delete(schema.memberMeasurements).where(eq(schema.memberMeasurements.id, id)).returning();
    return result.length > 0;
  }

  // Push Subscriptions
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [created] = await drizzleDb.insert(schema.pushSubscriptions).values(subscription).returning();
    return created;
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    const result = await drizzleDb.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
    return result[0] || null;
  }

  async getPushSubscriptionsByUser(userId?: string, memberId?: string): Promise<PushSubscription[]> {
    const conditions = [eq(schema.pushSubscriptions.isActive, true)];

    if (userId) {
      conditions.push(eq(schema.pushSubscriptions.userId, userId));
    }

    if (memberId) {
      conditions.push(eq(schema.pushSubscriptions.memberId, memberId));
    }

    return await drizzleDb.select()
      .from(schema.pushSubscriptions)
      .where(and(...conditions))
      .orderBy(schema.pushSubscriptions.createdAt);
  }

  async deactivatePushSubscription(endpoint: string): Promise<boolean> {
    const result = await drizzleDb.update(schema.pushSubscriptions)
      .set({ isActive: false })
      .where(eq(schema.pushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }

  async reactivatePushSubscription(endpoint: string): Promise<boolean> {
    const result = await drizzleDb.update(schema.pushSubscriptions)
      .set({ isActive: true, lastUsedAt: new Date() })
      .where(eq(schema.pushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }

  // Notification Preferences
  async getNotificationPreferences(userId?: string, memberId?: string): Promise<schema.NotificationPreference | undefined> {
    const conditions = [];

    if (userId) {
      conditions.push(eq(schema.notificationPreferences.userId, userId));
    }

    if (memberId) {
      conditions.push(eq(schema.notificationPreferences.memberId, memberId));
    }

    if (conditions.length === 0) {
      return undefined;
    }

    const [preference] = await drizzleDb.select()
      .from(schema.notificationPreferences)
      .where(and(...conditions))
      .limit(1);

    return preference;
  }

  async createNotificationPreferences(preferences: schema.InsertNotificationPreference): Promise<schema.NotificationPreference> {
    const [created] = await drizzleDb.insert(schema.notificationPreferences).values(preferences).returning();
    return created;
  }

  async updateNotificationPreferences(id: string, updateData: schema.UpdateNotificationPreference): Promise<schema.NotificationPreference | undefined> {
    const [updated] = await drizzleDb.update(schema.notificationPreferences)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(schema.notificationPreferences.id, id))
      .returning();
    return updated;
  }

  // Notification Delivery Tracking
  async createNotificationDelivery(delivery: schema.InsertNotificationDelivery): Promise<schema.NotificationDelivery> {
    const [created] = await drizzleDb.insert(schema.notificationDeliveries).values(delivery).returning();
    return created;
  }

  async updateNotificationDelivery(id: string, updateData: schema.UpdateNotificationDelivery): Promise<schema.NotificationDelivery | undefined> {
    const [updated] = await drizzleDb.update(schema.notificationDeliveries)
      .set(updateData)
      .where(eq(schema.notificationDeliveries.id, id))
      .returning();
    return updated;
  }

  // Notification History
  async getNotificationHistory(userId?: string, memberId?: string, limit: number = 50): Promise<schema.NotificationDelivery[]> {
    const conditions = [];

    if (userId) {
      conditions.push(eq(schema.notificationDeliveries.userId, userId));
    }

    if (memberId) {
      conditions.push(eq(schema.notificationDeliveries.memberId, memberId));
    }

    const query = drizzleDb.select()
      .from(schema.notificationDeliveries)
      .orderBy(desc(schema.notificationDeliveries.createdAt))
      .limit(limit);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    return await query;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await drizzleDb.update(schema.notificationDeliveries)
      .set({ status: 'clicked', clickedAt: new Date() })
      .where(eq(schema.notificationDeliveries.id, id));
  }

    // Notification Statistics
    async getNotificationStats(userId?: string, memberId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    clicked: number;
    failed: number;
    byCategory: Record<string, number>;
  }> {
    const conditions = [];

    if (userId) {
      conditions.push(eq(schema.notificationDeliveries.userId, userId));
    }

    if (memberId) {
      conditions.push(eq(schema.notificationDeliveries.memberId, memberId));
    }

    const deliveries = await drizzleDb.select()
      .from(schema.notificationDeliveries)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const stats = {
      total: deliveries.length,
      sent: deliveries.filter(d => d.status === 'sent').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      clicked: deliveries.filter(d => d.status === 'clicked').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      byCategory: {} as Record<string, number>
    };

    // Group by category (would need to join with notifications table for actual categories)
    // For now, return empty byCategory
    return stats;
  }

  // Role Permissions
  async getRolePermissions(): Promise<RolePermission[]> {
    return await drizzleDb.select().from(schema.rolePermissionsTable);
  }

  async getRolePermissionsByRole(role: string): Promise<RolePermission | null> {
    const [result] = await drizzleDb.select().from(schema.rolePermissionsTable).where(eq(schema.rolePermissionsTable.role, role));
    return result || null;
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    const rolePerms = await this.getRolePermissionsByRole(role);
    if (rolePerms) {
      return rolePerms.permissions;
    }
    // Fallback to static defaults if not in database
    const staticDefaults: Record<string, string[]> = {
      admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "notifications"],
      manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "notifications"],
      trainer: ["dashboard", "members", "workouts", "attendance"],
      staff: ["dashboard", "leads", "members", "attendance"],
      member: ["dashboard"],
    };
    return staticDefaults[role] || [];
  }

  async updateRolePermissions(role: string, permissions: string[]): Promise<RolePermission | null> {
    const [updated] = await drizzleDb.update(schema.rolePermissionsTable)
      .set({ 
        permissions: permissions,
        updatedAt: new Date()
      })
      .where(eq(schema.rolePermissionsTable.role, role))
      .returning();
    return updated || null;
  }

  async createRolePermission(role: string, permissions: string[]): Promise<RolePermission> {
    const [created] = await drizzleDb.insert(schema.rolePermissionsTable).values({
      role,
      permissions,
    }).returning();
    return created;
  }

  async upsertRolePermissions(role: string, permissions: string[]): Promise<RolePermission> {
    // First try to update
    const [updated] = await drizzleDb.update(schema.rolePermissionsTable)
      .set({ 
        permissions: permissions,
        updatedAt: new Date()
      })
      .where(eq(schema.rolePermissionsTable.role, role))
      .returning();
    
    if (updated) {
      return updated;
    }
    
    // If not found, insert
    const [created] = await drizzleDb.insert(schema.rolePermissionsTable).values({
      role,
      permissions,
    }).returning();
    return created;
  }

  async seedRolePermissions(): Promise<void> {
    const staticDefaults: Record<string, string[]> = {
      admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "notifications"],
      manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "notifications"],
      trainer: ["dashboard", "members", "workouts", "attendance"],
      staff: ["dashboard", "leads", "members", "attendance"],
      member: ["dashboard"],
    };

    for (const [role, permissions] of Object.entries(staticDefaults)) {
      const existing = await this.getRolePermissionsByRole(role);
      if (!existing) {
        await drizzleDb.insert(schema.rolePermissionsTable).values({
          role,
          permissions,
        });
      }
    }
  }

  // Module Control (Superadmin)
  async getAllModuleControls(): Promise<ModuleControl[]> {
    return await drizzleDb.select().from(schema.moduleControl).orderBy(schema.moduleControl.moduleName);
  }

  async getModuleControl(moduleName: string): Promise<ModuleControl | null> {
    const [result] = await drizzleDb.select()
      .from(schema.moduleControl)
      .where(eq(schema.moduleControl.moduleName, moduleName));
    return result || null;
  }

  async updateModuleControl(moduleName: string, updates: UpdateModuleControl): Promise<ModuleControl | null> {
    const [updated] = await drizzleDb.update(schema.moduleControl)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(schema.moduleControl.moduleName, moduleName))
      .returning();
    return updated || null;
  }

  async upsertModuleControl(moduleControl: InsertModuleControl): Promise<ModuleControl> {
    const [created] = await drizzleDb.insert(schema.moduleControl)
      .values(moduleControl)
      .onConflictDoUpdate({
        target: schema.moduleControl.moduleName,
        set: {
          ...moduleControl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return created;
  }

  async seedModuleControls(): Promise<void> {
    // Create table if it doesn't exist
    await drizzleDb.execute(sql`
      CREATE TABLE IF NOT EXISTS module_control (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        module_name TEXT NOT NULL UNIQUE,
        module_label TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    const defaultModules = [
      { moduleName: 'dashboard', moduleLabel: 'Dashboard', description: 'Main dashboard view' },
      { moduleName: 'leads', moduleLabel: 'Leads', description: 'Lead management' },
      { moduleName: 'members', moduleLabel: 'Members', description: 'Member management' },
      { moduleName: 'attendance', moduleLabel: 'Attendance', description: 'Attendance tracking' },
      { moduleName: 'workouts', moduleLabel: 'Workouts & Diet', description: 'Workout and diet management' },
      { moduleName: 'payments', moduleLabel: 'Payments', description: 'Payment management' },
      { moduleName: 'trainers', moduleLabel: 'Personal Trainers', description: 'Trainer management' },
      { moduleName: 'salary', moduleLabel: 'Trainer Salary', description: 'Trainer salary management' },
      { moduleName: 'reports', moduleLabel: 'Reports', description: 'Reports and analytics' },
      { moduleName: 'notifications', moduleLabel: 'Notifications', description: 'Notification management' },
      { moduleName: 'admin', moduleLabel: 'Admin Settings', description: 'Admin settings and configuration' },
      { moduleName: 'options', moduleLabel: 'Options', description: 'System options and preferences' },
    ];

    for (const mod of defaultModules) {
      const existing = await this.getModuleControl(mod.moduleName);
      if (!existing) {
        await drizzleDb.insert(schema.moduleControl).values(mod);
      }
    }
  }

  async getEnabledModules(): Promise<string[]> {
    const modules = await this.getAllModuleControls();
    return modules.filter(m => m.enabled).map(m => m.moduleName);
  }

  async isModuleEnabled(moduleName: string): Promise<boolean> {
    const module = await this.getModuleControl(moduleName);
    return module?.enabled ?? false;
  }
}

export const storage = new DatabaseStorage();
