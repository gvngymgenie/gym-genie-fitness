#!/usr/bin/env node

/**
 * Broad GET smoke test for Gym-Genie local API.
 *
 * - Focuses on GET endpoints only (safe / idempotent)
 * - Resolves required path params by first fetching list endpoints
 * - Prints a summary with failures
 */

import http from "http";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5000";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 10000);

function requestJson(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        headers: {
          "User-Agent": "Gym-Genie GET Smoke Test",
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const contentType = String(res.headers["content-type"] || "");
          const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) {
            return resolve({ ok: false, status: res.statusCode, body: data, json: null });
          }
          if (!contentType.includes("application/json")) {
            return resolve({ ok: false, status: res.statusCode, body: data, json: null, note: "non-json" });
          }
          try {
            const json = data ? JSON.parse(data) : null;
            resolve({ ok: true, status: res.statusCode, body: data, json });
          } catch (e) {
            resolve({ ok: false, status: res.statusCode, body: data, json: null, note: "bad-json" });
          }
        });
      }
    );

    req.on("error", (e) => resolve({ ok: false, status: 0, body: String(e?.message || e), json: null }));
    req.setTimeout(TIMEOUT_MS, () => {
      req.destroy(new Error(`Timeout after ${TIMEOUT_MS}ms`));
    });
    req.end();
  });
}

function pickId(listJson) {
  if (Array.isArray(listJson) && listJson.length > 0 && listJson[0] && typeof listJson[0] === "object") {
    return listJson[0].id;
  }
  return null;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getNextDays(count, from = new Date()) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    days.push(formatDate(d));
  }
  return days;
}

async function main() {
  const results = [];

  // Fetch IDs needed for param endpoints
  const [membersRes, leadsRes, plansRes, inventoryRes, usersRes] = await Promise.all([
    requestJson("/api/members"),
    requestJson("/api/leads"),
    requestJson("/api/plans"),
    requestJson("/api/inventory"),
    requestJson("/api/users"),
  ]);

  const memberId = membersRes.ok ? pickId(membersRes.json) : null;
  const leadId = leadsRes.ok ? pickId(leadsRes.json) : null;
  const planId = plansRes.ok ? pickId(plansRes.json) : null;
  const inventoryId = inventoryRes.ok ? pickId(inventoryRes.json) : null;
  const userId = usersRes.ok ? pickId(usersRes.json) : null;

  const today = formatDate(new Date());

  // Core GET endpoints
  const getEndpoints = [
    "/api/staff",
    "/api/users",
    "/api/users/role/admin",
    "/api/roles/permissions",
    "/api/company-settings",
    "/api/plans",
    "/api/inventory",
    "/api/leads",
    "/api/members",
    "/api/branches",
    `/api/attendance?date=${today}`,
    "/api/notifications/preferences",
    "/api/notifications/history",
    "/api/notifications/stats",
    "/api/notifications",
    "/api/workout-programs",
    "/api/diet-plans",
    "/api/push/firebase-config",
    "/api/revenue/today",
    "/api/revenue/daily",
    "/api/revenue/streams",
    "/api/revenue/monthly",
  ];

  // Param endpoints (only if we have an ID)
  if (userId) getEndpoints.push(`/api/users/${userId}`);
  if (planId) getEndpoints.push(`/api/plans/${planId}`);
  if (inventoryId) getEndpoints.push(`/api/inventory/${inventoryId}`);
  if (leadId) getEndpoints.push(`/api/leads/${leadId}`);
  if (memberId) {
    getEndpoints.push(`/api/members/${memberId}`);
    getEndpoints.push(`/api/members/${memberId}/attendance`);
    getEndpoints.push(`/api/members/${memberId}/bmi-records`);
    getEndpoints.push(`/api/members/${memberId}/body-composition`);
    getEndpoints.push(`/api/members/${memberId}/measurements`);
    getEndpoints.push(`/api/members/${memberId}/workout-assignments`);
    getEndpoints.push(`/api/members/${memberId}/diet-assignments`);
    getEndpoints.push(`/api/member/${memberId}/bookings`);
    getEndpoints.push(`/api/member/${memberId}/dashboard`);
  }

  // Trainer endpoints require a trainerId; attempt to derive one from staff list
  let trainerId = null;
  if (membersRes.ok) {
    // noop
  }
  const staffRes = await requestJson("/api/staff");
  if (staffRes.ok && Array.isArray(staffRes.json)) {
    const trainer = staffRes.json.find((u) => u?.role === "trainer");
    trainerId = trainer?.id || null;
  }
  if (trainerId) {
    getEndpoints.push(`/api/trainers/${trainerId}/profile`);
    getEndpoints.push(`/api/trainers/${trainerId}/bookings`);
    getEndpoints.push(`/api/trainers/${trainerId}/feedback`);
    // availability endpoint expects weekDates query param (comma-separated)
    const weekDates = getNextDays(7).join(",");
    getEndpoints.push(`/api/trainers/${trainerId}/availability?weekDates=${encodeURIComponent(weekDates)}`);
  }

  for (const path of getEndpoints) {
    const res = await requestJson(path);
    results.push({ path, ...res });
    const status = res.ok ? "✅" : "❌";
    console.log(`${status} GET ${path} -> ${res.status}`);
  }

  const failures = results.filter((r) => !r.ok);
  console.log("\nSummary");
  console.log("=".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${results.length - failures.length}`);
  console.log(`Failed: ${failures.length}`);
  if (failures.length) {
    console.log("\nFailures:");
    for (const f of failures) {
      console.log(`- GET ${f.path} -> ${f.status} :: ${String(f.body).slice(0, 180)}`);
    }
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
