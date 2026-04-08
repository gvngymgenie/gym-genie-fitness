# GenieDietSheet Multi-Meal Enhancement Plan

## Overview
Enhance the GenieDietSheet component to generate, display, and save multiple meal plans in a single AI response. Users can select which meals to save.

## Current Behavior
- Generates a **single meal** per request
- AI prompt explicitly requests ONE meal object
- UI displays one meal card
- Save button saves one diet plan

## Proposed Behavior
- Generate **multiple meals** (Breakfast, Lunch, Dinner, Snacks) in one request
- Display all meals in a scrollable list with selection checkboxes
- Allow users to select which meals to save
- Save all selected meals to the database

---

## Implementation Plan

### 1. Update AI Prompt (Lines 256-287) - CONDITIONAL BASED ON USER REQUEST

**Current Prompt:**
```
Generate a SINGLE meal plan in JSON format ONLY.
...
Return EXACTLY ONE JSON object for ONE meal.
```

**New Dynamic Prompt Logic:**
The AI prompt should adapt based on the user's request:

```typescript
// Analyze user prompt to determine response format
const getPromptForRequest = (userPrompt: string, memberProfile: any, workoutSummary: string) => {
  const lowerPrompt = userPrompt.toLowerCase();
  
  // Check if user is requesting multiple meals
  const isMultipleMeals = 
    lowerPrompt.includes('day') || 
    lowerPrompt.includes('daily') ||
    lowerPrompt.includes('breakfast') && lowerPrompt.includes('lunch') ||
    lowerPrompt.includes('lunch') && lowerPrompt.includes('dinner') ||
    lowerPrompt.includes('breakfast') && lowerPrompt.includes('dinner') ||
    lowerPrompt.includes('all meals') ||
    lowerPrompt.includes('full meal plan') ||
    lowerPrompt.includes('multiple') ||
    lowerPrompt.includes('vegetarian') && lowerPrompt.includes('non-vegetarian');
  
  const baseProfile = `
Member Profile:
- Name: ${memberProfile.name}
- Age: ${memberProfile.age}
- Gender: ${memberProfile.gender}
- Weight: ${memberProfile.weight} kg
- Height: ${memberProfile.height} cm
- BMI: ${memberProfile.bmi}
- Interest Areas: ${memberProfile.interestAreas}
- Health Background: ${memberProfile.healthBackground}
- Dietary Requirements: ${memberProfile.dietaryRestrictions}

Current Workout Plan:
${workoutSummary}`;

  if (isMultipleMeals) {
    // Request array of meals
    return `You are a nutrition expert AI assistant. Generate MULTIPLE meal plans based on the user's request.

${baseProfile}

IMPORTANT: The user has requested multiple meals. Return a JSON ARRAY of meal objects.

Respond with ONLY raw JSON array - no markdown, no code blocks, no explanations. Start your response with [ and end with ].

JSON structure for ARRAY response:
[
  {
    "meal": "Meal name (e.g., Breakfast, Lunch, Dinner, Snacks)",
    "foods": ["food1", "food2", "food3"],
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "notes": "Optional dietary recommendations or tips"
  },
  ...more meals as requested
]`;
  } else {
    // Request single meal
    return `You are a nutrition expert AI assistant. Generate a SINGLE meal plan based on the user's request.

${baseProfile}

IMPORTANT: The user has requested a single meal. Return EXACTLY ONE JSON object.

Respond with ONLY raw JSON - no markdown, no code blocks, no explanations. Start your response with { and end with }.

JSON structure for SINGLE response:
{
  "meal": "Meal name (e.g., Breakfast, Lunch, Dinner, Snacks)",
  "foods": ["food1", "food2", "food3"],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "notes": "Optional dietary recommendations or tips"
}`;
  }
};
```

**Examples of User Requests and Expected Responses:**

| User Request | Response Format |
|--------------|-----------------|
| "Generate meal for a day" | Array of 3-5 meals |
| "Lunch and dinner plan" | Array of 2 meals |
| "Meal plan for lunch" | Single meal object |
| "One vegetarian and one non-vegetarian meal" | Array of 2 meals |
| "Breakfast" | Single meal object |

### 2. Update State Management

**Add new state variables:**
```typescript
// Change from single diet to array of diets
const [generatedDiets, setGeneratedDiets] = useState<MealPlan[]>([]);
const [selectedMealIndexes, setSelectedMealIndexes] = useState<Set<number>>(new Set());

// Remove old state
// const [generatedDiet, setGeneratedDiet] = useState<any>(null);
```

**Update MealPlan type:**
```typescript
type MealPlan = {
  meal: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  selected?: boolean; // Add selection state
};
```

### 3. Update JSON Parsing Logic (Lines 451-524)

**Handle array response:**
```typescript
// After AI validation
if (Array.isArray(dietData)) {
  // Multiple meals returned
  setGeneratedDiets(dietData.map(meal => ({
    meal: meal.meal || "Meal",
    foods: normalizeFoodsArray(meal.foods),
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    carbs: Number(meal.carbs) || 0,
    fat: Number(meal.fat) || 0,
    notes: meal.notes || "",
    selected: true // Default all selected
  })));
} else if (dietData.meals && Array.isArray(dietData.meals)) {
  // Handle { meals: [...] } structure
  setGeneratedDiets(dietData.meals.map(...));
} else {
  // Single meal - convert to array
  setGeneratedDiets([normalizedDiet]);
}

// Select all by default
setSelectedMealIndexes(new Set(generatedDiets.map((_, i) => i)));
```

### 4. Update UI to Display Multiple Meals

**Replace single card with meal list:**
```tsx
{generatedDiets.length > 0 && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold">Generated Meal Plans ({generatedDiets.length})</h3>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={selectAllMeals}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAllMeals}>
          Deselect All
        </Button>
      </div>
    </div>

    {/* Daily Summary */}
    <Card className="bg-gradient-to-r from-green-500/10 to-yellow-500/10">
      <CardContent className="p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{totalCalories}</p>
            <p className="text-xs text-muted-foreground">Total Calories</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-500">{totalProtein}g</p>
            <p className="text-xs text-muted-foreground">Protein</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500">{totalCarbs}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-500">{totalFat}g</p>
            <p className="text-xs text-muted-foreground">Fat</p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Meal Cards with Selection */}
    <ScrollArea className="h-[400px] pr-4">
      {generatedDiets.map((diet, index) => (
        <Card key={index} className={`mb-3 ${selectedMealIndexes.has(index) ? 'border-primary' : 'opacity-60'}`}>
          <CardContent className="p-4">
            {/* Selection Checkbox */}
            <div className="flex items-center gap-3 mb-3">
              <Checkbox
                checked={selectedMealIndexes.has(index)}
                onCheckedChange={(checked) => toggleMealSelection(index, checked)}
              />
              <div className="flex-1">
                <h4 className="font-bold">{diet.meal}</h4>
                <p className="text-sm text-muted-foreground">{diet.calories} kcal</p>
              </div>
            </div>
            
            {/* Foods */}
            <div className="flex flex-wrap gap-1 mb-3">
              {diet.foods.map((food, i) => (
                <Badge key={i} variant="outline">{food}</Badge>
              ))}
            </div>
            
            {/* Macros */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>P: {diet.protein}g</div>
              <div>C: {diet.carbs}g</div>
              <div>F: {diet.fat}g</div>
            </div>
            
            {/* Notes */}
            {diet.notes && (
              <p className="text-sm text-muted-foreground italic mt-2">{diet.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </ScrollArea>

    {/* Save Button */}
    <Button 
      onClick={handleSaveSelectedMeals}
      disabled={selectedMealIndexes.size === 0 || createDietMutation.isPending}
      className="w-full h-12"
    >
      <Plus className="mr-2 h-4 w-4" />
      Save {selectedMealIndexes.size} Selected Meal{selectedMealIndexes.size !== 1 ? 's' : ''}
    </Button>
  </div>
)}
```

### 5. Update Save Logic

**New save function:**
```typescript
const handleSaveSelectedMeals = async () => {
  const selectedMeals = generatedDiets.filter((_, index) => 
    selectedMealIndexes.has(index)
  );

  // Save each selected meal
  for (const meal of selectedMeals) {
    await createDietMutation.mutateAsync({
      meal: meal.meal,
      foods: meal.foods,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes || "",
      customDiet: true,
      memberId: memberId,
    });
  }

  // Close and reset after all saved
  onOpenChange(false);
  setPrompt("");
  setGeneratedDiets([]);
  setSelectedMealIndexes(new Set());
};
```

**Note:** Consider using `Promise.all` for parallel saving or sequential saving with progress indicator.

### 6. Helper Functions

```typescript
// Toggle meal selection
const toggleMealSelection = (index: number, checked: boolean) => {
  const newSelected = new Set(selectedMealIndexes);
  if (checked) {
    newSelected.add(index);
  } else {
    newSelected.delete(index);
  }
  setSelectedMealIndexes(newSelected);
};

// Select all meals
const selectAllMeals = () => {
  setSelectedMealIndexes(new Set(generatedDiets.map((_, i) => i)));
};

// Deselect all meals
const deselectAllMeals = () => {
  setSelectedMealIndexes(new Set());
};

// Calculate totals for selected meals
const selectedMeals = generatedDiets.filter((_, i) => selectedMealIndexes.has(i));
const totalCalories = selectedMeals.reduce((sum, m) => sum + m.calories, 0);
const totalProtein = selectedMeals.reduce((sum, m) => sum + m.protein, 0);
const totalCarbs = selectedMeals.reduce((sum, m) => sum + m.carbs, 0);
const totalFat = selectedMeals.reduce((sum, m) => sum + m.fat, 0);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| [`client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx`](client/src/pages/MemberProfile/tabs/GenieDietSheet.tsx) | All changes listed above |

---

## Visual Mockup

```
┌─────────────────────────────────────────────┐
│  Genie Diet                           ✕     │
├─────────────────────────────────────────────┤
│  [Member Profile Info]                      │
│  [Workout Selection]                        │
│  [Prompt Input]                             │
├─────────────────────────────────────────────┤
│  Generated Meal Plans (4)    [Select All]   │
│  ┌─────────────────────────────────────┐    │
│  │ Total: 2100 kcal | P: 120g | C: 200g | F: 70g │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ ☑ Breakfast - 500 kcal              │    │
│  │   [Oats] [Eggs] [Banana]            │    │
│  │   P: 30g | C: 60g | F: 15g          │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ ☑ Lunch - 700 kcal                  │    │
│  │   [Chicken] [Rice] [Vegetables]     │    │
│  │   P: 45g | C: 80g | F: 20g          │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ ☐ Dinner - 600 kcal                 │    │
│  │   [Salmon] [Quinoa] [Salad]         │    │
│  │   P: 35g | C: 50g | F: 25g          │    │
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │ ☑ Snacks - 300 kcal                 │    │
│  │   [Nuts] [Greek Yogurt]             │    │
│  │   P: 10g | C: 10g | F: 10g          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [Save 3 Selected Meals]                    │
└─────────────────────────────────────────────┘
```

---

## Testing Considerations

1. Test with AI returning single meal (backward compatibility)
2. Test with AI returning array of meals
3. Test selection/deselection of meals
4. Test saving multiple meals sequentially
5. Test error handling for partial save failures
6. Test with slow network for loading states
