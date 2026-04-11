import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import * as pg from "pg";
import { eq, count, desc, and, inArray, sql } from "drizzle-orm";
import { createHash } from "crypto";
import * as schema from "../shared/schema";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

function shouldDisableSslVerification(connectionString: string | undefined): boolean {
  if (!connectionString) return false;

  // Common Postgres SSL params
  const lowered = connectionString.toLowerCase();
  // Supabase poolers and some environments set these
  if (lowered.includes("sslmode=no-verify")) return true;
  if (lowered.includes("sslmode=disable")) return true;
  // Some libraries use sslmode=require but still rely on node-postgres rejectUnauthorized=false in dev;
  // we don't infer that here.
  return false;
}

// Lazy pool initialization - only create when first needed for serverless environments
let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;
  
  const connectionString = process.env.DATABASE_URL;
  const rejectUnauthorizedOverride = parseBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED);
  const disableVerificationViaUrl = shouldDisableSslVerification(connectionString);
  const defaultRejectUnauthorized = process.env.NODE_ENV === 'production';
  const rejectUnauthorized =
    rejectUnauthorizedOverride ??
    (disableVerificationViaUrl ? false : defaultRejectUnauthorized);

  console.log("[DB] Creating lazy connection pool...");
  pool = new pg.Pool({
    connectionString,
    ssl: {
      rejectUnauthorized,
      ca: process.env.DATABASE_SSL_CA,
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS || 20000),
  });
  
  return pool;
}

function getDb(): ReturnType<typeof drizzle> {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getPool(), { schema });
  return dbInstance;
}

// Lazy db accessor - will initialize on first use
// Note: We don't use a Proxy here because Drizzle's query builder uses method chaining
// (e.g., db.select().from(...)) which doesn't work well with a Proxy that wraps in functions.
// Instead, we export a getter function that returns the lazily-initialized db instance.
export function getDbInstance() {
  return getDb();
}

// For backward compatibility, export db as the actual instance (lazy)
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const database = getDb();
    return (database as any)[prop];
  }
});

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

// Initialize database schema - this will be done via migrations in production
export async function initializeDatabase() {
  console.log("Database initialization skipped - using Drizzle migrations");
}

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await db.select().from(schema.users).limit(1);
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}

// Graceful database shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      console.log("Database connection closed gracefully");
    }
  } catch (error) {
    console.error("Error closing database connection:", error);
  }
}

export type User = schema.User;
export type Member = schema.Member;
export type Lead = schema.Lead;
export type Branch = schema.Branch;
export type MembershipPlan = schema.MembershipPlan;
export type Attendance = schema.Attendance;
export type WorkoutProgram = schema.WorkoutProgram;
export type DietPlan = schema.DietPlan;
export type WorkoutProgramAssignment = schema.WorkoutProgramAssignment;
export type WorkoutCollection = schema.WorkoutCollection;
export type DietPlanAssignment = schema.DietPlanAssignment;
export type Notification = {
  id: string;
  message: string;
  date: string;
  sentTo: string;
  sentToType: string;
  status: string;
  deliveryStatus: string;
  createdAt: Date;
};

// Helper functions for members
export async function getAllMembers(): Promise<schema.Member[]> {
  const members = await db.select().from(schema.members).orderBy(schema.members.createdAt);
  return members.map(transformMemberToCamelCase);
}

export async function getMemberById(id: string): Promise<schema.Member | null> {
  const result = await db.select().from(schema.members).where(eq(schema.members.id, id));
  const member = result[0];
  return member ? transformMemberToCamelCase(member) : null;
}

export async function getMemberByPhone(phone: string): Promise<schema.Member | null> {
  const result = await db.select().from(schema.members).where(eq(schema.members.phone, phone));
  const member = result[0];
  return member ? transformMemberToCamelCase(member) : null;
}

export async function getMemberByEmail(email: string): Promise<schema.Member | null> {
  const result = await db.select().from(schema.members).where(eq(schema.members.email, email));
  const member = result[0];
  return member ? transformMemberToCamelCase(member) : null;
}

export function transformMemberToCamelCase(member: any): Member {
  // Calculate membership status based on end_date
  const today = new Date();
  let status = member.status;
  
  // Safely handle null/missing endDate
  if (member.endDate && status === "Active") {
    try {
      const endDate = new Date(member.endDate);
      if (!isNaN(endDate.getTime())) {
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          status = "Expired";
        } else if (daysRemaining <= 7) {
          status = "Expiring Soon";
        }
      }
    } catch (dateError) {
      console.warn("Invalid endDate for member:", member.id, member.endDate);
    }
  }

  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone,
    address: member.address,
    gender: member.gender,
    dob: member.dob,
    height: member.height,
    source: member.source,
    interestAreas: member.interest_areas || [],
    healthBackground: member.healthBackground,
    plan: member.plan,
    startDate: member.startDate,
    endDate: member.endDate,
    discount: member.discount,
    totalDue: member.totalDue,
    amountPaid: member.amountPaid,
    paymentMethod: member.paymentMethod,
    assignedStaff: member.assignedStaff,
    status: status,
    avatar: member.avatar,
    avatarStaticUrl: member.avatarStaticUrl,
    branch: member.branch,
    trainerId: member.trainerId ?? null,
    trainingType: member.trainingType ?? null,
    createdAt: member.createdAt,
  };
}

export async function createMember(member: schema.InsertMember): Promise<schema.Member> {
  const [created] = await db.insert(schema.members).values({
    ...member,
    interest_areas: member.interest_areas || [],
  }).returning();
  return transformMemberToCamelCase(created);
}

export async function updateMember(id: string, updates: schema.UpdateMember): Promise<schema.Member | null> {
  const [updated] = await db.update(schema.members).set({
    ...updates,
    interest_areas: updates.interest_areas,
  }).where(eq(schema.members.id, id)).returning();
  return updated ? transformMemberToCamelCase(updated) : null;
}

export async function deleteMember(id: string): Promise<boolean> {
  const result = await db.delete(schema.members).where(eq(schema.members.id, id)).returning();
  return result.length > 0;
}

function transformBranchToCamelCase(branch: any): Branch {
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    contactPerson: branch.contactPerson,
    isActive: branch.isActive,
    createdAt: branch.createdAt,
  };
}

function transformMembershipPlanToCamelCase(plan: any): MembershipPlan {
  return {
    id: plan.id,
    name: plan.name,
    duration: plan.duration,
    durationMonths: plan.durationMonths,
    price: plan.price,
    features: plan.features,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
  };
}

function transformUserToCamelCase(user: any): User {
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function transformAttendanceToCamelCase(record: any): Attendance {
  return {
    id: record.id,
    memberId: record.memberId,
    memberName: record.memberName,
    date: record.date,
    checkInTime: record.checkInTime,
    method: record.method,
    createdAt: record.createdAt,
  };
}

function transformWorkoutProgramToCamelCase(program: any): WorkoutProgram {
  return {
    id: program.id,
    memberId: program.memberId,
    collectionId: program.collectionId ?? null,
    day: program.day,
    name: program.name,
    difficulty: program.difficulty,
    exercises: program.exercises,
    duration: program.duration,
    equipment: program.equipment,
    intensity: program.intensity,
    goal: program.goal,
    createdAt: program.createdAt,
    customWorkoutPlan: program.customWorkoutPlan ?? false,
  };
}

function transformDietPlanToCamelCase(plan: any): DietPlan {
  return {
    id: plan.id,
    memberId: plan.memberId,
    customDiet: plan.customDiet ?? false,
    meal: plan.meal,
    foods: plan.foods,
    calories: plan.calories,
    protein: plan.protein,
    carbs: plan.carbs,
    fat: plan.fat,
    notes: plan.notes ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt ?? plan.createdAt,
  };
}

function transformWorkoutProgramAssignmentToCamelCase(assignment: any): WorkoutProgramAssignment {
  return {
    id: assignment.id,
    programId: assignment.programId,
    memberId: assignment.memberId,
    assignedAt: assignment.assignedAt,
  };
}

// Helper functions for staff/users
export async function getAllUsers(): Promise<schema.User[]> {
  return await db.select().from(schema.users).orderBy(schema.users.createdAt);
}

export async function getUserById(id: string): Promise<schema.User | null> {
  const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return result[0] || null;
}

export async function getUserByUsername(username: string): Promise<schema.User | null> {
  const result = await db.select().from(schema.users).where(eq(schema.users.username, username));
  return result[0] || null;
}

export async function getUserByEmail(email: string): Promise<schema.User | null> {
  const result = await db.select().from(schema.users).where(eq(schema.users.email, email));
  return result[0] || null;
}

export async function getUsersByRole(role: string): Promise<schema.User[]> {
  return await db.select().from(schema.users).where(eq(schema.users.role, role)).orderBy(schema.users.createdAt);
}

export async function createUser(user: schema.InsertUser): Promise<schema.User> {
  const [created] = await db.insert(schema.users).values(user).returning();
  return created;
}

export async function updateUser(id: string, updates: schema.UpdateUser): Promise<schema.User | null> {
  const [updated] = await db.update(schema.users).set(updates).where(eq(schema.users.id, id)).returning();
  return updated || null;
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await db.delete(schema.users).where(eq(schema.users.id, id)).returning();
  return result.length > 0;
}

// Helper functions for staff members (users with role != 'member')
export async function getStaffMembers(): Promise<schema.User[]> {
  const staffRoles = ["admin", "manager", "trainer", "staff"];
  return await db.select().from(schema.users)
    .where(and(inArray(schema.users.role, staffRoles), eq(schema.users.isActive, true)))
    .orderBy(schema.users.createdAt);
}

// Helper functions for attendance
export async function getAllAttendance(): Promise<schema.Attendance[]> {
  return await db.select().from(schema.attendance).orderBy(schema.attendance.date, schema.attendance.checkInTime);
}

export async function getAttendanceById(id: string): Promise<schema.Attendance | null> {
  const result = await db.select().from(schema.attendance).where(eq(schema.attendance.id, id));
  return result[0] || null;
}

export async function getAttendanceByMemberId(memberId: string): Promise<schema.Attendance[]> {
  return await db.select().from(schema.attendance).where(eq(schema.attendance.memberId, memberId)).orderBy(schema.attendance.date, schema.attendance.checkInTime);
}

export async function createAttendance(record: schema.InsertAttendance): Promise<schema.Attendance> {
  const [created] = await db.insert(schema.attendance).values(record).returning();
  return created;
}

export async function updateAttendance(id: string, updates: schema.UpdateAttendance): Promise<schema.Attendance | null> {
  const [updated] = await db.update(schema.attendance).set(updates).where(eq(schema.attendance.id, id)).returning();
  return updated || null;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  const result = await db.delete(schema.attendance).where(eq(schema.attendance.id, id)).returning();
  return result.length > 0;
}

// Helper functions for workout programs
export async function getAllWorkoutPrograms(): Promise<schema.WorkoutProgram[]> {
  return await db.select().from(schema.workoutPrograms).orderBy(schema.workoutPrograms.createdAt);
}

export async function getWorkoutProgramById(id: string): Promise<schema.WorkoutProgram | null> {
  const result = await db.select().from(schema.workoutPrograms).where(eq(schema.workoutPrograms.id, id));
  return result[0] || null;
}

export async function getWorkoutProgramsByMemberId(memberId: string): Promise<schema.WorkoutProgram[]> {
  return await db.select().from(schema.workoutPrograms).where(eq(schema.workoutPrograms.memberId, memberId)).orderBy(schema.workoutPrograms.createdAt);
}

export async function createWorkoutProgram(program: schema.InsertWorkoutProgram): Promise<schema.WorkoutProgram> {
  const [created] = await db.insert(schema.workoutPrograms).values({
    name: program.name,
    duration: program.duration,
    day: program.day,
    difficulty: program.difficulty,
    exercises: program.exercises as any,
    equipment: program.equipment as any,
    intensity: program.intensity,
    goal: program.goal,
    memberId: program.memberId,
  }).returning();
  return created;
}

export async function updateWorkoutProgram(id: string, updates: schema.UpdateWorkoutProgram): Promise<schema.WorkoutProgram | null> {
  const [updated] = await db.update(schema.workoutPrograms).set({
    ...updates,
    exercises: updates.exercises ? sql`'${JSON.stringify(updates.exercises)}'::jsonb` : undefined,
    equipment: updates.equipment ? sql`'${JSON.stringify(updates.equipment)}'::jsonb` : undefined,
  }).where(eq(schema.workoutPrograms.id, id)).returning();
  return updated || null;
}

export async function deleteWorkoutProgram(id: string): Promise<boolean> {
  const result = await db.delete(schema.workoutPrograms).where(eq(schema.workoutPrograms.id, id)).returning();
  return result.length > 0;
}

// Helper functions for diet plans
export async function getAllDietPlans(): Promise<schema.DietPlan[]> {
  return await db.select().from(schema.dietPlans).orderBy(schema.dietPlans.createdAt);
}

export async function getDietPlanById(id: string): Promise<schema.DietPlan | null> {
  const result = await db.select().from(schema.dietPlans).where(eq(schema.dietPlans.id, id));
  return result[0] || null;
}

export async function getDietPlansByMemberId(memberId: string): Promise<schema.DietPlan[]> {
  return await db.select().from(schema.dietPlans).where(eq(schema.dietPlans.memberId, memberId)).orderBy(schema.dietPlans.createdAt);
}

export async function createDietPlan(plan: schema.InsertDietPlan): Promise<schema.DietPlan> {
  const [created] = await db.insert(schema.dietPlans).values({
    ...plan,
    customDiet: plan.customDiet ?? false,
    foods: sql`'${JSON.stringify(plan.foods || [])}'::jsonb`,
  }).returning();
  return transformDietPlanToCamelCase(created);
}

export async function updateDietPlan(id: string, updates: schema.UpdateDietPlan): Promise<schema.DietPlan | null> {
  const [updated] = await db.update(schema.dietPlans).set({
    ...updates,
    foods: updates.foods ? sql`'${JSON.stringify(updates.foods)}'::jsonb` : undefined,
  }).where(eq(schema.dietPlans.id, id)).returning();
  return updated || null;
}

export async function deleteDietPlan(id: string): Promise<boolean> {
  const result = await db.delete(schema.dietPlans).where(eq(schema.dietPlans.id, id)).returning();
  return result.length > 0;
}

// Helper functions for branches
export async function getAllBranches(): Promise<schema.Branch[]> {
  const branches = await db.select().from(schema.branches).where(eq(schema.branches.isActive, true)).orderBy(schema.branches.name);
  return branches.map(transformBranchToCamelCase);
}

export async function getBranchById(id: string): Promise<schema.Branch | null> {
  const result = await db.select().from(schema.branches).where(eq(schema.branches.id, id));
  const branch = result[0];
  return branch ? transformBranchToCamelCase(branch) : null;
}

export async function createBranch(branch: schema.InsertBranch): Promise<schema.Branch> {
  const [created] = await db.insert(schema.branches).values(branch).returning();
  return transformBranchToCamelCase(created);
}

export async function updateBranch(id: string, updates: schema.UpdateBranch): Promise<schema.Branch | null> {
  const [updated] = await db.update(schema.branches).set(updates).where(eq(schema.branches.id, id)).returning();
  return updated ? transformBranchToCamelCase(updated) : null;
}

export async function deleteBranch(id: string): Promise<boolean> {
  await db.update(schema.branches).set({ isActive: false }).where(eq(schema.branches.id, id));
  return true;
}

// Helper functions for leads
export async function getAllLeads(): Promise<schema.Lead[]> {
  const leads = await db.select().from(schema.leads).orderBy(schema.leads.createdAt);
  return leads.map(transformLeadToCamelCase);
}

export async function getLeadById(id: string): Promise<schema.Lead | null> {
  const result = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
  const lead = result[0];
  return lead ? transformLeadToCamelCase(lead) : null;
}

function transformLeadToCamelCase(lead: any): Lead {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    gender: lead.gender,
    interestAreas: lead.interestAreas || [],
    healthBackground: lead.healthBackground,
    source: lead.source,
    priority: lead.priority,
    assignedStaff: lead.assignedStaff,
    followUpDate: lead.followUpDate,
    dob: lead.dob,
    height: lead.height,
    notes: lead.notes,
    followUpCompleted: lead.followUpCompleted,
    status: lead.status,
    branch: lead.branch,
    createdAt: lead.createdAt,
  };
}

export async function createLead(lead: schema.InsertLead): Promise<schema.Lead> {
  const [created] = await db.insert(schema.leads).values(lead).returning();
  return transformLeadToCamelCase(created);
}

export async function updateLead(id: string, updates: schema.UpdateLead): Promise<schema.Lead | null> {
  const [updated] = await db.update(schema.leads).set(updates).where(eq(schema.leads.id, id)).returning();
  return updated ? transformLeadToCamelCase(updated) : null;
}

export async function deleteLead(id: string): Promise<boolean> {
  const result = await db.delete(schema.leads).where(eq(schema.leads.id, id)).returning();
  return result.length > 0;
}

// Membership Plans
export async function getAllPlans(): Promise<schema.MembershipPlan[]> {
  const plans = await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.isActive, true));
  return plans.map(transformMembershipPlanToCamelCase);
}

export async function getPlanById(id: string): Promise<schema.MembershipPlan | null> {
  const result = await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, id));
  const plan = result[0];
  return plan ? transformMembershipPlanToCamelCase(plan) : null;
}

export async function createPlan(plan: schema.InsertPlan): Promise<schema.MembershipPlan> {
  const [created] = await db.insert(schema.membershipPlans).values({
    ...plan,
    features: plan.features || [],
  }).returning();
  return transformMembershipPlanToCamelCase(created);
}

export async function updatePlan(id: string, updates: schema.UpdatePlan): Promise<schema.MembershipPlan | null> {
  const [updated] = await db.update(schema.membershipPlans).set({
    ...updates,
    features: updates.features,
  }).where(eq(schema.membershipPlans.id, id)).returning();
  return updated ? transformMembershipPlanToCamelCase(updated) : null;
}

export async function deletePlan(id: string): Promise<boolean> {
  await db.update(schema.membershipPlans).set({ isActive: false }).where(eq(schema.membershipPlans.id, id));
  return true;
}

// Inventory Items
export async function getAllInventory(): Promise<schema.InventoryItem[]> {
  return await db.select().from(schema.inventoryItems);
}

export async function getInventoryItem(id: string): Promise<schema.InventoryItem | null> {
  const result = await db.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, id));
  return result[0] || null;
}

export async function createInventoryItem(item: schema.InsertInventory): Promise<schema.InventoryItem> {
  const [created] = await db.insert(schema.inventoryItems).values(item).returning();
  return created;
}

export async function updateInventoryItem(id: string, updates: schema.UpdateInventory): Promise<schema.InventoryItem | null> {
  const [updated] = await db.update(schema.inventoryItems).set(updates).where(eq(schema.inventoryItems.id, id)).returning();
  return updated || null;
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const result = await db.delete(schema.inventoryItems).where(eq(schema.inventoryItems.id, id)).returning();
  return result.length > 0;
}

// Role Permissions Helper Functions
export async function getRolePermissions(): Promise<schema.RolePermission[]> {
  return await db.select().from(schema.rolePermissionsTable);
}

export async function getRolePermissionsByRole(role: string): Promise<schema.RolePermission | null> {
  const result = await db.select().from(schema.rolePermissionsTable).where(eq(schema.rolePermissionsTable.role, role));
  return result[0] || null;
}

export async function getPermissionsForRole(role: string): Promise<string[]> {
  const rolePerms = await getRolePermissionsByRole(role);
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

export async function updateRolePermissions(role: string, permissions: string[]): Promise<schema.RolePermission | null> {
  const [updated] = await db.update(schema.rolePermissionsTable)
    .set({ 
      permissions: permissions,
      updatedAt: new Date()
    })
    .where(eq(schema.rolePermissionsTable.role, role))
    .returning();
  return updated || null;
}

export async function seedRolePermissions(): Promise<void> {
  const staticDefaults: Record<string, string[]> = {
    admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "notifications"],
    manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "notifications"],
    trainer: ["dashboard", "members", "workouts", "attendance"],
    staff: ["dashboard", "leads", "members", "attendance"],
    member: ["dashboard"],
  };

  for (const [role, permissions] of Object.entries(staticDefaults)) {
    const existing = await getRolePermissionsByRole(role);
    if (!existing) {
      await db.insert(schema.rolePermissionsTable).values({
        role,
        permissions,
      });
    }
  }
}

// Helper functions for member measurements
export async function getMemberMeasurements(memberId: string): Promise<any[]> {
  return await db.select().from(schema.memberMeasurements).where(eq(schema.memberMeasurements.memberId, memberId)).orderBy(desc(schema.memberMeasurements.date));
}

export async function getMemberMeasurementById(id: string): Promise<any | null> {
  const result = await db.select().from(schema.memberMeasurements).where(eq(schema.memberMeasurements.id, id));
  return result[0] || null;
}

export async function createMemberMeasurement(measurement: any): Promise<any> {
  const [created] = await db.insert(schema.memberMeasurements).values(measurement).returning();
  return created;
}

export async function updateMemberMeasurement(id: string, updates: any): Promise<any | null> {
  const [updated] = await db.update(schema.memberMeasurements).set(updates).where(eq(schema.memberMeasurements.id, id)).returning();
  return updated || null;
}

export async function deleteMemberMeasurement(id: string): Promise<boolean> {
  const result = await db.delete(schema.memberMeasurements).where(eq(schema.memberMeasurements.id, id)).returning();
  return result.length > 0;
}

function transformMeasurementToCamelCase(measurement: any): any {
  return {
    id: measurement.id,
    memberId: measurement.memberId,
    date: measurement.date,
    chest: measurement.chest,
    waist: measurement.waist,
    arms: measurement.arms,
    thighs: measurement.thighs,
    createdAt: measurement.createdAt,
  };
}

// Helper functions for push subscriptions
export async function savePushSubscription(subscription: schema.InsertPushSubscription): Promise<schema.PushSubscription> {
  const [created] = await db.insert(schema.pushSubscriptions).values(subscription).returning();
  return created;
}

export async function getPushSubscriptionByEndpoint(endpoint: string): Promise<schema.PushSubscription | null> {
  const result = await db.select().from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
  return result[0] || null;
}

export async function getPushSubscriptionsByUser(userId?: string, memberId?: string): Promise<schema.PushSubscription[]> {
  const conditions = [eq(schema.pushSubscriptions.isActive, true)];

  if (userId) {
    conditions.push(eq(schema.pushSubscriptions.userId, userId));
  }

  if (memberId) {
    conditions.push(eq(schema.pushSubscriptions.memberId, memberId));
  }

  return await db.select()
    .from(schema.pushSubscriptions)
    .where(and(...conditions))
    .orderBy(schema.pushSubscriptions.createdAt);
}

export async function deactivatePushSubscription(endpoint: string): Promise<boolean> {
  const result = await db.update(schema.pushSubscriptions)
    .set({ isActive: false })
    .where(eq(schema.pushSubscriptions.endpoint, endpoint))
    .returning();
  return result.length > 0;
}

export async function cleanupOldPushSubscriptions(): Promise<number> {
  // For now, just return 0 - in production you might want to implement proper cleanup
  // with raw SQL or a more complex query
  return 0;
}