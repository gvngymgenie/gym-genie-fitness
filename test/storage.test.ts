// Import necessary modules and dependencies
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { storage } from "../server/storage";
import { db } from "../server/db";
import * as schema from "../shared/schema";

describe("Storage Module Tests", () => {
  beforeAll(async () => {
    // Initialize database or mock setup
    // Mock database initialization
    await db.$client.query("BEGIN");
  });

  afterAll(async () => {
    // Cleanup database or mock teardown
    // Mock database cleanup
    await db.$client.query("ROLLBACK");
  });

  it("should create and retrieve a member", async () => {
    const newMember: schema.InsertMember = {
      // Removed 'id' as it's auto-generated
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "1234567890",
      address: "123 Test Street",
      gender: "Male",
      dob: "1990-01-01",
      height: 180,
      source: "Referral",
      interestAreas: ["Fitness", "Yoga"],
      healthBackground: "None",
      plan: "Basic",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      discount: 0,
      totalDue: 1000,
      amountPaid: 1000,
      paymentMethod: "Credit Card",
      assignedStaff: "staff-1",
      status: "Active",
      avatar: null,
      avatarStaticUrl: null,
      branch: "branch-1",
      // Removed 'createdAt' as it's auto-generated
    };

    // Create a new member
    const createdMember = await storage.createMember(newMember) as schema.Member; // Explicitly cast to schema.Member
    expect(createdMember).toMatchObject(newMember);

    // Retrieve the member
    const retrievedMember = await storage.getMember(createdMember.id); // Use createdMember.id
    expect(retrievedMember).toMatchObject(newMember);
  });

  it("should update a member's interest areas", async () => {
    const memberId = "test-member-1"; // Use static ID for consistency
    const updatedInterestAreas = ["Pilates", "Cardio"];

    // Update the member's interest areas
    const updatedMember = await storage.updateMember(memberId, {
      interestAreas: updatedInterestAreas,
    });
    expect(updatedMember?.interestAreas).toEqual(updatedInterestAreas);

    // Retrieve the updated member
    const retrievedMember = await storage.getMember(memberId);
    expect(retrievedMember?.interestAreas).toEqual(updatedInterestAreas);
  });

  it("should delete a member", async () => {
    const memberId = "test-member-1";

    // Delete the member
    const deleteResult = await storage.deleteMember(memberId);
    expect(deleteResult).toBe(true);

    // Verify the member is deleted
    const retrievedMember = await storage.getMember(memberId);
    expect(retrievedMember).toBeUndefined();
  });
});