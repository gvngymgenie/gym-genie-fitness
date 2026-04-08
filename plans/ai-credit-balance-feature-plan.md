# AI Credit Balance Feature Plan

## Overview
Add AI credit balance display to the member AI Usage table, showing available credits as a Chip/Badge. The feature leverages the existing `member_credits` table which already tracks balance per member.

## Current State Analysis

### Database Schema (Already Exists)
The `member_credits` table already exists with:
- `id` (VARCHAR, PK) - default: gen_random_uuid()
- `member_id` (VARCHAR, FK → members.id) - required
- `balance` (INTEGER) - default: **5** (NOT 0 as originally thought)
- `total_credits_used` (INTEGER) - default: 0
- `last_reset_at` (TIMESTAMP) - default: now()
- `created_at`, `updated_at` (TIMESTAMP) - defaults: now()

### Note on Default Value
The current default is **5 credits**, not 0. If you want default to be 0, a migration is needed:
```sql
ALTER TABLE member_credits ALTER COLUMN balance DROP DEFAULT;
ALTER TABLE member_credits ALTER COLUMN balance SET DEFAULT 0;
```

---

## Implementation Plan

### Phase 1: Database (Minimal Changes Needed)
- [x] Verify `member_credits` table exists with balance column → **DONE**
- [ ] Create index for balance queries (if not exists):
  ```sql
  CREATE INDEX IF NOT EXISTS idx_member_credits_balance ON member_credits(balance);
  ```
- [ ] (Optional) Change default balance to 0 if needed

### Phase 2: Mock Data Update
- [ ] Add credit balance data to `mockData.ts`:
  ```typescript
  export const memberCreditBalances = [
    { memberId: "m1", balance: 50 },
    { memberId: "m2", balance: 25 },
    // ...
  ];
  ```

### Phase 3: Update AIUsageTable.tsx
- [ ] Update `MemberAIUsage` interface to include `creditBalance`
- [ ] Add new column "Credits Available" with Chip/Badge display:
  ```tsx
  <TableCell>
    <Badge variant={balance > 0 ? "default" : "destructive"}>
      {balance} credits
    </Badge>
  </TableCell>
  ```
- [ ] Add state and handler for View button click
- [ ] Create/import Dialog component for modal
- [ ] Implement modal showing member's individual AI request history

### Phase 4: Modal Implementation
- [ ] Create modal content showing:
  - Member name and current balance
  - Table of individual AI requests (date, type, credits, status)
  - Option to reset/adjust credits

---

## File Changes Required

| File | Changes |
|------|---------|
| `database/ai_usage_tables.sql` | Add index for member_credits.balance |
| `client/src/lib/mockData.ts` | Add memberCreditBalances array |
| `client/src/components/AIUsageTable.tsx` | Add balance column, implement View modal |

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│  Member              │ Workouts │ Diet Plans │ Credits │ Balance│
├─────────────────────────────────────────────────────────────────┤
│  Rahul Sharma        │    45    │     28     │  1250   │  [50]  │
│  Priya Patel        │    32    │     22     │   980   │  [25]  │
│  Vikram Singh       │    28    │     18     │   850   │  [0]   │
└─────────────────────────────────────────────────────────────────┘
                          [View]    [View]      [View]
```

Clicking View opens modal:
```
┌────────────────────────────────────────────┐
│  Rahul Sharma's AI Usage History     [X]   │
├────────────────────────────────────────────┤
│  Balance: 50 credits remaining            │
├────────────────────────────────────────────┤
│  Date/Time           │ Type    │ Credits   │
│  ─────────────────────────────────────────│
│  2024-01-15 10:30   │ Workout │    25     │
│  2024-01-14 14:20   │ Diet    │    20     │
│  2024-01-13 09:15   │ Workout │    25     │
└────────────────────────────────────────────┘
```

---

## Questions for Clarification

1. **Default balance**: Should it remain at 5 or change to 0?
2. **Modal content**: Should the modal show just history, or also allow admin to add/reset credits?
3. **Color coding**: How should the Chip display? (e.g., Green = has credits, Red = exhausted)
