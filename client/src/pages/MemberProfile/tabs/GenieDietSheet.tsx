import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Info, Plus, Apple, Utensils, BarChart3, Ban, Carrot, Dumbbell, Heart, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MemberProfileProps } from "../types";
import { CreateDietSheet } from "@/components/CreateDietSheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutProgram, WorkoutProgramAssignment } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

type MealPlan = {
  meal: string;
  foods: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
};

// Helper function to detect if user is requesting multiple meals
function isMultipleMealsRequest(userPrompt: string): boolean {
  const lowerPrompt = userPrompt.toLowerCase();
  return (
    lowerPrompt.includes('day') ||
    lowerPrompt.includes('daily') ||
    lowerPrompt.includes('full meal plan') ||
    lowerPrompt.includes('all meals') ||
    (lowerPrompt.includes('breakfast') && lowerPrompt.includes('lunch')) ||
    (lowerPrompt.includes('lunch') && lowerPrompt.includes('dinner')) ||
    (lowerPrompt.includes('breakfast') && lowerPrompt.includes('dinner')) ||
    lowerPrompt.includes('multiple') ||
    (lowerPrompt.includes('vegetarian') && lowerPrompt.includes('non-vegetarian')) ||
    lowerPrompt.includes('week') ||
    lowerPrompt.includes('meal plan for') && (lowerPrompt.includes(' and ') || lowerPrompt.includes('&'))
  );
}

// Helper function to repair malformed JSON from AI
function repairJson(jsonString: string): string {
  let result = jsonString;
  
  // First, remove all newlines and excessive whitespace within the string values
  // This handles the case where AI generates character-by-character with spaces
  result = result.replace(/"\s+/g, '"');
  result = result.replace(/\s+"/g, '"');
  
  // Remove spaces between property names and colons
  result = result.replace(/"\s*:"/g, '":"');
  
  // Fix missing quotes around property names
  result = result.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  
  // Fix empty values like "weight": ,  → "weight": ""
  result = result.replace(/:\s*,/g, ': "",');
  result = result.replace(/:\s*}/g, ': ""}');
  
  // Fix trailing commas
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix unclosed strings (add missing closing quotes)
  const quoteCount = (result.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    result += '"';
  }
  
  return result;
}

// Helper function to extract the first valid JSON structure (object or array) from a string
function extractFirstJsonObject(content: string): string {
  // Try to find the first complete JSON object OR array
  let braceCount = 0;
  let bracketCount = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;
  let isArray = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      // Track both braces {} and brackets []
      if (char === '{') {
        if (braceCount === 0 && bracketCount === 0) {
          startIndex = i;
          isArray = false;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && bracketCount === 0 && startIndex !== -1) {
          // Found complete JSON object
          return content.substring(startIndex, i + 1);
        }
      } else if (char === '[') {
        if (braceCount === 0 && bracketCount === 0) {
          startIndex = i;
          isArray = true;
        }
        bracketCount++;
      } else if (char === ']') {
        bracketCount--;
        if (braceCount === 0 && bracketCount === 0 && startIndex !== -1) {
          // Found complete JSON array
          return content.substring(startIndex, i + 1);
        }
      }
    }
  }
  
  // If no complete structure found, return the original content
  return content;
}

interface GenieDietSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName?: string;
}

export function GenieDietSheet({ open, onOpenChange, memberId, memberName }: GenieDietSheetProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedDiets, setGeneratedDiets] = useState<MealPlan[]>([]);
  const [selectedMealIndexes, setSelectedMealIndexes] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // Mutation to create diet plan
  const createDietMutation = useMutation({
    mutationFn: async (dietData: any) => {
      const res = await apiRequest("POST", "/api/diet-plans", dietData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "diet-assignments"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Helper function to save multiple selected meals
  const handleSaveSelectedMeals = async () => {
    const selectedMeals = generatedDiets.filter((_, index) => 
      selectedMealIndexes.has(index)
    );

    if (selectedMeals.length === 0) {
      toast({ title: "Please select at least one meal to save", variant: "destructive" });
      return;
    }

    let savedCount = 0;
    for (let i = 0; i < generatedDiets.length; i++) {
      if (selectedMealIndexes.has(i)) {
        const meal = generatedDiets[i];
        setSavingIndex(i);
        try {
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
          savedCount++;
        } catch (error) {
          console.error(`Failed to save meal ${meal.meal}:`, error);
        }
      }
    }

    setSavingIndex(null);
    toast({ title: `Successfully saved ${savedCount} meal plan${savedCount !== 1 ? 's' : ''}!` });
    onOpenChange(false);
    setPrompt("");
    setGeneratedDiets([]);
    setSelectedMealIndexes(new Set());
    setStreamingContent("");
    setParseError(null);
  };

  // Helper functions for meal selection
  const toggleMealSelection = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedMealIndexes);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedMealIndexes(newSelected);
  };

  const selectAllMeals = () => {
    setSelectedMealIndexes(new Set(generatedDiets.map((_, i) => i)));
  };

  const deselectAllMeals = () => {
    setSelectedMealIndexes(new Set());
  };

  // Calculate totals for selected meals
  const selectedMealsTotal = generatedDiets
    .filter((_, i) => selectedMealIndexes.has(i))
    .reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Fetch member profile data
  const { data: member } = useQuery({
    queryKey: ["/api/members", memberId],
    enabled: !!memberId && open,
  });

  // Fetch member BMI records for latest BMI data
  const { data: bmiRecords = [] } = useQuery({
    queryKey: ["/api/members", memberId, "bmi-records"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/bmi-records`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId && open,
  });

  // Get latest BMI record
  const latestBmi = bmiRecords.length > 0 
    ? bmiRecords.sort((a: any, b: any) => {
        const dateA = a.recordDate.split("/").reverse().join("");
        const dateB = b.recordDate.split("/").reverse().join("");
        return dateB.localeCompare(dateA);
      })[0]
    : null;

  // Fetch workout assignments for the member
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

  // Fetch custom workouts specifically created for this member
  const { data: customWorkouts = [] } = useQuery({
    queryKey: ["/api/workout-programs", "custom", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/workout-programs?memberId=${memberId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId && open,
  });

  // Combine assigned workouts with custom workouts for this member
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

  function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    // Compile member profile information
    const memberProfile = {
      name: member ? `${(member as any).firstName} ${(member as any).lastName}` : "Unknown",
      age: (member as any)?.dob ? calculateAge((member as any).dob) : "Not specified",
      gender: (member as any)?.gender || "Not specified",
      weight: latestBmi?.bodyWeight || (member as any)?.height || "Not specified",
      height: (member as any)?.height || "Not specified",
      bmi: latestBmi?.bmi || "Not calculated",
      interestAreas: (member as any)?.interestAreas?.join(", ") || "General fitness",
      healthBackground: (member as any)?.healthBackground || "None reported",
      dietaryRestrictions: prompt,
    };

    // Create workout summary for AI context - filter by selected workouts
    const selectedWorkouts = selectedWorkoutIds.size > 0
      ? memberWorkouts.filter((w: WorkoutProgram) => selectedWorkoutIds.has(w.id))
      : memberWorkouts; // If none selected, use all workouts

    const workoutSummary = selectedWorkouts.length > 0 
      ? selectedWorkouts.map((w: WorkoutProgram) => 
          `- ${w.name} (${w.day}): Goal: ${w.goal}, Intensity: ${w.intensity}/10, Duration: ${w.duration} min, ${(w.exercises as any[])?.length || 0} exercises`
        ).join("\n")
      : "No active workout plan assigned";

    // Determine if user is requesting multiple meals
    const requestMultipleMeals = isMultipleMealsRequest(prompt);

    const baseProfile = `Member Profile:
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
${workoutSummary}

IMPORTANT: Consider the member's fitness interests, health background, and current workout intensity when recommending the diet. Align the nutritional requirements with their workout goals (e.g., higher protein for muscle building, controlled calories for weight loss, avoid foods that may conflict with health conditions).`;

    let systemPrompt: string;

    if (requestMultipleMeals) {
      // Prompt for multiple meals (array response)
      systemPrompt = `You are a nutrition expert AI assistant. Generate MULTIPLE meal plans based on the user's request.

${baseProfile}

The user has requested multiple meals. Return a JSON ARRAY of meal objects.

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
    "notes": "Optional dietary recommendations or tips specific to this meal"
  },
  ...more meals as requested
]`;
    } else {
      // Prompt for single meal (object response)
      systemPrompt = `You are a nutrition expert AI assistant. Generate a SINGLE meal plan based on the user's request.

${baseProfile}

The user has requested a single meal. Return EXACTLY ONE JSON object.

Respond with ONLY raw JSON - no markdown, no code blocks, no explanations. Start your response with { and end with }.

JSON structure for SINGLE response:
{
  "meal": "Meal name (e.g., Breakfast, Lunch, Dinner, Snacks)",
  "foods": ["food1", "food2", "food3"],
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "notes": "Optional dietary recommendations or tips specific to this meal"
}`;
    }

    setIsGenerating(true);
    setStreamingContent("");
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error("Failed to generate diet");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let reasoningContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content') {
                fullContent += data.content;
                setStreamingContent(fullContent);
              } else if (data.type === 'reasoning') {
                reasoningContent += data.content;
              } else if (data.type === 'done') {
                const allContent = fullContent + reasoningContent;
                
                console.log("Full content length:", allContent.length);
                console.log("Content preview:", allContent.substring(0, 500));
                
                // Function to validate JSON using AI - ALWAYS use this for robust parsing
                const validateWithAI = async (jsonString: string): Promise<any> => {
                  try {
                    const validateResponse = await fetch("/api/ai-json-validate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        jsonString: jsonString,
                        schema: {
                          meal: "string",
                          foods: "array",
                          calories: "number",
                          protein: "number",
                          carbs: "number",
                          fat: "number",
                          notes: "string?"
                        }
                      })
                    });
                    
                    if (!validateResponse.ok) {
                      throw new Error("Validation request failed");
                    }
                    
                    const result = await validateResponse.json();
                    console.log("AI Validation result:", result);
                    
                    if (result.valid && result.json) {
                      return JSON.parse(result.json);
                    } else {
                      console.error("AI validation failed:", result.error);
                      return null;
                    }
                  } catch (validateError) {
                    console.error("AI validation error:", validateError);
                    return null;
                  }
                };
                
                // Function to try local JSON parsing with multiple strategies
                const tryLocalParsing = (content: string): any => {
                  // Strategy 1: Direct parse
                  try {
                    return JSON.parse(content);
                  } catch (e) {
                    console.log("Direct parse failed");
                  }
                  
                  // Strategy 2: Remove markdown code blocks
                  let cleaned = content
                    .replace(/```json\s*/gi, '')
                    .replace(/```\s*/g, '')
                    .trim();
                  
                  try {
                    return JSON.parse(cleaned);
                  } catch (e) {
                    console.log("Markdown removal parse failed");
                  }
                  
                  // Strategy 3: Extract JSON object from content
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      return JSON.parse(jsonMatch[0]);
                    } catch (e) {
                      console.log("JSON extraction parse failed");
                    }
                  }
                  
                  // Strategy 4: Aggressive cleanup for character-by-character streaming
                  let aggressive = content
                    .replace(/```json\s*/gi, '')
                    .replace(/```\s*/g, '')
                    .replace(/\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  const aggressiveMatch = aggressive.match(/\{[\s\S]*\}/);
                  if (aggressiveMatch) {
                    try {
                      let repaired = repairJson(aggressiveMatch[0]);
                      return JSON.parse(repaired);
                    } catch (e) {
                      console.log("Aggressive cleanup parse failed");
                    }
                  }
                  
                  // Strategy 5: Fix common JSON issues
                  let fixed = content
                    .replace(/,\s*}/g, '}')
                    .replace(/,\s*]/g, ']')
                    .replace(/'\s*:/g, '":')
                    .replace(/:\s*'/g, ':"')
                    .replace(/'\s*,/g, '",')
                    .replace(/'\s*}/g, '"}')
                    .replace(/'\s*]/g, '"]');
                  
                  const fixedMatch = fixed.match(/\{[\s\S]*\}/);
                  if (fixedMatch) {
                    try {
                      return JSON.parse(fixedMatch[0]);
                    } catch (e) {
                      console.log("Fixed JSON parse failed");
                    }
                  }
                  
                  return null;
                };
                
                try {
                  // MANDATORY: Always use AI validation for schema compliance
                  console.log("Starting MANDATORY AI validation for schema compliance...");
                  setIsValidating(true);
                  setParseError(null);
                  
                  // Extract first JSON object if multiple are present
                  const firstJsonObject = extractFirstJsonObject(allContent);
                  console.log("Extracted first JSON object:", firstJsonObject.substring(0, 200));
                  
                  let dietData: any = await validateWithAI(firstJsonObject);
                  setIsValidating(false);
                  
                  // If AI validation fails, show error and DO NOT fall back to local parsing
                  if (!dietData) {
                    console.error("AI validation failed. Content:", allContent);
                    setParseError("AI validation failed to parse the response. Please try again.");
                    toast({ 
                      title: "Validation Failed", 
                      description: "The AI response could not be validated. Please try generating again.",
                      variant: "destructive" 
                    });
                    return; // Exit early - don't try local parsing
                  }
                  
                  console.log("AI validation successful. Parsed diet data:", dietData);
                  
                  // Helper function to convert food items to strings
                  const normalizeFoodsArray = (foods: any): string[] => {
                    if (!foods) return [];
                    if (typeof foods === 'string') {
                      return foods.split(',').map((f: string) => f.trim()).filter(Boolean);
                    }
                    if (!Array.isArray(foods)) return [];
                    
                    return foods.map((item: any) => {
                      // If item is a string, use it directly
                      if (typeof item === 'string') return item;
                      // If item is an object, try to extract a meaningful name
                      if (typeof item === 'object' && item !== null) {
                        // Common properties that might contain the food name
                        return item.name || item.food || item.item || item.meal || JSON.stringify(item);
                      }
                      return String(item);
                    }).filter(Boolean);
                  };

                  // Helper function to normalize a single meal object
                  const normalizeMeal = (mealData: any): MealPlan => ({
                    meal: mealData.meal || mealData.name || "Meal",
                    foods: normalizeFoodsArray(mealData.foods),
                    calories: Number(mealData.calories) || 0,
                    protein: Number(mealData.protein) || 0,
                    carbs: Number(mealData.carbs) || 0,
                    fat: Number(mealData.fat) || 0,
                    notes: mealData.notes || "",
                  });

                  // Handle both array and single object responses
                  let normalizedDiets: MealPlan[] = [];
                  
                  if (Array.isArray(dietData)) {
                    // AI returned an array of meals
                    normalizedDiets = dietData.map(normalizeMeal);
                  } else if (dietData.meals && Array.isArray(dietData.meals)) {
                    // AI returned { meals: [...] } structure
                    normalizedDiets = dietData.meals.map(normalizeMeal);
                  } else {
                    // AI returned a single meal object
                    normalizedDiets = [normalizeMeal(dietData)];
                  }
                  
                  setGeneratedDiets(normalizedDiets);
                  // Select all meals by default
                  setSelectedMealIndexes(new Set(normalizedDiets.map((_, i) => i)));
                  setParseError(null);
                  toast({ title: `${normalizedDiets.length} meal plan${normalizedDiets.length !== 1 ? 's' : ''} generated successfully!` });
                } catch (parseError: any) {
                  console.error("Failed to parse AI response:", parseError, "Content:", allContent);
                  setParseError(parseError.message || "Failed to parse generated diet");
                  toast({ 
                    title: "Error", 
                    description: parseError.message || "Failed to parse generated diet", 
                    variant: "destructive" 
                  });
                } finally {
                  setIsValidating(false);
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast({ title: "Generation cancelled" });
      } else {
        console.error("Generation error:", error);
        toast({ title: "Error", description: error.message || "Failed to generate diet", variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
      setIsValidating(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleSheetClose = (isOpen: boolean) => {
    if (isGenerating) {
      handleCancel();
    }
    onOpenChange(isOpen);
    if (!isOpen) {
      setPrompt("");
      setGeneratedDiets([]);
      setSelectedMealIndexes(new Set());
      setStreamingContent("");
      setSelectedWorkoutIds(new Set());
      setParseError(null);
    }
  };

  // Check if member profile data is fully loaded
  const memberProfileComplete = member && 
    (member as any).firstName && 
    (member as any).lastName &&
    (member as any).gender;

  // Computed member name from fetched data
  const memberFullName = member ? `${(member as any).firstName || ''} ${(member as any).lastName || ''}`.trim() : '';

  // Prevent closing when clicking outside
  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  // Calculate age from DOB
  const memberAge = (member as any)?.dob ? calculateAge((member as any).dob) : null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetClose}>
        <SheetContent 
          className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto"
          onInteractOutside={handleInteractOutside}
        >
          <SheetHeader className="border-b border-border pb-6 mb-6">
            <SheetTitle className="text-2xl font-bold font-heading text-primary flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              Genie Diet
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Member Info Summary */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Member Profile</span>
                {!memberProfileComplete && (
                  <Badge variant="outline" className="ml-auto text-xs text-yellow-500 border-yellow-500">
                    Incomplete
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <span className="ml-2 font-medium">{memberFullName || "Loading..."}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="ml-2 font-medium capitalize">{(member as any)?.gender || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="ml-2 font-medium">{(member as any)?.dob || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Age:</span>
                  <span className="ml-2 font-medium">{memberAge !== null ? `${memberAge} years` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Weight:</span>
                  <span className="ml-2 font-medium">{latestBmi?.bodyWeight ? `${latestBmi.bodyWeight} kg` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Height:</span>
                  <span className="ml-2 font-medium">{(member as any)?.height ? `${(member as any).height} cm` : "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">BMI:</span>
                  <span className="ml-2 font-medium">{latestBmi?.bmi || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Interests:</span>
                  <span className="ml-2 font-medium">{(member as any)?.interestAreas?.join(", ") || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Health Background:</span>
                  <span className="ml-2 font-medium">{(member as any)?.healthBackground || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Workout Selection - Only show if member has workouts */}
            {memberWorkouts.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">Select Workouts to Consider</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedWorkoutIds.size} of {memberWorkouts.length} selected
                  </span>
                </div>
                <ScrollArea className="h-40 rounded border border-border bg-background">
                  <div className="p-2 space-y-1">
                    {memberWorkouts.map((w: WorkoutProgram) => (
                      <div
                        key={w.id}
                        className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-md cursor-pointer"
                        onClick={() => {
                          const newSelected = new Set(selectedWorkoutIds);
                          if (newSelected.has(w.id)) {
                            newSelected.delete(w.id);
                          } else {
                            newSelected.add(w.id);
                          }
                          setSelectedWorkoutIds(newSelected);
                        }}
                      >
                        <Checkbox
                          id={`workout-${w.id}`}
                          checked={selectedWorkoutIds.has(w.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedWorkoutIds);
                            if (checked) {
                              newSelected.add(w.id);
                            } else {
                              newSelected.delete(w.id);
                            }
                            setSelectedWorkoutIds(newSelected);
                          }}
                          className="h-4 w-4"
                        />
                        <Label
                          htmlFor={`workout-${w.id}`}
                          className="text-sm font-normal cursor-pointer flex-1 flex items-center justify-between"
                        >
                          <span>{w.name}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{w.day}</Badge>
                            <span>{w.goal}</span>
                          </div>
                        </Label>
                        {selectedWorkoutIds.has(w.id) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const allIds = new Set(memberWorkouts.map((w: WorkoutProgram) => w.id));
                      setSelectedWorkoutIds(allIds);
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedWorkoutIds(new Set())}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Describe Your Diet Goal
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Generate a high-protein diet plan for muscle building, or a low-calorie diet for weight loss"
                className="min-h-[120px] bg-background border-border"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about your diet goals, calorie requirements, and any food preferences or restrictions.
              </p>
            </div>

            {/* Preloader during generation and validation */}
            {(isGenerating || isValidating) && generatedDiets.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-muted/30 rounded-lg border border-border">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
                <p className="text-sm font-medium text-muted-foreground text-center">
                  {isValidating 
                    ? "Validating results..." 
                    : memberFullName 
                      ? `Generating diet plan for ${memberFullName}...`
                      : "Generating Diet Plan..."
                  }
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  {isValidating
                    ? "Please wait while we verify the generated diet plan."
                    : prompt
                      ? `Creating a personalized diet plan: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`
                      : "This may take a moment as we generate a customized meal plan just for you."
                  }
                </p>
                {selectedWorkoutIds.size > 0 && (
                  <p className="text-xs text-yellow-600 text-center max-w-xs">
                    Considering {selectedWorkoutIds.size} selected workout{selectedWorkoutIds.size !== 1 ? 's' : ''} in your plan
                  </p>
                )}
              </div>
            )}

            {/* Parse Error Display */}
            {parseError && !isGenerating && generatedDiets.length === 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-semibold text-destructive">Generation Failed</p>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{parseError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setParseError(null);
                    setStreamingContent("");
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Generated Diets Preview - Shows after generation, before adding */}
            {generatedDiets.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Generated Meal Plans ({generatedDiets.length})</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGeneratedDiets([]);
                      setSelectedMealIndexes(new Set());
                      setStreamingContent("");
                      setParseError(null);
                    }}
                  >
                    Generate Another
                  </Button>
                </div>

                {/* Daily Summary Card - Show totals for selected meals */}
                <Card className="bg-gradient-to-r from-green-500/10 to-yellow-500/10 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold">Selected Meals Total</span>
                      <span className="text-xs text-muted-foreground">
                        {selectedMealIndexes.size} of {generatedDiets.length} selected
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{selectedMealsTotal.calories}</p>
                        <p className="text-xs text-muted-foreground">Calories</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-500">{selectedMealsTotal.protein}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{selectedMealsTotal.carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-500">{selectedMealsTotal.fat}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selection Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllMeals}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllMeals}>
                    Deselect All
                  </Button>
                </div>

                {/* Meal Cards with Selection */}
                <ScrollArea className="h-[350px] pr-2">
                  <div className="space-y-3">
                    {generatedDiets.map((diet, index) => (
                      <Card 
                        key={index} 
                        className={`${selectedMealIndexes.has(index) ? 'border-primary border-2' : 'opacity-70'}`}
                      >
                        <CardContent className="p-4">
                          {/* Selection Checkbox & Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <Checkbox
                              checked={selectedMealIndexes.has(index)}
                              onCheckedChange={(checked) => toggleMealSelection(index, checked as boolean)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-primary">{diet.meal}</h4>
                                <span className="text-sm font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                                  {diet.calories} kcal
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {diet.foods?.length || 0} food items
                              </p>
                            </div>
                          </div>

                          {/* Foods List */}
                          <div className="flex flex-wrap gap-1 mb-3 ml-7">
                            {diet.foods.map((food, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {food}
                              </Badge>
                            ))}
                          </div>

                          {/* Macros */}
                          <div className="grid grid-cols-3 gap-2 text-center text-sm ml-7">
                            <div className="p-2 rounded bg-blue-500/10">
                              <span className="font-bold text-blue-500">{diet.protein}g</span>
                              <span className="text-xs text-muted-foreground ml-1">P</span>
                            </div>
                            <div className="p-2 rounded bg-green-500/10">
                              <span className="font-bold text-green-500">{diet.carbs}g</span>
                              <span className="text-xs text-muted-foreground ml-1">C</span>
                            </div>
                            <div className="p-2 rounded bg-orange-500/10">
                              <span className="font-bold text-orange-500">{diet.fat}g</span>
                              <span className="text-xs text-muted-foreground ml-1">F</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {diet.notes && (
                            <div className="mt-3 ml-7 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                              <p className="text-xs text-muted-foreground italic">{diet.notes}</p>
                            </div>
                          )}

                          {/* Saving indicator */}
                          {savingIndex === index && (
                            <div className="mt-2 ml-7 flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Saving...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {/* Save Selected Meals Button */}
                <Button
                  onClick={handleSaveSelectedMeals}
                  disabled={selectedMealIndexes.size === 0 || createDietMutation.isPending}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-bold"
                >
                  {createDietMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!createDietMutation.isPending && <Plus className="mr-2 h-4 w-4" />}
                  Save {selectedMealIndexes.size} Selected Meal{selectedMealIndexes.size !== 1 ? 's' : ''}
                </Button>
              </div>
            )}

            {/* Generate Button - Show when not generating and no generated diets */}
            {!isGenerating && generatedDiets.length === 0 && (
              <>
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !memberProfileComplete}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Diet Plan
                </Button>

                {/* Warning when profile is incomplete */}
                {!memberProfileComplete && (
                  <p className="text-xs text-yellow-500 text-center">
                    Please complete member profile (name, gender, DOB) to generate diets
                  </p>
                )}

                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">Example prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "High protein for muscle building",
                      "Low calorie for weight loss",
                      "Balanced diet for maintenance",
                      "Meal plan for a day",
                      "Breakfast and lunch"
                    ].map((example, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setPrompt(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Cancel Button - Show only when generating */}
            {isGenerating && (
              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10 font-bold"
              >
                Cancel
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
