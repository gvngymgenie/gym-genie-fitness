import express, { Express } from "express";
import { storage } from "../storage";
import multer from "multer";
import path from "path";
import fs from "fs"; // For sync operations if absolutely necessary, or refactor to async
import fsAsync from 'fs/promises'; // For async operations
import { StaticFileUpload } from "../utils/staticFileUpload";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";

// Helper function to record revenue
async function recordRevenue(memberId: string, amount: number, sourceType: string, description?: string) {
  try {
    const date = format(new Date(), "yyyy-MM-dd");
    
    const [transaction] = await db.insert(schema.revenueTransactions).values({
      date,
      amount,
      sourceType,
      sourceId: memberId,
      description: description || `${sourceType} revenue for member ${memberId}`,
    }).returning();

    // Update daily summary
    await updateDailyRevenueSummary(date);
    
    return transaction;
  } catch (error) {
    console.error("Failed to record revenue:", error);
    // Don't throw error - revenue tracking shouldn't block member operations
  }
}

// Helper function to update daily revenue summary
async function updateDailyRevenueSummary(date: string) {
  try {
    const transactions = await db.query.revenueTransactions.findMany({
      where: eq(schema.revenueTransactions.date, date),
    });

    const totalRevenue = transactions.reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);
    const membershipRevenue = transactions.filter((t: { sourceType: string; }) => t.sourceType === 'membership').reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);
    const renewalRevenue = transactions.filter((t: { sourceType: string; }) => t.sourceType === 'renewal').reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);
    const merchandiseRevenue = transactions.filter((t: { sourceType: string; }) => t.sourceType === 'merchandise').reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);
    const serviceRevenue = transactions.filter((t: { sourceType: string; }) => t.sourceType === 'service').reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);
    const otherRevenue = transactions.filter((t: { sourceType: string; }) => t.sourceType === 'other').reduce((sum: number, t: { amount: number; }) => sum + t.amount, 0);

    const [summary] = await db
      .insert(schema.revenueSummary)
      .values({
        date,
        totalRevenue,
        membershipRevenue,
        renewalRevenue,
        merchandiseRevenue,
        serviceRevenue,
        otherRevenue,
      })
      .onConflictDoUpdate({
        target: schema.revenueSummary.date,
        set: {
          totalRevenue,
          membershipRevenue,
          renewalRevenue,
          merchandiseRevenue,
          serviceRevenue,
          otherRevenue,
          updatedAt: new Date(),
        },
      })
      .returning();

    return summary;
  } catch (error) {
    console.error("Error updating daily revenue summary:", error);
    throw error;
  }
}

export function registerMemberRoutes(app: Express) {
  // Configure multer for avatar uploads
  // Note: Temporary file storage is still used by multer before upload to Supabase
  const isVercel = !!process.env.VERCEL;
  const uploadBase = isVercel ? '/tmp' : path.join(process.cwd(), 'uploads');
  const avatarUploadDir = path.join(uploadBase, 'avatars');

  const ensureUploadDir = async () => {
    try {
      await fsAsync.access(avatarUploadDir);
    } catch {
      try {
        await fsAsync.mkdir(avatarUploadDir, { recursive: true });
        console.log(`Created avatar upload directory: ${avatarUploadDir}`);
      } catch (error) {
        console.error(`Failed to create avatar upload directory: ${avatarUploadDir}`, error);
        // Fallback to /tmp if local creation fails
        if (!isVercel) {
          const tmpDir = path.join('/tmp', 'avatars');
          try {
            await fsAsync.access(tmpDir);
          } catch {
             await fsAsync.mkdir(tmpDir, { recursive: true });
          }
          console.log(`Using fallback avatar directory: ${tmpDir}`);
          // This fallback would need to be reflected in multer's destination if it's dynamic
          // For now, we'll proceed and hope the primary dir or /tmp works.
        }
      }
    }
  };
  ensureUploadDir(); // Call it once on module load

  const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Ensure directory exists before multer tries to write
      // This is a bit of a workaround; ideally, ensureUploadDir would have completed.
      cb(null, avatarUploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });

  const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Get all members
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getAllMembers();
      res.json(members);
    } catch (error) {
      console.error("Failed to fetch members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Get member by ID
  app.get("/api/members/:id", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Failed to fetch member:", error);
      res.status(500).json({ error: "Failed to fetch member" });
    }
  });

  // Create member
  app.post("/api/members", async (req, res) => {
    try {
      const memberData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        gender: req.body.gender || 'male',
        dob: req.body.dob,
        height: req.body.height,
        source: req.body.source,
        interestAreas: req.body.interestAreas || [],
        healthBackground: req.body.healthBackground,
        plan: req.body.plan,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        discount: req.body.discount || 0,
        totalDue: req.body.totalDue || 0,
        amountPaid: req.body.amountPaid || 0,
        paymentMethod: req.body.paymentMethod,
        assignedStaff: req.body.assignedStaff,
        status: req.body.status || "Active",
        avatar: req.body.avatar,
        branch: req.body.branch,
        trainerId: req.body.trainerId ?? null,
      };

      const createdMember = await storage.createMember(memberData);

      // Record revenue if payment was made
      if (createdMember.amountPaid && createdMember.amountPaid > 0) {
        await recordRevenue(
          createdMember.id,
          createdMember.amountPaid,
          'membership',
          `Membership fee for ${createdMember.plan} plan`
        );
      }

      // Create payment record in payments table
      if (createdMember.amountPaid && createdMember.amountPaid > 0) {
        const discountPercentage = createdMember.discount || 0;
        const originalAmount = createdMember.totalDue || createdMember.amountPaid;
        const amount = createdMember.amountPaid;
        
        // Map payment method from form format to enum format
        const methodMap: Record<string, string> = {
          'Cash': 'cash',
          'UPI / GPay': 'upi',
          'UPI': 'upi',
          'Card': 'card',
          'Bank Transfer': 'bank_transfer',
          'cash': 'cash',
          'upi': 'upi',
          'card': 'card',
          'bank_transfer': 'bank_transfer',
        };
        const paymentMethodEnum = methodMap[createdMember.paymentMethod || ''] || 'cash';

        try {
          await db.insert(schema.payments).values({
            memberId: createdMember.id,
            originalAmount: originalAmount,
            amount: amount,
            discountPercentage: discountPercentage,
            method: paymentMethodEnum,
            status: 'paid',
            paymentDate: new Date(),
          });
        } catch (error) {
          console.error("Failed to create payment record:", error);
          // Don't block member creation if payment record fails
        }
      }

      res.status(201).json(createdMember);
    } catch (error) {
      console.error("Failed to create member:", error);
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  // Update member
  app.patch("/api/members/:id", async (req, res) => {
    try {
      console.log("DEBUG: Raw request body for update:", JSON.stringify(req.body, null, 2));
      
      const updates: Record<string, any> = {};
      if (req.body.firstName !== undefined) updates.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.address !== undefined) updates.address = req.body.address;
      if (req.body.gender !== undefined) updates.gender = req.body.gender;
      if (req.body.dob !== undefined) updates.dob = req.body.dob;
      if (req.body.height !== undefined) updates.height = req.body.height;
      if (req.body.source !== undefined) updates.source = req.body.source;
      if (req.body.interestAreas !== undefined) updates.interestAreas = req.body.interestAreas;
      if (req.body.healthBackground !== undefined) updates.healthBackground = req.body.healthBackground;
      if (req.body.plan !== undefined) updates.plan = req.body.plan;
      if (req.body.startDate !== undefined) updates.startDate = req.body.startDate;
      if (req.body.endDate !== undefined) updates.endDate = req.body.endDate;
      if (req.body.discount !== undefined) updates.discount = req.body.discount;
      if (req.body.totalDue !== undefined) updates.totalDue = req.body.totalDue;
      if (req.body.amountPaid !== undefined) updates.amountPaid = req.body.amountPaid;
      if (req.body.paymentMethod !== undefined) updates.paymentMethod = req.body.paymentMethod;
      if (req.body.assignedStaff !== undefined) updates.assignedStaff = req.body.assignedStaff;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
      if (req.body.branch !== undefined) updates.branch = req.body.branch;
      if (req.body.trainerId !== undefined) updates.trainerId = req.body.trainerId;

      console.log("DEBUG: Processed updates object:", JSON.stringify(updates, null, 2));

      // Map camelCase to underscore for DB
      if (updates.interestAreas !== undefined) {
        updates.interest_areas = updates.interestAreas;
        delete updates.interestAreas;
      }

      const member = await storage.updateMember(req.params.id, updates);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Check for additional payment and record revenue
      if (req.body.amountPaid && req.body.amountPaid > 0) {
        const originalMember = await storage.getMember(req.params.id);
        if (originalMember) {
          const additionalPayment = req.body.amountPaid - (originalMember.amountPaid || 0);
          if (additionalPayment > 0) {
            const isRenewal = req.body.endDate && req.body.endDate !== originalMember.endDate;
            const sourceType = isRenewal ? 'renewal' : 'membership';
            const description = isRenewal 
              ? `Membership renewal for ${member.plan} plan` 
              : `Additional payment for ${member.plan} membership`;

            await recordRevenue(
              member.id,
              additionalPayment,
              sourceType,
              description
            );
          }
        }
      }

      res.json(member);
    } catch (error) {
      console.error("Failed to update member:", error);
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  // Delete member
  app.delete("/api/members/:id", async (req, res) => {
    try {
      const success = await storage.deleteMember(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete member:", error);
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  // Avatar upload endpoint
  app.post("/api/members/:id/avatar", avatarUpload.single('avatar'), async (req, res) => {
    try {
      const memberId = req.params.id;
      const member = await storage.getMember(memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const buffer = await fsAsync.readFile(req.file.path);
      let oldAvatarPathForDeletion = member.avatar; // Pass the old avatar path for deletion

      // If the old avatar was a Supabase URL, we need to extract the path part for deletion
      if (member.avatar && member.avatar.startsWith(StaticFileUpload['supabaseUrl']!) && member.avatar.includes('/object/public/avatars/')) {
          const storageUrlPrefix = `${StaticFileUpload['supabaseUrl']!}/storage/v1/object/public/${StaticFileUpload['AVATARS_BUCKET']}/`;
            if (member.avatar.startsWith(storageUrlPrefix)) {
                oldAvatarPathForDeletion = member.avatar.substring(storageUrlPrefix.length);
            }
      }


      const result = await StaticFileUpload.uploadAvatar(
        buffer,
        req.file.originalname,
        oldAvatarPathForDeletion && oldAvatarPathForDeletion !== '/assets/dumbbells.avif' && !oldAvatarPathForDeletion.includes('dicebear.com') ? oldAvatarPathForDeletion : undefined
      );
      
      // The localPath from StaticFileUpload is now the Supabase URL
      const { staticUrl: supabaseAvatarUrl } = result;

      // Clean up the temporary upload file
      try {
        await fsAsync.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn(`Could not delete temporary file ${req.file.path}:`, unlinkError);
      }

      const updatedMember = await storage.updateMember(memberId, {
        avatar: supabaseAvatarUrl, // Store Supabase URL in avatar field
        // avatarStaticUrl can be used if we want to distinguish, but URL is same
        // For now, let's keep avatarStaticUrl for potential future differentiation or migration clarity
        avatarStaticUrl: supabaseAvatarUrl 
      });

      res.json({
        avatar: supabaseAvatarUrl,
        member: updatedMember
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  });

  // Delete avatar endpoint
  app.delete("/api/members/:id/avatar", async (req, res) => {
    try {
      const memberId = req.params.id;
      const member = await storage.getMember(memberId);

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      let avatarToDeletePath: string | undefined = undefined;

      if (member.avatar) {
        // If it's a Supabase URL, extract the path
         if (member.avatar.startsWith(StaticFileUpload['supabaseUrl']!) && member.avatar.includes('/object/public/avatars/')) {
            const storageUrlPrefix = `${StaticFileUpload['supabaseUrl']!}/storage/v1/object/public/${StaticFileUpload['AVATARS_BUCKET']}/`;
            if (member.avatar.startsWith(storageUrlPrefix)) {
                avatarToDeletePath = member.avatar.substring(storageUrlPrefix.length);
            }
        } 
        // If it's an old local path, it might not be in Supabase, so no deletion needed from there.
        // Or if it's a DiceBear URL, no deletion needed from storage.
        else if (member.avatar.startsWith('/uploads/') || member.avatar.includes('dicebear.com') || member.avatar === '/assets/dumbbells.avif') {
            // No deletion from Supabase needed for these
            avatarToDeletePath = undefined;
        }
        // Fallback: if it's just a filename, assume it's in avatars bucket
        else if (!member.avatar.startsWith('http')) {
             avatarToDeletePath = `avatars/${member.avatar}`;
        }
      }
      
      if (avatarToDeletePath) {
          try {
            await StaticFileUpload.deleteFromSupabase(avatarToDeletePath, StaticFileUpload['AVATARS_BUCKET']);
            console.log(`Initiated deletion of old avatar from Supabase: ${avatarToDeletePath}`);
          } catch (deleteError) {
            console.error(`Error deleting old avatar from Supabase ${avatarToDeletePath}:`, deleteError);
            // Continue to set default avatar even if deletion fails
          }
      }


      // Set avatar to default DiceBear URL
      const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${member.firstName || 'M'}${member.lastName || 'S'}`;
      const updatedMember = await storage.updateMember(memberId, { 
        avatar: defaultAvatar,
        avatarStaticUrl: defaultAvatar // Also update this to reflect the new "default"
      });

      res.json({
        avatar: defaultAvatar,
        member: updatedMember
      });
    } catch (error) {
      console.error("Avatar delete error:", error);
      res.status(500).json({ error: "Failed to delete avatar" });
    }
  });

  // Member Dashboard Data
  app.get("/api/member/:userOrMemberId/dashboard", async (req, res) => {
    try {
      const { userOrMemberId } = req.params;
      let member = await storage.getMember(userOrMemberId);

      if (!member) {
        const user = await storage.getUser(userOrMemberId);
        if (user?.email) {
          member = await storage.getMemberByEmail(user.email);
        }
      }

      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const memberId = member.id;
      let membershipPlan = null;
      if (member.plan) {
        const plans = await storage.getAllPlans();
        membershipPlan = plans.find(p => p.name === member.plan) || null;
      }

      const attendanceRecords = await storage.getAttendanceByMember(memberId);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const attendanceDates = new Set(attendanceRecords.map(a => a.date));

      let streak = 0;
      let checkDate = new Date(today);
      if (!attendanceDates.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (attendanceDates.has(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthlyVisits = attendanceRecords.filter(a => a.date >= monthStartStr).length;

      const workoutAssignments = await storage.getWorkoutAssignmentsByMember(memberId);
      const allPrograms = await storage.getAllWorkoutPrograms();
      
      // Get programs assigned through workout_program_assignments table
      const assignedPrograms = workoutAssignments
        .map(a => allPrograms.find(p => p.id === a.programId))
        .filter(Boolean);
      
      // Also get custom workouts created specifically for this member (have memberId set)
      const customWorkouts = await storage.getWorkoutProgramsByMember(memberId);
      
      // Combine both, avoiding duplicates
      const memberWorkouts = [
        ...assignedPrograms,
        ...customWorkouts.filter((cw: any) => !assignedPrograms.some((ap: any) => ap.id === cw.id))
      ];

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDay = days[today.getDay()];
      const todayWorkout = memberWorkouts.find((p: any) => p?.day === todayDay) || null;

      const dietAssignments = await storage.getDietAssignmentsByMember(memberId);
      const allDiets = await storage.getAllDietPlans();
      const assignedDiets = dietAssignments
        .map(a => allDiets.find(d => d.id === a.dietPlanId))
        .filter(Boolean);

      const trainerBookings = await storage.getMemberBookings(memberId);

      let daysRemaining = 0;
      let totalDays = 0;
      let membershipProgress = 0;

      if (member.startDate && member.endDate) {
        const startDate = new Date(member.startDate);
        const endDate = new Date(member.endDate);
        totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
        const daysUsed = totalDays - daysRemaining;
        membershipProgress = totalDays > 0 ? Math.round((daysUsed / totalDays) * 100) : 0;
      }

      const amountPaid = member.amountPaid || 0;
      const totalDue = member.totalDue || 0;
      const balance = Math.max(0, totalDue - amountPaid);

      res.json({
        member,
        membershipPlan,
        attendance: {
          streak,
          monthlyVisits,
          totalVisits: attendanceRecords.length,
        },
        todayWorkout,
        assignedPrograms,
        assignedDiets,
        trainerBookings,
        membership: {
          daysRemaining,
          totalDays,
          progress: membershipProgress,
          paidAmount: amountPaid,
          balance,
        },
      });
    } catch (error) {
      console.error("Failed to fetch member dashboard:", error);
      res.status(500).json({ error: "Failed to fetch member dashboard data" });
    }
  });

  // Member attendance
  app.get("/api/members/:memberId/attendance", async (req, res) => {
    try {
      const attendance = await storage.getAttendanceByMember(req.params.memberId);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch member attendance" });
    }
  });

  // BMI Records Routes
  app.get("/api/members/:memberId/bmi-records", async (req, res) => {
    try {
      const records = await storage.getBmiRecordsByMember(req.params.memberId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BMI records" });
    }
  });

  app.post("/api/members/:memberId/bmi-records", async (req, res) => {
    try {
      const validatedData = {
        memberId: req.params.memberId,
        recordDate: req.body.recordDate || new Date().toISOString().split('T')[0],
        bodyWeight: req.body.bodyWeight,
        bmi: req.body.bmi,
        bodyFatPercentage: req.body.bodyFatPercentage,
        muscleMass: req.body.muscleMass,
        bodyWaterPercentage: req.body.bodyWaterPercentage,
        boneMass: req.body.boneMass,
        visceralFat: req.body.visceralFat,
        subcutaneousFat: req.body.subcutaneousFat,
        bmr: req.body.bmr,
        proteinPercentage: req.body.proteinPercentage,
        metabolicAge: req.body.metabolicAge,
        leanBodyMass: req.body.leanBodyMass,
      };
      const record = await storage.createBmiRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create BMI record:", error);
      res.status(500).json({ error: "Failed to create BMI record" });
    }
  });

  // Update BMI record
  app.patch("/api/members/:memberId/bmi-records/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.recordDate !== undefined) updates.recordDate = req.body.recordDate;
      if (req.body.bodyWeight !== undefined) updates.bodyWeight = req.body.bodyWeight;
      if (req.body.bmi !== undefined) updates.bmi = req.body.bmi;
      if (req.body.bodyFatPercentage !== undefined) updates.bodyFatPercentage = req.body.bodyFatPercentage;
      if (req.body.muscleMass !== undefined) updates.muscleMass = req.body.muscleMass;
      if (req.body.bodyWaterPercentage !== undefined) updates.bodyWaterPercentage = req.body.bodyWaterPercentage;
      if (req.body.boneMass !== undefined) updates.boneMass = req.body.boneMass;
      if (req.body.visceralFat !== undefined) updates.visceralFat = req.body.visceralFat;
      if (req.body.subcutaneousFat !== undefined) updates.subcutaneousFat = req.body.subcutaneousFat;
      if (req.body.bmr !== undefined) updates.bmr = req.body.bmr;
      if (req.body.proteinPercentage !== undefined) updates.proteinPercentage = req.body.proteinPercentage;
      if (req.body.metabolicAge !== undefined) updates.metabolicAge = req.body.metabolicAge;
      if (req.body.leanBodyMass !== undefined) updates.leanBodyMass = req.body.leanBodyMass;

      // Use the storage update function
      const record = await storage.updateBmiRecord(req.params.id, updates);
      if (!record) {
        return res.status(404).json({ error: "BMI record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Failed to update BMI record:", error);
      res.status(500).json({ error: "Failed to update BMI record" });
    }
  });

  // Body Composition Routes (alias for BMI Records)
  app.get("/api/members/:memberId/body-composition", async (req, res) => {
    try {
      const records = await storage.getBmiRecordsByMember(req.params.memberId);
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch body composition data" });
    }
  });

  app.post("/api/members/:memberId/body-composition", async (req, res) => {
    try {
      const validatedData = {
        memberId: req.params.memberId,
        recordDate: req.body.recordDate || new Date().toISOString().split('T')[0],
        bodyWeight: req.body.bodyWeight,
        bmi: req.body.bmi,
        bodyFatPercentage: req.body.bodyFatPercentage,
        muscleMass: req.body.muscleMass,
        bodyWaterPercentage: req.body.bodyWaterPercentage,
        boneMass: req.body.boneMass,
        visceralFat: req.body.visceralFat,
        subcutaneousFat: req.body.subcutaneousFat,
        bmr: req.body.bmr,
        proteinPercentage: req.body.proteinPercentage,
        metabolicAge: req.body.metabolicAge,
        leanBodyMass: req.body.leanBodyMass,
      };
      const record = await storage.createBmiRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create body composition record:", error);
      res.status(500).json({ error: "Failed to create body composition record" });
    }
  });

  app.delete("/api/members/:memberId/body-composition/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBmiRecord(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Body composition record not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete body composition record" });
    }
  });

  // Member Measurements Routes
  app.get("/api/members/:memberId/measurements", async (req, res) => {
    try {
      const measurements = await storage.getMeasurementsByMember(req.params.memberId);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch measurements" });
    }
  });

  app.get("/api/members/:memberId/measurements/:id", async (req, res) => {
    try {
      const measurement = await storage.getMeasurement(req.params.id);
      if (!measurement) {
        return res.status(404).json({ error: "Measurement not found" });
      }
      res.json(measurement);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch measurement" });
    }
  });

  app.post("/api/members/:memberId/measurements", async (req, res) => {
    try {
      const measurementData = {
        memberId: req.params.memberId,
        date: req.body.date || new Date().toISOString().split('T')[0],
        chest: req.body.chest,
        waist: req.body.waist,
        arms: req.body.arms,
        thighs: req.body.thighs,
      };

      const measurement = await storage.createMeasurement(measurementData as any);
      res.status(201).json(measurement);
    } catch (error) {
      console.error("Failed to create measurement:", error);
      res.status(500).json({ error: "Failed to create measurement" });
    }
  });

  app.patch("/api/members/:memberId/measurements/:id", async (req, res) => {
    try {
      const updates: Record<string, any> = {};
      if (req.body.date !== undefined) updates.date = req.body.date;
      if (req.body.chest !== undefined) updates.chest = req.body.chest;
      if (req.body.waist !== undefined) updates.waist = req.body.waist;
      if (req.body.arms !== undefined) updates.arms = req.body.arms;
      if (req.body.thighs !== undefined) updates.thighs = req.body.thighs;

      const measurement = await storage.updateMeasurement(req.params.id, updates);
      if (!measurement) {
        return res.status(404).json({ error: "Measurement not found" });
      }
      res.json(measurement);
    } catch (error) {
      res.status(500).json({ error: "Failed to update measurement" });
    }
  });

  app.delete("/api/members/:memberId/measurements/:id", async (req, res) => {
    try {
      const success = await storage.deleteMeasurement(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Measurement not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete measurement" });
    }
  });
}