# Genie Diet Enhancement Plan

## Overview
Enhance the Genie Diet generation to include member interests and current workout plan as additional criteria for generating personalized diet recommendations.

## Current State Analysis

### GenieDietSheet.tsx
- Generates diets based on member profile (name, age, gender, weight, height, BMI)
- Uses user-provided prompt for dietary requirements
- Does NOT include member interests or workout data

### GenieProgramSheet.tsx (Reference)
- Already includes member interests in AI prompt
- Uses `interestAreas` from member data

### Available Data Sources
1. **Member Interests**: `members.interest_areas` - array of text strings
2. **Member Workouts**: 
   - Workout assignments: `/api/members/{memberId}/workout-assignments`
   - Custom workouts: `/api/workout-programs?memberId={memberId}`

---

## Implementation Steps

### Step 1: Add Workout Data Fetching
**File**: `client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx`

Add queries to fetch member's workout data:
```typescript
// Fetch workout assignments
const { data: workoutAssignments = [] } = useQuery({
  queryKey: ["/api/members", memberId, "workout-assignments"],
  queryFn: async () => {
    const res = await fetch(`/api/members/${memberId}/workout-assignments`);
    if (!res.ok) return [];
    return res.json();
  },
  enabled: !!memberId && open,
});

// Fetch all workout programs
const { data: allWorkouts = [] } = useQuery({
  queryKey: ["/api/workout-programs"],
  enabled: !!memberId && open,
});

// Fetch custom workouts for this member
const { data: customWorkouts = [] } = useQuery({
  queryKey: ["/api/workout-programs", "custom", memberId],
  queryFn: async () => {
    const res = await fetch(`/api/workout-programs?memberId=${memberId}`);
    if (!res.ok) return [];
    return res.json();
  },
  enabled: !!memberId && open,
});
```

### Step 2: Process Workout Data
Combine assigned and custom workouts to get member's complete workout profile:
```typescript
// Combine assigned workouts with custom workouts
const assignedWorkouts = (allWorkouts as WorkoutProgram[]).filter((w: WorkoutProgram) =>
  (workoutAssignments as WorkoutProgramAssignment[]).some(
    (a: WorkoutProgramAssignment) => a.programId === w.id
  )
);

const memberWorkouts = [
  ...assignedWorkouts,
  ...(customWorkouts as WorkoutProgram[]).filter(
    (w: WorkoutProgram) => !assignedWorkouts.some(aw => aw.id === w.id)
  )
];
```

### Step 3: Create Workout Summary for AI
Extract meaningful workout information for the AI prompt:
```typescript
// Create a summary of workout activities
const workoutSummary = memberWorkouts.length > 0 
  ? memberWorkouts.map((w: WorkoutProgram) => ({
      name: w.name,
      day: w.day,
      goal: w.goal,
      intensity: w.intensity,
      duration: w.duration,
      exerciseCount: (w.exercises as any[])?.length || 0
    }))
  : [];
```

### Step 4: Update AI System Prompt
Modify the `systemPrompt` in `handleGenerate` function to include interests and workout data:
```typescript
const systemPrompt = `You are a nutrition expert AI assistant. Generate a detailed diet plan in JSON format ONLY.

Member Profile:
- Name: ${memberProfile.name}
- Age: ${memberProfile.age}
- Gender: ${memberProfile.gender}
- Weight: ${memberProfile.weight} kg
- Height: ${memberProfile.height} cm
- BMI: ${memberProfile.bmi}
- Interest Areas: ${(member as any)?.interestAreas?.join(", ") || "General fitness"}
- Dietary Requirements: ${memberProfile.dietaryRestrictions}

Current Workout Plan:
${memberWorkouts.length > 0 
  ? memberWorkouts.map((w: any) => 
      `- ${w.name} (${w.day}): ${w.goal}, Intensity ${w.intensity}/10, ${w.duration} min, ${(w.exercises as any[])?.length || 0} exercises`
    ).join("\n")
  : "- No active workout plan assigned"
}

Consider the member's fitness interests and current workout intensity when recommending the diet. Align the nutritional requirements with their workout goals (e.g., higher protein for muscle building, controlled calories for weight loss).

IMPORTANT: Respond with ONLY raw JSON - no markdown, no code blocks, no explanations. Start your response with { and end with }.

Required JSON structure:
{
  "meal": "Meal name (e.g., Breakfast, Lunch, Dinner)",
  "foods": ["food1", "food2", "food3"],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}`;
```

### Step 5: Update Member Profile Display
Add interests and workout info to the Member Profile summary card in the UI:
```tsx
<div className="grid grid-cols-2 gap-2 text-sm">
  {/* ... existing fields ... */}
  <div>
    <span className="text-muted-foreground">Interests:</span>
    <span className="ml-2 font-medium">
      {(member as any)?.interestAreas?.join(", ") || "N/A"}
    </span>
  </div>
  <div className="col-span-2">
    <span className="text-muted-foreground">Active Workouts:</span>
    <span className="ml-2 font-medium">
      {memberWorkouts.length > 0 
        ? memberWorkouts.map((w: any) => w.name).join(", ")
        : "None assigned"
      }
    </span>
  </div>
</div>
```

### Step 6: Add Type Imports
Add necessary type imports at the top of the file:
```typescript
import { WorkoutProgram, WorkoutProgramAssignment } from "@shared/schema";
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx` | Add workout queries, update AI prompt, update UI |

---

## UI Changes Preview

### Member Profile Section (Before)
```
Name: John Doe
Gender: Male
Date of Birth: 1990-01-15
Age: 34 years
Weight: 75 kg
Height: 180 cm
BMI: 23.1
```

### Member Profile Section (After)
```
Name: John Doe
Gender: Male
Date of Birth: 1990-01-15
Age: 34 years
Weight: 75 kg
Height: 180 cm
BMI: 23.1
Interests: Weight Training, Cardio
Active Workouts: Muscle Building Routine, HIIT Cardio
```

---

## AI Prompt Enhancement Example

### Before
```
Member Profile:
- Name: John Doe
- Age: 34
- Gender: male
- Weight: 75 kg
- Height: 180 cm
- BMI: 23.1
- Dietary Requirements: High protein diet for muscle building
```

### After
```
Member Profile:
- Name: John Doe
- Age: 34
- Gender: male
- Weight: 75 kg
- Height: 180 cm
- BMI: 23.1
- Interest Areas: Weight Training, Cardio
- Dietary Requirements: High protein diet for muscle building

Current Workout Plan:
- Muscle Building Routine (Monday): Hypertrophy, Intensity 8/10, 60 min, 8 exercises
- HIIT Cardio (Wednesday): Cardio, Intensity 7/10, 30 min, 6 exercises
- Upper Body Strength (Friday): Strength, Intensity 7/10, 45 min, 6 exercises

Consider the member's fitness interests and current workout intensity when recommending the diet. Align the nutritional requirements with their workout goals.
```

---

## Benefits

1. **Personalized Diet Recommendations**: Diet plans aligned with workout intensity and goals
2. **Interest-Based Suggestions**: Foods that match member preferences
3. **Goal Alignment**: Higher protein for muscle building workouts, controlled calories for weight loss programs
4. **Better Context**: AI has more context to generate relevant diet plans

---

## Testing Checklist

- [ ] Verify workout data loads correctly when sheet opens
- [ ] Test with member who has no workouts assigned
- [ ] Test with member who has multiple workouts
- [ ] Verify interests display correctly
- [ ] Test AI prompt includes all workout data
- [ ] Verify generated diet aligns with workout goals
- [ ] Test error handling for failed workout queries
