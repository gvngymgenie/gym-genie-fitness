import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = ["admin", "manager", "trainer", "staff", "member"] as const;
export type Role = typeof roleEnum[number];

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  phone: text("phone"),
  role: text("role").notNull().default("member"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, "password">;

export const rolePermissions: Record<Role, string[]> = {
  admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "settings"],
  manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "settings"],
  trainer: ["dashboard", "members", "workouts", "attendance"],
  staff: ["dashboard", "leads", "members", "attendance"],
  member: ["dashboard"],
};

// Membership Plans
export const membershipPlans = pgTable("membership_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  duration: text("duration").notNull(),
  durationMonths: integer("duration_months").notNull(),
  price: integer("price").notNull(),
  features: text("features").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
});

export const updatePlanSchema = createInsertSchema(membershipPlans).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type UpdatePlan = z.infer<typeof updatePlanSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;

// Interest Options
export const interestOptions = pgTable("interest_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertInterestOptionSchema = createInsertSchema(interestOptions).omit({
  id: true,
  createdAt: true,
});

export const updateInterestOptionSchema = createInsertSchema(interestOptions).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertInterestOption = z.infer<typeof insertInterestOptionSchema>;
export type UpdateInterestOption = z.infer<typeof updateInterestOptionSchema>;
export type InterestOption = typeof interestOptions.$inferSelect;

// Health Options
export const healthOptions = pgTable("health_options", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHealthOptionSchema = createInsertSchema(healthOptions).omit({
  id: true,
  createdAt: true,
});

export const updateHealthOptionSchema = createInsertSchema(healthOptions).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertHealthOption = z.infer<typeof insertHealthOptionSchema>;
export type UpdateHealthOption = z.infer<typeof updateHealthOptionSchema>;
export type HealthOption = typeof healthOptions.$inferSelect;

// Inventory Items
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  stock: integer("stock").notNull().default(0),
  purchaseDate: text("purchase_date"),
  needsService: boolean("needs_service").notNull().default(false),
  nextServiceDate: text("next_service_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventorySchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
});

export const updateInventorySchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type UpdateInventory = z.infer<typeof updateInventorySchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

// Leads
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  gender: text("gender").notNull().default("male"),
  interestAreas: text("interest_areas").array().notNull().default(sql`ARRAY[]::TEXT[]`),
  healthBackground: text("health_background"),
  source: text("source").notNull(),
  priority: text("priority").notNull().default("medium"),
  assignedStaff: text("assigned_staff"),
  followUpDate: text("follow_up_date"),
  dob: text("dob"),
  height: integer("height"),
  notes: text("notes"),
  followUpCompleted: boolean("follow_up_completed").notNull().default(false),
  status: text("status").notNull().default("new"),
  branch: text("branch"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const updateLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type UpdateLead = z.infer<typeof updateLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Members
export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").references(() => users.id),
  trainingType: text("training_type"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  gender: text("gender").notNull().default("male"),
  dob: text("dob"),
  height: integer("height"),
  source: text("source").notNull(),
  interest_areas: text("interest_areas").array().notNull().default(sql`ARRAY[]::TEXT[]`),
  healthBackground: text("health_background"),
  plan: text("plan").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  discount: integer("discount").default(0),
  totalDue: integer("total_due").default(0),
  amountPaid: integer("amount_paid").default(0),
  paymentMethod: text("payment_method"),
  assignedStaff: text("assigned_staff"),
  status: text("status").notNull().default("Active"),
  avatar: text("avatar"),
  avatarStaticUrl: text("avatar_static_url"),
  branch: text("branch"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
});

export const updateMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type UpdateMember = z.infer<typeof updateMemberSchema>;
export type MemberDB = typeof members.$inferSelect;

// Use camelCase for frontend
export type Member = Omit<MemberDB, "interest_areas"> & {
  interestAreas: string[];
  trainerId?: string | null;
  trainingType?: string | null;
};
// Company Settings
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull().default("Lime Fitness"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logo: text("logo"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
});

export const updateCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  updatedAt: true,
}).partial();

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type UpdateCompanySettings = z.infer<typeof updateCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

// Branches
export const branches = pgTable("branches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  contactPerson: text("contact_person"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
});

export const updateBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type UpdateBranch = z.infer<typeof updateBranchSchema>;
export type Branch = typeof branches.$inferSelect;

// Attendance
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name").notNull(),
  date: text("date").notNull(),
  checkInTime: text("check_in_time").notNull(),
  method: text("method").notNull().default("Manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const updateAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type UpdateAttendance = z.infer<typeof updateAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// Workout Programs
export const workoutPrograms = pgTable("workout_programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id"),
  customWorkoutPlan: boolean("custom_workout_plan").notNull().default(false),
  day: text("day").notNull(),
  name: text("name").notNull(),
  difficulty: text("difficulty").notNull().default("Intermediate"),
  exercises: jsonb("exercises").notNull().$type<{ name: string; sets: number; reps: string; weight: string; rest: string; notes?: string }[]>(),
  duration: integer("duration").notNull(),
  equipment: jsonb("equipment").notNull().$type<string[]>(),
  intensity: integer("intensity").notNull().default(5),
  goal: text("goal").default("Hypertrophy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkoutProgramSchema = createInsertSchema(workoutPrograms).omit({
  id: true,
  createdAt: true,
}).extend({
  memberId: z.string().nullable().optional(),
});

export const updateWorkoutProgramSchema = createInsertSchema(workoutPrograms).omit({
  id: true,
  createdAt: true,
}).extend({
  memberId: z.string().nullable().optional(),
}).partial();

export type InsertWorkoutProgram = z.infer<typeof insertWorkoutProgramSchema>;
export type UpdateWorkoutProgram = z.infer<typeof updateWorkoutProgramSchema>;
export type WorkoutProgram = typeof workoutPrograms.$inferSelect;

// Diet Plans
export const dietPlans = pgTable("diet_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id"),
  customDiet: boolean("custom_diet").notNull().default(false),
  meal: text("meal").notNull(),
  foods: jsonb("foods").notNull().$type<string[]>(),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDietPlanSchema = createInsertSchema(dietPlans).omit({
  id: true,
  createdAt: true,
}).extend({
  memberId: z.string().nullable().optional(),
});

export const updateDietPlanSchema = createInsertSchema(dietPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  memberId: z.string().nullable().optional(),
}).partial();

export type InsertDietPlan = z.infer<typeof insertDietPlanSchema>;
export type UpdateDietPlan = z.infer<typeof updateDietPlanSchema>;
export type DietPlan = typeof dietPlans.$inferSelect;

// Workout Program Assignments (many-to-many junction table)
export const workoutProgramAssignments = pgTable("workout_program_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  programId: varchar("program_id").notNull(),
  memberId: varchar("member_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertWorkoutProgramAssignmentSchema = createInsertSchema(workoutProgramAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertWorkoutProgramAssignment = z.infer<typeof insertWorkoutProgramAssignmentSchema>;
export type WorkoutProgramAssignment = typeof workoutProgramAssignments.$inferSelect;

// Diet Plan Assignments (many-to-many junction table)
export const dietPlanAssignments = pgTable("diet_plan_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dietPlanId: varchar("diet_plan_id").notNull(),
  memberId: varchar("member_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertDietPlanAssignmentSchema = createInsertSchema(dietPlanAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertDietPlanAssignment = z.infer<typeof insertDietPlanAssignmentSchema>;
export type DietPlanAssignment = typeof dietPlanAssignments.$inferSelect;

// Member Measurements (body measurements tracking)
export const memberMeasurements = pgTable("member_measurements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  date: text("date").notNull(),
  chest: real("chest").notNull(),
  waist: real("waist").notNull(),
  arms: real("arms").notNull(),
  thighs: real("thighs").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemberMeasurementSchema = createInsertSchema(memberMeasurements).omit({
  id: true,
  createdAt: true,
});

export const updateMemberMeasurementSchema = createInsertSchema(memberMeasurements).omit({
  id: true,
  memberId: true,
  createdAt: true,
}).partial();

export type InsertMemberMeasurement = z.infer<typeof insertMemberMeasurementSchema>;
export type UpdateMemberMeasurement = z.infer<typeof updateMemberMeasurementSchema>;
export type MemberMeasurement = typeof memberMeasurements.$inferSelect;

// Trainer Profiles (extends users with trainer-specific data)
export const trainerProfiles = pgTable("trainer_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull().unique(),
  specializations: text("specializations").array().notNull(),
  interestAreas: text("interest_areas").array().notNull().default(sql`ARRAY[]::TEXT[]`),
  weeklySlotCapacity: integer("weekly_slot_capacity").notNull().default(20),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTrainerProfileSchema = createInsertSchema(trainerProfiles).omit({
  id: true,
  updatedAt: true,
});

export const updateTrainerProfileSchema = createInsertSchema(trainerProfiles).omit({
  id: true,
  trainerId: true,
  updatedAt: true,
}).partial();

export type InsertTrainerProfile = z.infer<typeof insertTrainerProfileSchema>;
export type UpdateTrainerProfile = z.infer<typeof updateTrainerProfileSchema>;
export type TrainerProfile = typeof trainerProfiles.$inferSelect;

// Trainer Availability (daily slot capacity by period)
export const periodEnum = ["morning", "noon", "evening"] as const;
export type Period = typeof periodEnum[number];

export const trainerAvailability = pgTable("trainer_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  slotDate: text("slot_date").notNull(),
  period: text("period").notNull(),
  slotCapacity: integer("slot_capacity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTrainerAvailabilitySchema = createInsertSchema(trainerAvailability).omit({
  id: true,
  updatedAt: true,
});

export const updateTrainerAvailabilitySchema = createInsertSchema(trainerAvailability).omit({
  id: true,
  trainerId: true,
  updatedAt: true,
}).partial();

export type InsertTrainerAvailability = z.infer<typeof insertTrainerAvailabilitySchema>;
export type UpdateTrainerAvailability = z.infer<typeof updateTrainerAvailabilitySchema>;
export type TrainerAvailability = typeof trainerAvailability.$inferSelect;

// Trainer Bookings (member slot bookings with trainers)
export const trainerBookings = pgTable("trainer_bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  memberId: varchar("member_id").notNull(),
  bookingDate: text("booking_date").notNull(),
  period: text("period").notNull().default("morning"),
  slotNumber: integer("slot_number").notNull().default(1),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrainerBookingSchema = createInsertSchema(trainerBookings).omit({
  id: true,
  createdAt: true,
});

export const updateTrainerBookingSchema = createInsertSchema(trainerBookings).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertTrainerBooking = z.infer<typeof insertTrainerBookingSchema>;
export type UpdateTrainerBooking = z.infer<typeof updateTrainerBookingSchema>;
export type TrainerBooking = typeof trainerBookings.$inferSelect;

// Trainer Feedback (client feedback for trainers)
export const trainerFeedback = pgTable("trainer_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trainerId: varchar("trainer_id").notNull(),
  memberId: varchar("member_id").notNull(),
  bookingId: varchar("booking_id"),
  rating: integer("rating").notNull(),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertTrainerFeedbackSchema = createInsertSchema(trainerFeedback).omit({
  id: true,
  submittedAt: true,
});

export type InsertTrainerFeedback = z.infer<typeof insertTrainerFeedbackSchema>;
export type TrainerFeedback = typeof trainerFeedback.$inferSelect;

// OTP for member phone authentication
export const memberOtps = pgTable("member_otps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemberOtpSchema = createInsertSchema(memberOtps).omit({
  id: true,
  verified: true,
  createdAt: true,
});

export type InsertMemberOtp = z.infer<typeof insertMemberOtpSchema>;
export type MemberOtp = typeof memberOtps.$inferSelect;

// BMI Records (body metrics tracking)
export const bmiRecords = pgTable("bmi_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  recordDate: text("record_date").notNull(),
  bodyWeight: real("body_weight"),
  bmi: real("bmi"),
  bodyFatPercentage: real("body_fat_percentage"),
  muscleMass: real("muscle_mass"),
  bodyWaterPercentage: real("body_water_percentage"),
  boneMass: real("bone_mass"),
  visceralFat: real("visceral_fat"),
  subcutaneousFat: real("subcutaneous_fat"),
  bmr: real("bmr"),
  proteinPercentage: real("protein_percentage"),
  metabolicAge: integer("metabolic_age"),
  leanBodyMass: real("lean_body_mass"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBmiRecordSchema = createInsertSchema(bmiRecords).omit({
  id: true,
  createdAt: true,
});

export type InsertBmiRecord = z.infer<typeof insertBmiRecordSchema>;
export type BmiRecord = typeof bmiRecords.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  date: text("date").notNull(),
  sentTo: text("sent_to").notNull(),
  sentToType: text("sent_to_type").notNull(), // 'all', 'trainers', 'specific'
  status: text("status").notNull().default("sent"),
  deliveryStatus: text("delivery_status").notNull().default("delivered"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const updateNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type UpdateNotification = z.infer<typeof updateNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Push Notification Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  memberId: varchar("member_id"),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const updatePushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
}).partial();

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type UpdatePushSubscription = z.infer<typeof updatePushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// User Notification Preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  memberId: varchar("member_id"),
  categoryWorkouts: boolean("category_workouts").notNull().default(true),
  categoryDiet: boolean("category_diet").notNull().default(true),
  categoryOtp: boolean("category_otp").notNull().default(true),
  categoryAnnouncements: boolean("category_announcements").notNull().default(true),
  categoryPromotions: boolean("category_promotions").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").default('21:00'),
  quietHoursEnd: text("quiet_hours_end").default('07:00'),
  frequencyDigest: boolean("frequency_digest").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type UpdateNotificationPreference = z.infer<typeof updateNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// Notification Delivery Tracking
export const notificationDeliveries = pgTable("notification_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: varchar("notification_id"),
  userId: varchar("user_id"),
  memberId: varchar("member_id"),
  fcmToken: text("fcm_token"),
  status: text("status").notNull().default('sent'), // sent, delivered, clicked, failed
  deliveredAt: timestamp("delivered_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationDeliverySchema = createInsertSchema(notificationDeliveries).omit({
  id: true,
  createdAt: true,
});

export const updateNotificationDeliverySchema = createInsertSchema(notificationDeliveries).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertNotificationDelivery = z.infer<typeof insertNotificationDeliverySchema>;
export type UpdateNotificationDelivery = z.infer<typeof updateNotificationDeliverySchema>;
export type NotificationDelivery = typeof notificationDeliveries.$inferSelect;

// Notification Templates
export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // workout, diet, otp, announcement, promotion
  titleTemplate: text("title_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  icon: text("icon").default('/icon-192.svg'),
  badge: text("badge").default('/icon-192.svg'),
  requireInteraction: boolean("require_interaction").notNull().default(false),
  silent: boolean("silent").notNull().default(false),
  url: text("url"),
  variables: jsonb("variables").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type UpdateNotificationTemplate = z.infer<typeof updateNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// Scheduled Notifications
export const scheduledNotifications = pgTable("scheduled_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id"),
  userId: varchar("user_id"),
  memberId: varchar("member_id"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon"),
  badge: text("badge"),
  url: text("url"),
  data: jsonb("data"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").notNull().default('pending'), // pending, sent, cancelled, failed
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduledNotificationSchema = createInsertSchema(scheduledNotifications).omit({
  id: true,
  createdAt: true,
});

export const updateScheduledNotificationSchema = createInsertSchema(scheduledNotifications).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertScheduledNotification = z.infer<typeof insertScheduledNotificationSchema>;
export type UpdateScheduledNotification = z.infer<typeof updateScheduledNotificationSchema>;
export type ScheduledNotification = typeof scheduledNotifications.$inferSelect;

// REVENUE TRACKING TABLES (NEW)

// Revenue Transactions - Track all income sources
export const revenueTransactions = pgTable("revenue_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(),
  amount: integer("amount").notNull(),
  sourceType: text("source_type").notNull(), // 'membership', 'renewal', 'merchandise', 'service', 'other'
  sourceId: varchar("source_id"), // member_id, inventory_item_id, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevenueTransactionSchema = createInsertSchema(revenueTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertRevenueTransaction = z.infer<typeof insertRevenueTransactionSchema>;
export type RevenueTransaction = typeof revenueTransactions.$inferSelect;

// Daily Revenue Summary - Pre-calculated daily aggregates for performance
export const revenueSummary = pgTable("revenue_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull().unique(),
  totalRevenue: integer("total_revenue").notNull().default(0),
  membershipRevenue: integer("membership_revenue").notNull().default(0),
  renewalRevenue: integer("renewal_revenue").notNull().default(0),
  merchandiseRevenue: integer("merchandise_revenue").notNull().default(0),
  serviceRevenue: integer("service_revenue").notNull().default(0),
  otherRevenue: integer("other_revenue").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRevenueSummarySchema = createInsertSchema(revenueSummary).omit({
  id: true,
  updatedAt: true,
});

export const updateRevenueSummarySchema = createInsertSchema(revenueSummary).omit({
  id: true,
  date: true,
  updatedAt: true,
}).partial();

export type InsertRevenueSummary = z.infer<typeof insertRevenueSummarySchema>;
export type UpdateRevenueSummary = z.infer<typeof updateRevenueSummarySchema>;
export type RevenueSummary = typeof revenueSummary.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  members: many(members),
  leads: many(leads),
  inventoryItems: many(inventoryItems),
  plans: many(membershipPlans),
  companySettings: many(companySettings),
  branches: many(branches),
  attendance: many(attendance),
  workoutPrograms: many(workoutPrograms),
  dietPlans: many(dietPlans),
  memberMeasurements: many(memberMeasurements),
  trainerProfiles: many(trainerProfiles),
  trainerAvailability: many(trainerAvailability),
  trainerBookings: many(trainerBookings),
  trainerFeedback: many(trainerFeedback),
  bmiRecords: many(bmiRecords),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
  notificationPreferences: many(notificationPreferences),
  notificationDeliveries: many(notificationDeliveries),
  notificationTemplates: many(notificationTemplates),
  scheduledNotifications: many(scheduledNotifications),
  revenueTransactions: many(revenueTransactions),
  revenueSummary: many(revenueSummary),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.assignedStaff],
    references: [users.id],
  }),
  measurements: many(memberMeasurements),
  bmiRecords: many(bmiRecords),
  workoutPrograms: many(workoutPrograms),
  dietPlans: many(dietPlans),
  attendance: many(attendance),
  trainerBookings: many(trainerBookings),
  trainerFeedback: many(trainerFeedback),
  revenueTransactions: many(revenueTransactions),
}));

export const revenueTransactionsRelations = relations(revenueTransactions, ({ one }) => ({
  member: one(members, {
    fields: [revenueTransactions.sourceId],
    references: [members.id],
  }),
}));

export const revenueSummaryRelations = relations(revenueSummary, ({ many }) => ({
  transactions: many(revenueTransactions),
}));

// PAYMENTS (NEW)
// Tracks individual payment receipts against a member.
// Note: We keep Member.amountPaid for backward compatibility, but payments should become the source of truth.
export const paymentMethodEnum = [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = typeof paymentMethodEnum[number];

export const paymentStatusEnum = [
  "paid",
  "pending",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = typeof paymentStatusEnum[number];

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  originalAmount: integer("original_amount").notNull(),
  amount: integer("amount").notNull(),
  discountPercentage: integer("discount_percentage").default(0),
  method: text("method").notNull(), // PaymentMethod
  status: text("status").notNull().default("paid"), // PaymentStatus
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  notes: text("notes"),
  receivedByUserId: varchar("received_by_user_id").references(() => users.id),
  // For future online integrations
  externalProvider: text("external_provider"),
  externalPaymentId: text("external_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  paymentDate: true,
}).extend({
  originalAmount: z.number().int().positive(),
  discountPercentage: z.number().int().min(0).max(100).optional().default(0),
});

export const updatePaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  originalAmount: true,
}).partial().extend({
  discountPercentage: z.number().int().min(0).max(100).optional(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type UpdatePayment = z.infer<typeof updatePaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Role Permissions Table
export const rolePermissionsTable = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: text("role").notNull().unique(),
  permissions: text("permissions").array().notNull().default(sql`ARRAY[]::TEXT[]`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type UpdateRolePermission = z.infer<typeof updateRolePermissionSchema>;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;

// Training Types (for member training type selection)
export const trainingTypes = pgTable("training_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTrainingTypeSchema = createInsertSchema(trainingTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTrainingTypeSchema = createInsertSchema(trainingTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertTrainingType = z.infer<typeof insertTrainingTypeSchema>;
export type UpdateTrainingType = z.infer<typeof updateTrainingTypeSchema>;
export type TrainingType = typeof trainingTypes.$inferSelect;

// Member Credits - AI credit balance tracking for members
export const memberCredits = pgTable("member_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  balance: integer("balance").notNull().default(5),
  totalCreditsUsed: integer("total_credits_used").notNull().default(0),
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemberCreditsSchema = createInsertSchema(memberCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMemberCreditsSchema = createInsertSchema(memberCredits).omit({
  id: true,
  memberId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertMemberCredits = z.infer<typeof insertMemberCreditsSchema>;
export type UpdateMemberCredits = z.infer<typeof updateMemberCreditsSchema>;
export type MemberCredits = typeof memberCredits.$inferSelect;

// Admin AI Usage - Track admin/staff AI usage
export const adminAiUsage = pgTable("admin_ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull(),
  adminName: text("admin_name"),
  adminEmail: text("admin_email"),
  featureType: text("feature_type").notNull(), // 'workout_generation', 'diet_generation', 'analysis', 'reports'
  actionDescription: text("action_description").notNull(),
  creditsUsed: integer("credits_used").notNull().default(0),
  promptTokens: integer("prompt_tokens"),
  responseTokens: integer("response_tokens"),
  totalTokens: integer("total_tokens"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminAiUsageSchema = createInsertSchema(adminAiUsage).omit({
  id: true,
  createdAt: true,
});

export const updateAdminAiUsageSchema = createInsertSchema(adminAiUsage).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertAdminAiUsage = z.infer<typeof insertAdminAiUsageSchema>;
export type UpdateAdminAiUsage = z.infer<typeof updateAdminAiUsageSchema>;
export type AdminAiUsage = typeof adminAiUsage.$inferSelect;

// Member AI Usage Summary - Aggregate view of member AI usage
export const memberAiUsageSummary = pgTable("member_ai_usage_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull(),
  memberName: text("member_name"),
  memberEmail: text("member_email"),
  totalWorkoutGenerations: integer("total_workout_generations").notNull().default(0),
  totalDietGenerations: integer("total_diet_generations").notNull().default(0),
  totalCreditsUsed: integer("total_credits_used").notNull().default(0),
  lastUsageAt: timestamp("last_usage_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMemberAiUsageSummarySchema = createInsertSchema(memberAiUsageSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMemberAiUsageSummarySchema = createInsertSchema(memberAiUsageSummary).omit({
  id: true,
  memberId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertMemberAiUsageSummary = z.infer<typeof insertMemberAiUsageSummarySchema>;
export type UpdateMemberAiUsageSummary = z.infer<typeof updateMemberAiUsageSummarySchema>;
export type MemberAiUsageSummary = typeof memberAiUsageSummary.$inferSelect;

// Daily AI Usage - Aggregates for reporting
export const dailyAiUsage = pgTable("daily_ai_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  usageDate: text("usage_date").notNull().unique(),
  memberWorkoutCount: integer("member_workout_count").notNull().default(0),
  memberDietCount: integer("member_diet_count").notNull().default(0),
  memberCreditsUsed: integer("member_credits_used").notNull().default(0),
  adminWorkoutCount: integer("admin_workout_count").notNull().default(0),
  adminDietCount: integer("admin_diet_count").notNull().default(0),
  adminCreditsUsed: integer("admin_credits_used").notNull().default(0),
  totalRequests: integer("total_requests").notNull().default(0),
  successfulRequests: integer("successful_requests").notNull().default(0),
  failedRequests: integer("failed_requests").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyAiUsageSchema = createInsertSchema(dailyAiUsage).omit({
  id: true,
  createdAt: true,
});

export const updateDailyAiUsageSchema = createInsertSchema(dailyAiUsage).omit({
  id: true,
  usageDate: true,
  createdAt: true,
}).partial();

export type InsertDailyAiUsage = z.infer<typeof insertDailyAiUsageSchema>;
export type UpdateDailyAiUsage = z.infer<typeof updateDailyAiUsageSchema>;
export type DailyAiUsage = typeof dailyAiUsage.$inferSelect;

// Credit Packages - Predefined credit packages for purchase
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  price: integer("price").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCreditPackageSchema = createInsertSchema(creditPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type UpdateCreditPackage = z.infer<typeof updateCreditPackageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;

// Credit Transactions - Log of all credit balance changes
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => members.id),
  type: text("type").notNull(), // 'topup', 'deduct', 'reset', 'adjustment'
  amount: integer("amount").notNull(), // positive for topup/reset, negative for deduct
  balanceAfter: integer("balance_after").notNull(),
  description: text("description"),
  referenceId: varchar("reference_id"), // payment_id or other reference
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const updateCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type UpdateCreditTransaction = z.infer<typeof updateCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
