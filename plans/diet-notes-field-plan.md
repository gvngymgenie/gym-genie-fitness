# Implementation Plan: Adding Notes Field to Diet Plans

## Overview

This plan outlines the implementation of a "notes" field for the diet plan system. The notes field will allow AI-generated dietary recommendations, tips, and instructions to be stored alongside the meal data.

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Database Layer
        A[dietPlans table] -->|current fields| B[meal, foods, calories, protein, carbs, fat]
        A -->|new field| C[notes: text optional]
    end
    
    subgraph AI Generation Layer
        D[AI Prompt] -->|requests| E[JSON with notes field]
        E -->|validated by| F[/api/ai-json-validate]
        F -->|schema includes| G[notes: string optional]
    end
    
    subgraph UI Layer
        H[GenieDietSheet.tsx] -->|displays| I[Generated Notes]
        H -->|allows editing| J[Notes Textarea]
        J -->|user can modify| K[editedNotes state]
    end
    
    subgraph Data Flow
        L[Normalize Diet Data] -->|includes| M[notes field]
        M -->|saved via| N[createDietMutation]
        N -->|persists to| A
    end
```

## Current State Analysis

### Database Schema - [`shared/schema.ts`](shared/schema.ts:342-354)

Current `dietPlans` table structure:
```typescript
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### TypeScript Types - [`shared/schema.ts`](shared/schema.ts:370-372)

Current types are auto-inferred:
- `InsertDietPlan` - for creating new diet plans
- `UpdateDietPlan` - for updating existing diet plans
- `DietPlan` - the full diet plan type

### UI Component - [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx)

Current `MealPlan` type (lines 18-25):
```typescript
type MealPlan = {
  meal: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
```

## Implementation Details

### Step 1: Database Schema Update

**File:** [`shared/schema.ts`](shared/schema.ts:342-354)

**Change:** Add `notes` column to `dietPlans` table

```typescript
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
  notes: text("notes"),  // NEW: Optional notes field
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Impact:** The `DietPlan`, `InsertDietPlan`, and `UpdateDietPlan` types will automatically include the `notes` field.

### Step 2: Database Migration

**File:** `migrations/0017_add_diet_notes_column.sql` (NEW)

```sql
-- Add notes column to diet_plans table
ALTER TABLE diet_plans ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN diet_plans.notes IS 'Optional dietary notes, tips, or recommendations from AI generation';
```

### Step 3: Update MealPlan Type

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx:18-25)

```typescript
type MealPlan = {
  meal: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;  // NEW: Optional notes field
};
```

### Step 4: Update AI Prompt

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx:205-233)

**Current prompt structure:**
```
Required JSON structure:
{
  "meal": "Meal name (e.g., Breakfast, Lunch, Dinner)",
  "foods": ["food1", "food2", "food3"],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}
```

**Updated prompt structure:**
```
Required JSON structure:
{
  "meal": "Meal name (e.g., Breakfast, Lunch, Dinner)",
  "foods": ["food1", "food2", "food3"],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "notes": "Optional dietary recommendations, cooking tips, or nutritional advice"
}
```

### Step 5: Update AI Validation Schema

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx:295-303)

**Current schema:**
```typescript
schema: {
  meal: "string",
  foods: "array",
  calories: "number",
  protein: "number",
  carbs: "number",
  fat: "number"
}
```

**Updated schema:**
```typescript
schema: {
  meal: "string",
  foods: "array",
  calories: "number",
  protein: "number",
  carbs: "number",
  fat: "number",
  notes: "string?"  // Optional string
}
```

### Step 6: Update Normalization Function

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx:418-438)

**Current normalization:**
```typescript
let normalizedDiet = {
  meal: dietData.meal || dietData.name || "Meal",
  foods: normalizeFoodsArray(dietData.foods),
  calories: Number(dietData.calories) || 0,
  protein: Number(dietData.protein) || 0,
  carbs: Number(dietData.carbs) || 0,
  fat: Number(dietData.fat) || 0,
};
```

**Updated normalization:**
```typescript
let normalizedDiet = {
  meal: dietData.meal || dietData.name || "Meal",
  foods: normalizeFoodsArray(dietData.foods),
  calories: Number(dietData.calories) || 0,
  protein: Number(dietData.protein) || 0,
  carbs: Number(dietData.carbs) || 0,
  fat: Number(dietData.fat) || 0,
  notes: dietData.notes || "",  // NEW: Include notes
};
```

### Step 7: Add UI State for Editable Notes

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx)

Add new state after line 71:
```typescript
const [editedNotes, setEditedNotes] = useState<string>("");
```

Update `setGeneratedDiet` to also set `editedNotes`:
```typescript
setGeneratedDiet(normalizedDiet);
setEditedNotes(normalizedDiet.notes || "");  // NEW: Initialize edited notes
```

### Step 8: Add Notes Display and Edit UI

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx)

Add after the Nutrition Stats section (around line 751):

```tsx
{/* AI Generated Notes - Display Only */}
{generatedDiet.notes && (
  <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20">
    <div className="flex items-center gap-2 mb-2">
      <Info className="h-4 w-4 text-blue-500" />
      <p className="text-xs font-semibold text-blue-500">AI Recommendations</p>
    </div>
    <p className="text-sm text-muted-foreground">{generatedDiet.notes}</p>
  </div>
)}

{/* Editable Notes Section */}
<div className="p-3 rounded bg-background/50 border border-border">
  <Label className="text-xs text-muted-foreground mb-2 block">
    Additional Notes
  </Label>
  <Textarea
    value={editedNotes}
    onChange={(e) => setEditedNotes(e.target.value)}
    placeholder="Add any dietary notes, modifications, or special instructions..."
    className="min-h-[80px] bg-background resize-none"
  />
  <p className="text-xs text-muted-foreground mt-1">
    Edit or add notes before saving the diet plan
  </p>
</div>
```

### Step 9: Update Save Mutation

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx)

Update the save button onClick handler:

```typescript
createDietMutation.mutate({
  meal: generatedDiet.meal,
  foods: foodsArray,
  calories: Number(generatedDiet.calories) || 0,
  protein: Number(generatedDiet.protein) || 0,
  carbs: Number(generatedDiet.carbs) || 0,
  fat: Number(generatedDiet.fat) || 0,
  notes: editedNotes || generatedDiet.notes || "",  // NEW: Include notes
  customDiet: true,
  memberId: memberId,
});
```

### Step 10: Update Reset Logic

**File:** [`GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx)

Update the reset logic in multiple places to clear `editedNotes`:

1. In `handleSheetClose` function
2. In "Generate Another" button onClick
3. In mutation `onSuccess` callback

```typescript
setEditedNotes("");  // Clear edited notes
```

## Files to Modify Summary

| File | Changes Required |
|------|-----------------|
| `shared/schema.ts` | Add `notes: text("notes")` column to dietPlans table |
| `migrations/0017_add_diet_notes_column.sql` | NEW: Create migration file |
| `client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx` | Update MealPlan type, AI prompt, validation schema, normalization, UI, and save handler |

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│  Generated Diet Plan                          [Generate Another]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🍽️ Breakfast                                        │    │
│  │    5 food items                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Foods                                                │    │
│  │ [Oatmeal] [Banana] [Eggs] [Spinach] [Almonds]       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │ 450      │ 35g      │ 45g      │ 15g      │              │
│  │ Calories │ Protein  │ Carbs    │ Fat      │              │
│  └──────────┴──────────┴──────────┴──────────┘              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ℹ️ AI Recommendations                                │    │
│  │ This meal is optimized for muscle building with     │    │
│  │ high protein content. Consider adding more carbs    │    │
│  │ if training intensity is high.                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Additional Notes                                     │    │
│  │ ┌─────────────────────────────────────────────────┐ │    │
│  │ │ [Editable textarea for user modifications]      │ │    │
│  │ │                                                 │ │    │
│  │ └─────────────────────────────────────────────────┘ │    │
│  │ Edit or add notes before saving the diet plan       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           [Save Diet Plan]                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Schema types are correctly inferred
- [ ] AI generates notes field in response
- [ ] AI validation accepts notes field
- [ ] Notes display correctly in UI
- [ ] Notes can be edited before saving
- [ ] Notes persist correctly to database
- [ ] Existing diet plans without notes still work
- [ ] Build compiles without errors

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI doesn't generate notes | Medium | Low | Field is optional, defaults to empty string |
| Migration fails | Low | High | Use IF NOT EXISTS, test on staging first |
| UI layout breaks | Low | Medium | Use existing styling patterns |
| Type inference issues | Low | Medium | Schema change auto-propagates |

## Dependencies

- No new npm packages required
- Uses existing UI components (Textarea, Label, Badge)
- Uses existing AI validation endpoint

## Rollback Plan

If issues arise:
1. Remove notes field from UI components
2. Migration can be reversed: `ALTER TABLE diet_plans DROP COLUMN IF EXISTS notes;`
3. Revert schema.ts changes
