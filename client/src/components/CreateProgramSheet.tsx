import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkoutProgram, Member } from "@shared/schema";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes?: string;
};

type ProgramForm = {
  name: string;
  day: string;
  difficulty: string;
  duration: string;
  intensity: number;
  goal: string;
  exercises: Exercise[];
  equipment: string[];
  equipmentInput: string;
  customWorkoutPlan: boolean;
  memberId: string;
};

interface CreateProgramSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProgram?: WorkoutProgram | null;
  initialData?: WorkoutProgram | null;
  preselectedMemberId?: string;
  preselectCustomWorkout?: boolean;
}

const defaultForm: ProgramForm = {
  name: "",
  day: "Monday",
  difficulty: "Intermediate",
  duration: "60",
  intensity: 5,
  goal: "Hypertrophy",
  exercises: [{ name: "", sets: 4, reps: "8-10", weight: "", rest: "90s", notes: "" }],
  equipment: [],
  equipmentInput: "",
  customWorkoutPlan: false,
  memberId: "",
};

export function CreateProgramSheet({ open, onOpenChange, editingProgram, initialData, preselectedMemberId, preselectCustomWorkout }: CreateProgramSheetProps) {
  const [programForm, setProgramForm] = useState<ProgramForm>(defaultForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch members for the dropdown
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  // Reset form when opening/closing or when editingProgram/initialData changes
  useEffect(() => {
    if (open) {
      if (editingProgram) {
        // Edit mode - populate from existing program
        setProgramForm({
          name: editingProgram.name,
          day: editingProgram.day,
          difficulty: editingProgram.difficulty,
          duration: String(editingProgram.duration),
          intensity: editingProgram.intensity,
          goal: editingProgram.goal || "Hypertrophy",
          exercises: editingProgram.exercises as Exercise[],
          equipment: editingProgram.equipment as string[],
          equipmentInput: (editingProgram.equipment as string[]).join(", "),
          customWorkoutPlan: (editingProgram as any).customWorkoutPlan || false,
          memberId: (editingProgram as any).memberId || "",
        });
      } else if (initialData) {
        // Create mode with initial data - pre-populate form but don't treat as editing
        setProgramForm({
          name: initialData.name,
          day: initialData.day,
          difficulty: initialData.difficulty,
          duration: String(initialData.duration),
          intensity: initialData.intensity,
          goal: initialData.goal || "Hypertrophy",
          exercises: (initialData.exercises as Exercise[]) || [],
          equipment: (initialData.equipment as string[]) || [],
          equipmentInput: Array.isArray(initialData.equipment) 
            ? (initialData.equipment as string[]).join(", ")
            : typeof initialData.equipment === 'string'
              ? initialData.equipment
              : "",
          customWorkoutPlan: preselectCustomWorkout ?? true,
          memberId: preselectedMemberId || "",
        });
      } else {
        // Create mode - empty form with preselected values
        setProgramForm({
          ...defaultForm,
          customWorkoutPlan: preselectCustomWorkout || false,
          memberId: preselectedMemberId || "",
        });
      }
    }
  }, [open, editingProgram, initialData, preselectedMemberId, preselectCustomWorkout]);

  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/workout-programs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Workout program created" });
      onOpenChange(false);
      setProgramForm(defaultForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/workout-programs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Workout program updated" });
      onOpenChange(false);
      setProgramForm(defaultForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleProgramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const equipmentArray = programForm.equipmentInput.split(",").map(e => e.trim()).filter(Boolean);
    const data = {
      name: programForm.name,
      day: programForm.day,
      difficulty: programForm.difficulty,
      duration: parseInt(programForm.duration) || 60,
      intensity: Number(programForm.intensity),
      goal: programForm.goal,
      exercises: programForm.exercises.filter(ex => ex.name.trim() !== ""),
      equipment: equipmentArray,
      customWorkoutPlan: programForm.customWorkoutPlan,
      memberId: programForm.customWorkoutPlan && programForm.memberId ? programForm.memberId : null,
    };

    if (editingProgram) {
      updateProgramMutation.mutate({ id: editingProgram.id, data });
    } else {
      createProgramMutation.mutate(data);
    }
  };

  const isPending = createProgramMutation.isPending || updateProgramMutation.isPending;
  const isEditing = !!editingProgram;
  
   // Prevent closing when clicking outside
  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full bg-card border-l border-border overflow-y-auto"
      onInteractOutside={handleInteractOutside}>
        <SheetHeader className="border-b border-border pb-6 mb-6">
          <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
            {isEditing ? "Edit Program" : "Create New Program"}
          </SheetTitle>
        </SheetHeader>
        <form className="space-y-8" onSubmit={handleProgramSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Program Name</Label>
                <Input 
                  value={programForm.name} 
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} 
                  placeholder="e.g. Hypertrophy Plan" 
                  className="bg-background border-border h-11" 
                  required 
                  data-testid="input-program-name" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Day</Label>
                  <Select value={programForm.day} onValueChange={(val) => setProgramForm({ ...programForm, day: val })}>
                    <SelectTrigger className="bg-background border-border h-11" data-testid="select-program-day">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Difficulty</Label>
                  <Select value={programForm.difficulty} onValueChange={(val) => setProgramForm({ ...programForm, difficulty: val })}>
                    <SelectTrigger className="bg-background border-border h-11" data-testid="select-program-difficulty">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration (mins)</Label>
                  <Input 
                    type="number" 
                    value={programForm.duration} 
                    onChange={(e) => setProgramForm({ ...programForm, duration: e.target.value })} 
                    className="bg-background border-border h-11" 
                    data-testid="input-program-duration" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Intensity (1-10): {programForm.intensity}</Label>
                  <Input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={programForm.intensity} 
                    onChange={(e) => setProgramForm({ ...programForm, intensity: parseInt(e.target.value) })} 
                    className="accent-primary h-11" 
                    data-testid="input-program-intensity" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Goal</Label>
                <Select value={programForm.goal} onValueChange={(val) => setProgramForm({ ...programForm, goal: val })}>
                  <SelectTrigger className="bg-background border-border h-11" data-testid="select-program-goal">
                    <SelectValue placeholder="Goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strength">Strength</SelectItem>
                    <SelectItem value="Hypertrophy">Hypertrophy</SelectItem>
                    <SelectItem value="Fat Loss">Fat Loss</SelectItem>
                    <SelectItem value="Endurance">Endurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipment (comma separated)</Label>
                <Input 
                  value={programForm.equipmentInput} 
                  onChange={(e) => setProgramForm({ ...programForm, equipmentInput: e.target.value })} 
                  placeholder="e.g. Barbell, Dumbbells, Bench" 
                  className="bg-background border-border h-11" 
                  data-testid="input-program-equipment" 
                />
              </div>
              
              {/* Custom Workout Plan - Yes/No */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Workout Plan</Label>
                <Select 
                  value={programForm.customWorkoutPlan ? "true" : "false"} 
                  onValueChange={(val) => setProgramForm({ ...programForm, customWorkoutPlan: val === "true", memberId: val === "false" ? "" : programForm.memberId })}
                >
                  <SelectTrigger className="bg-background border-border h-11" data-testid="select-custom-workout">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No - General Program</SelectItem>
                    <SelectItem value="true">Yes - Custom for Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select Member - Only visible when Custom Workout Plan is true */}
              {programForm.customWorkoutPlan && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Member</Label>
                  <Select 
                    value={programForm.memberId} 
                    onValueChange={(val) => setProgramForm({ ...programForm, memberId: val })}
                  >
                    <SelectTrigger className="bg-background border-border h-11" data-testid="select-member">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exercises</Label>
                {programForm.exercises.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border space-y-2 bg-background">
                    <div className="flex items-center gap-2">
                      <Input 
                        value={ex.name} 
                        onChange={(e) => {
                          const newExercises = [...programForm.exercises];
                          newExercises[idx] = { ...ex, name: e.target.value };
                          setProgramForm({ ...programForm, exercises: newExercises });
                        }} 
                        placeholder="Exercise name" 
                        className="flex-1 h-9" 
                        data-testid={`input-exercise-name-${idx}`}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive" 
                        onClick={() => {
                          const newExercises = programForm.exercises.filter((_, i) => i !== idx);
                          setProgramForm({ ...programForm, exercises: newExercises.length ? newExercises : [{ name: "", sets: 4, reps: "8-10", weight: "", rest: "90s", notes: "" }] });
                        }}
                        data-testid={`button-remove-exercise-${idx}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input 
                        type="number" 
                        value={ex.sets} 
                        onChange={(e) => {
                          const newExercises = [...programForm.exercises];
                          newExercises[idx] = { ...ex, sets: parseInt(e.target.value) || 0 };
                          setProgramForm({ ...programForm, exercises: newExercises });
                        }} 
                        placeholder="Sets" 
                        className="h-9" 
                        data-testid={`input-exercise-sets-${idx}`}
                      />
                      <Input 
                        value={ex.reps} 
                        onChange={(e) => {
                          const newExercises = [...programForm.exercises];
                          newExercises[idx] = { ...ex, reps: e.target.value };
                          setProgramForm({ ...programForm, exercises: newExercises });
                        }} 
                        placeholder="Reps" 
                        className="h-9" 
                        data-testid={`input-exercise-reps-${idx}`}
                      />
                      <Input 
                        value={ex.weight} 
                        onChange={(e) => {
                          const newExercises = [...programForm.exercises];
                          newExercises[idx] = { ...ex, weight: e.target.value };
                          setProgramForm({ ...programForm, exercises: newExercises });
                        }} 
                        placeholder="Weight" 
                        className="h-9" 
                        data-testid={`input-exercise-weight-${idx}`}
                      />
                      <Input 
                        value={ex.rest} 
                        onChange={(e) => {
                          const newExercises = [...programForm.exercises];
                          newExercises[idx] = { ...ex, rest: e.target.value };
                          setProgramForm({ ...programForm, exercises: newExercises });
                        }} 
                        placeholder="Rest" 
                        className="h-9" 
                        data-testid={`input-exercise-rest-${idx}`}
                      />
                    </div>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setProgramForm({ ...programForm, exercises: [...programForm.exercises, { name: "", sets: 4, reps: "8-10", weight: "", rest: "90s", notes: "" }] })}
                  data-testid="button-add-exercise"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Exercise
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
            <Button 
              type="submit" 
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base" 
              disabled={isPending} 
              data-testid="button-submit-program"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Program" : "Create Program"}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
            </SheetClose>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
