# Workouts.tsx Diet Tab UI Changes Plan

## Overview
This plan outlines the changes needed to hide the Nutrition Summary Card and show notes field in Diet cards in the Workouts.tsx page.

## Changes Required

### 1. Hide Nutrition Summary Card

**Location:** Lines 497-535 in [`client/src/pages/Workouts.tsx`](client/src/pages/Workouts.tsx:497)

**Current Code:**
```tsx
<div className="grid gap-6 md:grid-cols-3">
  <div className="md:col-span-1">
    <Card className="bg-card/50 backdrop-blur-sm sticky top-20 border-t-4 border-t-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-accent" />
          Nutrition Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ... total calories and macros display ... */}
      </CardContent>
    </Card>
  </div>
  <div className="md:col-span-2 space-y-4">
    {/* Diet cards */}
  </div>
</div>
```

**Proposed Change:**
- Remove the entire Nutrition Summary Card block (lines 498-535)
- Remove the grid layout wrapper
- Keep only the diet cards section
- The `totalMacros` and `totalCalories` computed values (lines 86-92) can remain as they may be used elsewhere or for future use

**New Structure:**
```tsx
<div className="space-y-4">
  {/* Diet cards directly without the summary sidebar */}
</div>
```

### 2. Show Notes Field in Diet Cards

**Location:** Lines 542-591 in [`client/src/pages/Workouts.tsx`](client/src/pages/Workouts.tsx:542) - inside the `memberDiets.map()` loop

**Schema Confirmation:**
The `DietPlan` type from [`shared/schema.ts`](shared/schema.ts:343-356) already includes:
```typescript
notes: text("notes"),
```

**Current Diet Card Structure:**
```tsx
<Card key={plan.id}>
  <CardHeader>...</CardHeader>
  <CardContent className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {/* Foods badges */}
    </div>
    <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-border text-center">
      {/* Protein, Carbs, Fat display */}
    </div>
    <div className="flex gap-2">
      {/* Action buttons */}
    </div>
  </CardContent>
</Card>
```

**Proposed Change:**
Add a notes display section after the macros grid and before the action buttons. Similar to how notes are displayed in workout exercise cards (line 466):

```tsx
{plan.notes && (
  <div className="text-sm text-muted-foreground italic border-t border-border pt-3">
    {plan.notes}
  </div>
)}
```

**Insertion Point:** After line 576 (after the macros grid) and before line 577 (the action buttons div)

## Implementation Steps

1. **Remove Nutrition Summary Card:**
   - Delete lines 497-536 (the grid wrapper and summary card)
   - Change the outer div from `md:col-span-2` to just `space-y-4`
   - Keep the empty state card and diet cards mapping

2. **Add Notes Display:**
   - After the macros display grid (line 576), add a conditional notes section
   - Style consistently with the existing design (using muted foreground color and italic style)

## Files to Modify

| File | Changes |
|------|---------|
| [`client/src/pages/Workouts.tsx`](client/src/pages/Workouts.tsx) | Remove Nutrition Summary Card, add notes display to diet cards |

## Visual Impact

### Before:
```
+------------------+------------------------+
| Nutrition        | Diet Card 1            |
| Summary          | - Meal name            |
| - Total Calories | - Foods                |
| - Macros         | - Macros               |
|                  | - Action buttons       |
|                  +------------------------+
|                  | Diet Card 2            |
|                  | ...                    |
+------------------+------------------------+
```

### After:
```
+----------------------------------------+
| Diet Card 1                            |
| - Meal name                            |
| - Foods                                |
| - Macros                               |
| - Notes (if present)                   |
| - Action buttons                       |
+----------------------------------------+
| Diet Card 2                            |
| ...                                    |
+----------------------------------------+
```

## Testing Considerations

1. Verify diet cards display correctly without the sidebar
2. Test with diet plans that have notes and without notes
3. Ensure responsive layout works on mobile devices
4. Verify the Create Diet Plan button still functions correctly
