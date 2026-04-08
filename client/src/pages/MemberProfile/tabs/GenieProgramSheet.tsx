import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Info, Plus, Dumbbell, Clock, Target, Zap, Calendar, BarChart3 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MemberProfileProps } from "../types";
import { CreateProgramSheet } from "@/components/CreateProgramSheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Using local repairJson helper

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes?: string;
};

type ProgramDay = {
  day: string;
  difficulty: string;
  duration: number;
  intensity: number;
  goal: string;
  equipment: string[];
  exercises: Exercise[];
};

// Helper function to repair malformed JSON from AI
function repairJson(jsonString: string): string {
  let result = jsonString;
  
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

interface GenieProgramSheetProps {

  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName?: string;
}

export function GenieProgramSheet({ open, onOpenChange, memberId, memberName }: GenieProgramSheetProps) {
  const [prompt, setPrompt] = useState("");
  const [generatedProgram, setGeneratedProgram] = useState<any>(null);
  const [allProgramDays, setAllProgramDays] = useState<ProgramDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [openCreateProgram, setOpenCreateProgram] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  // Mutation to create multiple workout programs
  const createProgramsMutation = useMutation({
    mutationFn: async (programs: any[]) => {
      const results = [];
      for (const program of programs) {
        const res = await apiRequest("POST", "/api/workout-programs", program);
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: `Workout programs created successfully!` });
      onOpenChange(false);
      setPrompt("");
      setGeneratedProgram(null);
      setAllProgramDays([]);
      setSelectedDay("");
      setStreamingContent("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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
      fitnessGoals: prompt,
    };

    const systemPrompt = `You are a fitness expert AI assistant. Generate a detailed workout program in JSON format ONLY. 

Member Profile:
- Name: ${memberProfile.name}
- Age: ${memberProfile.age}
- Gender: ${memberProfile.gender}
- Weight: ${memberProfile.weight} kg
- Height: ${memberProfile.height} cm
- BMI: ${memberProfile.bmi}
- Interest Areas: ${memberProfile.interestAreas}
- Requested Goal: ${memberProfile.fitnessGoals}

IMPORTANT: Respond with ONLY raw JSON - no markdown, no code blocks, no explanations. Start your response with { and end with }.

Required JSON structure:
{
  "name": "Program name",
  "day": "Monday",
  "difficulty": "Beginner",
  "duration": 60,
  "intensity": 5,
  "goal": "Strength",
  "equipment": ["equipment1", "equipment2"],
  "exercises": [
    {
      "name": "Exercise name",
      "sets": 3,
      "reps": "10-12",
      "weight": "10kg",
      "rest": "60s",
      "notes": "optional notes"
    }
  ]
}`;

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
        throw new Error("Failed to generate workout");
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
                // NVIDIA Llama model puts reasoning in separate content
                reasoningContent += data.content;
                } else if (data.type === 'done') {
                // Parse the final content - combine both content and reasoning
                const allContent = fullContent + reasoningContent;
                
                // Debug: log what's received
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
                          name: "string",
                          day: "string",
                          difficulty: "string",
                          duration: "number",
                          intensity: "number",
                          goal: "string",
                          equipment: "array",
                          exercises: "array"
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
                
                try {
                  // MANDATORY: Always validate with AI first for robust JSON parsing
                  // This handles corrupted/truncated AI responses that local parsing can't fix
                  console.log("Starting mandatory AI validation...");
                  setIsValidating(true);
                  let programData: any = await validateWithAI(allContent);
                  setIsValidating(false);
                  
                  // Fallback: If AI validation fails, try local repair methods
                  if (!programData) {
                    console.log("AI validation failed, trying local repair as fallback...");
                    try {
                      const repaired = repairJson(allContent);
                      programData = JSON.parse(repaired);
                    } catch (repairError) {
                      // Try cleaned content approach
                      let cleanedContent = allContent
                        .replace(/```json\s*/g, '')
                        .replace(/```\s*/g, '')
                        .replace(/^\s*```\s*$/gm, '')
                        .trim();
                      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        programData = JSON.parse(jsonMatch[0]);
                      } else {
                        // Both AI and local parsing failed
                        console.error("All parsing methods failed. Content:", allContent);
                        throw repairError;
                      }
                    }
                  }
                  
                  console.log("Parsed program data:", programData);
                  
                  // Handle different JSON structures from AI
                  // The AI sometimes returns { programs: [...] } or { days: [...] } or { name, day, exercises }
                  // We need to normalize to the expected format
                  
                  // Case 1: { programs: [...] } or { Programs: [...] } - take first program
                  if ((programData.programs || programData.Programs) && Array.isArray(programData.programs || programData.Programs) && (programData.programs || programData.Programs).length > 0) {
                    programData = (programData.programs || programData.Programs)[0];
                  }
                  
                  // Case 2: { days: [...] } - populate all days for tabs
                  if (programData.days && Array.isArray(programData.days) && programData.days.length > 0) {
                    // Store all days for tab navigation
                    const allDays: ProgramDay[] = programData.days.map((dayData: any) => ({
                      day: dayData.day,
                      difficulty: dayData.difficulty ?? "Beginner",
                      duration: dayData.duration ?? 60,
                      intensity: dayData.intensity ?? 5,
                      goal: dayData.goal ?? "General",
                      equipment: dayData.equipment ?? [],
                      exercises: dayData.exercises ?? []
                    }));
                    
                    setAllProgramDays(allDays);
                    setSelectedDay(allDays[0]?.day || "");
                    
                    // Use first day for the main program display
                    const firstDay = programData.days[0];
                    programData = {
                      name: programData.name || "Workout Program",
                      day: firstDay.day,
                      difficulty: firstDay.difficulty,
                      duration: firstDay.duration,
                      intensity: firstDay.intensity,
                      goal: firstDay.goal,
                      equipment: firstDay.equipment,
                      exercises: firstDay.exercises
                    };
                  }

                  // Normalize daysOfWeek structure if AI returns it
                  if (programData.daysOfWeek && Array.isArray(programData.daysOfWeek) && programData.daysOfWeek.length > 0) {
                    const first = programData.daysOfWeek[0] || {};
                    programData = {
                      name: programData.name || "Workout Program",
                      day: first.day || first.label || programData.day || "Monday",
                      difficulty: first.difficulty ?? programData.difficulty ?? "Beginner",
                      duration: first.duration ?? programData.duration ?? 60,
                      intensity: first.intensity ?? programData.intensity ?? 5,
                      goal: first.goal ?? programData.goal ?? "General",
                      equipment: first.equipment ?? programData.equipment ?? [],
                      exercises: first.exercises ?? programData.exercises ?? []
                    };
                  }
                  
                  // Case 3: If exercises is still nested inside day, flatten it
                  if (programData.day && programData.exercises) {
                    // Already in correct format
                  }

                  // Case 4: Handle numeric key format like { "1": {...}, "2": {...} }
                  // Convert to array format
                  const numericKeys = Object.keys(programData).filter(k => /^\d+$/.test(k));
                  if (numericKeys.length > 0 && !Array.isArray(programData)) {
                    const daysArray = numericKeys.sort().map(k => programData[k]);
                    if (daysArray.length > 0) {
                      const firstDay = daysArray[0];
                      programData = {
                        name: programData.name || "Workout Program",
                        day: firstDay.day,
                        difficulty: firstDay.difficulty ?? programData.difficulty ?? "Beginner",
                        duration: firstDay.duration ?? programData.duration ?? 60,
                        intensity: firstDay.intensity ?? programData.intensity ?? 5,
                        goal: firstDay.goal ?? programData.goal ?? "General",
                        equipment: firstDay.equipment ?? programData.equipment ?? [],
                        exercises: firstDay.exercises ?? programData.exercises ?? []
                      };
                    }
                  }

                  // Case 5: Handle { "Program Name": { "Monday": {...}, "Tuesday": {...} } } format
                  // This is when the program name is a key and days are nested inside
                  const programKeys = Object.keys(programData).filter(k => !k.startsWith('"') && !/^\d+$/.test(k) && typeof programData[k] === 'object');
                  if (programKeys.length === 1 && typeof programData[programKeys[0]] === 'object') {
                    const programName = programKeys[0];
                    const programContent = programData[programName];
                    
                    // Check if the program content has day keys (Monday, Tuesday, etc.)
                    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    const dayKeys = Object.keys(programContent).filter(k => dayNames.includes(k));
                    
                    if (dayKeys.length > 0) {
                      // Extract ALL days, not just the first one
                      const allDays: ProgramDay[] = dayKeys.map((dayName: string) => {
                        const dayData = programContent[dayName];
                        
                        // Extract exercises - they might be in format { "Exercise Name": {...} }
                        let exercises = dayData.exercises || [];
                        if (exercises.length > 0 && typeof exercises[0] === 'object' && !exercises[0].name) {
                          exercises = exercises.map((ex: any) => {
                            const exerciseKey = Object.keys(ex)[0];
                            return { name: exerciseKey, ...ex[exerciseKey] };
                          });
                        }
                        
                        return {
                          day: dayName,
                          difficulty: dayData.difficulty ?? "Beginner",
                          duration: dayData.duration ?? 60,
                          intensity: dayData.intensity ?? 5,
                          goal: dayData.goal ?? "General",
                          equipment: dayData.equipment ?? [],
                          exercises: exercises
                        };
                      });
                      
                      // Store all days
                      setAllProgramDays(allDays);
                      setSelectedDay(allDays[0]?.day || "");
                      
                      // Set the first day as the current program
                      const firstDay = allDays[0];
                      programData = {
                        name: programName,
                        day: firstDay.day,
                        difficulty: firstDay.difficulty,
                        duration: firstDay.duration,
                        intensity: firstDay.intensity,
                        goal: firstDay.goal,
                        equipment: firstDay.equipment,
                        exercises: firstDay.exercises
                      };
                    }
                  }
                  
                  // Case 6: Handle { "Plan Name": "Program Name", "days": { "Saturday": { "workout1": {...}, "workout2": {...} }, ... } }
                  // This is a NEW format where days is an object with workout1, workout2 sub-keys
                  if (programData["Plan Name"] && programData.days && typeof programData.days === 'object' && !Array.isArray(programData.days)) {
                    const programName = programData["Plan Name"];
                    const daysObj = programData.days;
                    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                    const dayKeys = Object.keys(daysObj).filter(k => dayNames.includes(k));
                    
                    if (dayKeys.length > 0) {
                      const allDays: ProgramDay[] = dayKeys.map((dayName: string) => {
                        const dayData = daysObj[dayName];
                        
                        // Day data may have workout1, workout2, etc. - find the first valid workout
                        let exercises: any[] = [];
                        let difficulty = "Intermediate";
                        let duration = 60;
                        let intensity = 5;
                        let goal = "General";
                        let equipment: string[] = [];
                        
                        // Check if there's workout1, workout2, etc.
                        const workoutKeys = Object.keys(dayData).filter(k => k.startsWith('workout'));
                        if (workoutKeys.length > 0) {
                          // Use the first workout for now
                          const firstWorkout = dayData[workoutKeys[0]];
                          exercises = firstWorkout.exercises || [];
                          difficulty = firstWorkout.difficulty || difficulty;
                          duration = firstWorkout.duration || duration;
                          intensity = firstWorkout.intensity || intensity;
                          goal = firstWorkout.goal || goal;
                          equipment = firstWorkout.equipment || equipment;
                        } else if (dayData.exercises) {
                          // Or use direct exercises
                          exercises = dayData.exercises;
                          difficulty = dayData.difficulty || difficulty;
                          duration = dayData.duration || duration;
                          intensity = dayData.intensity || intensity;
                          goal = dayData.goal || goal;
                          equipment = dayData.equipment || equipment;
                        }
                        
                        return {
                          day: dayName,
                          difficulty,
                          duration,
                          intensity,
                          goal,
                          equipment,
                          exercises
                        };
                      });
                      
                      // Store all days for tabs
                      setAllProgramDays(allDays);
                      setSelectedDay(allDays[0]?.day || "");
                      
                      // Set the first day as current program
                      const firstDay = allDays[0];
                      programData = {
                        name: programName,
                        day: firstDay.day,
                        difficulty: firstDay.difficulty,
                        duration: firstDay.duration,
                        intensity: firstDay.intensity,
                        goal: firstDay.goal,
                        equipment: firstDay.equipment,
                        exercises: firstDay.exercises
                      };
                    }
                  }
                  
                  setGeneratedProgram(programData);
                  // Don't auto-open - user clicks "Add Programme" button
                  toast({ title: "Workout generated successfully!" });
                } catch (parseError) {
                  console.error("Failed to parse AI response:", parseError, "Content:", allContent);
                  toast({ title: "Error", description: "Failed to parse generated workout", variant: "destructive" });
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
        toast({ title: "Error", description: error.message || "Failed to generate workout", variant: "destructive" });
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
      setGeneratedProgram(null);
      setAllProgramDays([]);
      setSelectedDay("");
      setStreamingContent("");
    }
  };

  // Check if member profile data is fully loaded
  const memberProfileComplete = member && 
    (member as any).firstName && 
    (member as any).lastName &&
    (member as any).gender &&
    latestBmi?.bodyWeight &&
    (member as any).height &&
    latestBmi?.bmi &&
    (member as any)?.interestAreas?.length > 0;

  // Computed member name from fetched data
  const memberFullName = member ? `${(member as any).firstName || ''} ${(member as any).lastName || ''}`.trim() : '';

  // Prevent closing when clicking outside
  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  // Calculate age from DOB
  const memberAge = (member as any)?.dob ? calculateAge((member as any).dob) : null;

  // Get the currently displayed day program
  const currentDayProgram = selectedDay && allProgramDays.length > 0
    ? allProgramDays.find(d => d.day === selectedDay)
    : generatedProgram;

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
              Genie Programmes
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
                  <span className="ml-2 font-medium">{(member as any)?.interestAreas?.join(", ") || "General fitness"}</span>
                </div>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Describe Your Workout Goal
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Generate a weekly fat reduction workout routine for muscle building"
                className="min-h-[120px] bg-background border-border"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about your fitness goals, target areas, and any preferences.
              </p>
            </div>

            {/* Preloader during generation and validation */}
            {(isGenerating || isValidating) && !generatedProgram && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 bg-muted/30 rounded-lg border border-border">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
                <p className="text-sm font-medium text-muted-foreground text-center">
                  {isValidating 
                    ? "Validating results..." 
                    : memberFullName 
                      ? `Generating programme for ${memberFullName}...`
                      : "Generating Programme..."
                  }
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  {isValidating
                    ? "Please wait while we verify the generated programme."
                    : prompt
                      ? `Creating a personalized programme: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`
                      : "This may take a moment as we generate a customized workout programme just for you."
                  }
                </p>
              </div>
            )}

            {/* Generated Program Preview - Shows after generation, before adding */}
            {generatedProgram && !openCreateProgram && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Generated Programme</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGeneratedProgram(null);
                      setAllProgramDays([]);
                      setSelectedDay("");
                      setStreamingContent("");
                    }}
                  >
                    Generate Another
                  </Button>
                </div>
                
                {/* Program Summary Card with Tabs */}
                <Card className="bg-gradient-to-br from-yellow-500/10 to-purple-500/10 border-yellow-500/20">
                  <CardContent className="p-4 space-y-4">
                    {/* Program Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xl font-bold text-primary">{generatedProgram.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {generatedProgram.day}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            {generatedProgram.difficulty}
                          </Badge>
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {generatedProgram.goal}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Day Tabs - Only show if we have multiple days */}
                    {allProgramDays.length > 1 ? (
                      <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
                        <TabsList className="w-full flex flex-wrap justify-start">
                          {allProgramDays.map((dayProgram) => (
                            <TabsTrigger 
                              key={dayProgram.day} 
                              value={dayProgram.day}
                              className="flex items-center gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              {dayProgram.day}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        {/* Tab Contents - Each Day */}
                        {allProgramDays.map((dayProgram) => (
                          <TabsContent key={dayProgram.day} value={dayProgram.day} className="space-y-4 mt-4">
                            {/* Day Details */}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground text-xs">Duration</p>
                                  <p className="font-medium">{dayProgram.duration || 45} min</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground text-xs">Intensity</p>
                                  <p className="font-medium">{dayProgram.intensity || 5}/10</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-muted-foreground text-xs">Exercises</p>
                                  <p className="font-medium">{dayProgram.exercises?.length || 0}</p>
                                </div>
                              </div>
                            </div>

                            {/* Equipment */}
                            {(dayProgram.equipment as string[] | string)?.length > 0 && (
                              <div className="p-3 rounded bg-background/50">
                                <p className="text-xs text-muted-foreground mb-2">Equipment Needed</p>
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    const eq = dayProgram.equipment as string[] | string | undefined;
                                    if (!eq) return [];
                                    return Array.isArray(eq) 
                                      ? eq 
                                      : typeof eq === 'string' 
                                        ? eq.split(',').map((e: string) => e.trim())
                                        : [];
                                  })().map((eq: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {eq}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Exercises List */}
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-semibold">Exercises</p>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {dayProgram.exercises?.map((exercise: Exercise, idx: number) => (
                                  <div key={idx} className="p-3 rounded bg-background border border-border">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{exercise.name}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                          <span className="font-semibold text-primary">{exercise.sets} sets</span>
                                          <span>×</span>
                                          <span>{exercise.reps} reps</span>
                                          {exercise.weight && <span>• {exercise.weight}</span>}
                                          {exercise.rest && <span>• Rest: {exercise.rest}</span>}
                                        </div>
                                        {exercise.notes && (
                                          <p className="text-xs text-muted-foreground mt-1 italic">{exercise.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    ) : (
                      // Single day or no tabs - show original layout
                      <>
                        {/* Program Details */}
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground text-xs">Duration</p>
                              <p className="font-medium">{generatedProgram.duration || generatedProgram.durationMinutes || 45} min</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground text-xs">Intensity</p>
                              <p className="font-medium">{generatedProgram.intensity || generatedProgram.intensityLevel || 5}/10</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded bg-background/50">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground text-xs">Exercises</p>
                              <p className="font-medium">{generatedProgram.exercises?.length || generatedProgram.exercises?.length || 0}</p>
                            </div>
                          </div>
                        </div>

                        {/* Equipment */}
                        {generatedProgram.equipment?.length > 0 && (
                          <div className="p-3 rounded bg-background/50">
                            <p className="text-xs text-muted-foreground mb-2">Equipment Needed</p>
                            <div className="flex flex-wrap gap-1">
                              {(Array.isArray(generatedProgram.equipment) 
                                ? generatedProgram.equipment 
                                : typeof generatedProgram.equipment === 'string' 
                                  ? generatedProgram.equipment.split(',').map((e: string) => e.trim())
                                  : []
                              ).map((eq: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {eq}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exercises List */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-semibold">Exercises</p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {generatedProgram.exercises?.map((exercise: Exercise, idx: number) => (
                              <div key={idx} className="p-3 rounded bg-background border border-border">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{exercise.name}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                      <span className="font-semibold text-primary">{exercise.sets} sets</span>
                                      <span>×</span>
                                      <span>{exercise.reps} reps</span>
                                      {exercise.weight && <span>• {exercise.weight}</span>}
                                      {exercise.rest && <span>• Rest: {exercise.rest}</span>}
                                    </div>
                                    {exercise.notes && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">{exercise.notes}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Add Programme Button - Creates all days at once */}
                    <Button
                      onClick={async () => {
                        // If we have multiple days, create programs for all days
                        if (allProgramDays.length > 1) {
                          const programs = allProgramDays.map((dayProgram) => ({
                            name: generatedProgram.name,
                            day: dayProgram.day,
                            difficulty: dayProgram.difficulty,
                            duration: dayProgram.duration,
                            intensity: dayProgram.intensity,
                            goal: dayProgram.goal,
                            exercises: dayProgram.exercises.filter((ex: any) => ex.name && ex.name.trim() !== ""),
                            equipment: dayProgram.equipment,
                            customWorkoutPlan: true,
                            memberId: memberId,
                          }));
                          createProgramsMutation.mutate(programs);
                        } else {
                          // Single day - open the CreateProgramSheet for editing
                          setOpenCreateProgram(true);
                        }
                      }}
                      disabled={createProgramsMutation.isPending}
                      className="w-full h-12 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-600 hover:to-purple-700 text-white font-bold"
                    >
                      {createProgramsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {!createProgramsMutation.isPending && <Plus className="mr-2 h-4 w-4" />}
                      {allProgramDays.length > 1 ? `Add All ${allProgramDays.length} Programs` : "Add Programme"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Generate Button - Show when not generating and no generated program */}
            {!isGenerating && !generatedProgram && (
              <>
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !memberProfileComplete}
                  className="w-full h-12 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-600 hover:to-purple-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Workout Programmes
                </Button>

                {/* Warning when profile is incomplete */}
                {!memberProfileComplete && (
                  <p className="text-xs text-yellow-500 text-center">
                    Please complete member profile (name, gender, DOB, weight, height, BMI, interests) to generate workouts
                  </p>
                )}

                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">Example prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Weekly fat loss program",
                      "Muscle building routine",
                      "Beginner strength training",
                      "High intensity cardio"
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

      {/* Create Program Sheet - Opens when user clicks "Add Programme" */}
      {generatedProgram && (
        <CreateProgramSheet
          open={openCreateProgram}
          onOpenChange={(isOpen) => {
            setOpenCreateProgram(isOpen);
            if (!isOpen) {
              onOpenChange(false);
              setPrompt("");
              setGeneratedProgram(null);
              setStreamingContent("");
            }
          }}
          initialData={generatedProgram}
          preselectedMemberId={memberId}
          preselectCustomWorkout={true}
        />
      )}
    </>
  );
}
