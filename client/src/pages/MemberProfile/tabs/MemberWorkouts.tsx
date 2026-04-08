import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, ChevronDown, ChevronRight, Clock, Target, Zap, Wrench, Plus, Pencil, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { MemberProfileProps } from "../types";
import { WorkoutProgram, WorkoutProgramAssignment } from "@shared/schema";
import { CreateProgramSheet } from "@/components/CreateProgramSheet";
import { GenieProgramSheet } from "./GenieProgramSheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function MemberWorkouts({ memberId }: MemberProfileProps) {
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [openCreateCustom, setOpenCreateCustom] = useState(false);
  const [openGenieProgram, setOpenGenieProgram] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: workoutAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/members", memberId, "workout-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/workout-assignments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  const { data: allWorkouts = [], isLoading: allWorkoutsLoading } = useQuery({
    queryKey: ["/api/workout-programs"],
    enabled: !!memberId,
  });

  // Fetch custom workouts specifically created for this member
  const { data: customWorkouts = [], isLoading: customLoading } = useQuery({
    queryKey: ["/api/workout-programs", "custom", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/workout-programs?memberId=${memberId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  const assignedWorkouts = (allWorkouts as WorkoutProgram[]).filter((w: WorkoutProgram) =>
    (workoutAssignments as WorkoutProgramAssignment[]).some((a: WorkoutProgramAssignment) => a.programId === w.id)
  );

  // Combine assigned workouts with custom workouts for this member
  const memberWorkouts = [
    ...assignedWorkouts,
    ...(customWorkouts as WorkoutProgram[]).filter(
      (w: WorkoutProgram) => !assignedWorkouts.some(aw => aw.id === w.id)
    )
  ];

  const toggleWorkoutExpansion = (workoutId: string) => {
    const newExpanded = new Set(expandedWorkouts);
    if (newExpanded.has(workoutId)) {
      newExpanded.delete(workoutId);
    } else {
      newExpanded.add(workoutId);
    }
    setExpandedWorkouts(newExpanded);
  };

  // Delete mutation for custom workouts
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (programId: string) => {
      await apiRequest("DELETE", `/api/workout-programs/${programId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Workout program deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditWorkout = (workout: WorkoutProgram) => {
    setEditingProgram(workout);
    setOpenCreateCustom(true);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    if (confirm("Are you sure you want to delete this workout program?")) {
      deleteWorkoutMutation.mutate(workoutId);
    }
  };

  const handleSheetClose = (open: boolean) => {
    setOpenCreateCustom(open);
    if (!open) {
      setEditingProgram(null);
    }
  };

  // Check if any of the queries are still loading
  const isLoading = assignmentsLoading || allWorkoutsLoading || customLoading;

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Assigned Workouts</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              onClick={() => setOpenGenieProgram(true)}
            >
              <Sparkles className="h-4 w-4" /> Genie Programmes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => setOpenCreateCustom(true)}
            >
              <Plus className="h-4 w-4" /> Custom Workout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-12 w-12 mb-4 animate-spin opacity-50" />
            <p className="text-sm italic">Loading workouts...</p>
          </div>
        ) : (memberWorkouts as WorkoutProgram[]).length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Dumbbell className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm italic">No workouts assigned to this member.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {memberWorkouts.map((workout) => {
              const isExpanded = expandedWorkouts.has(workout.id);
              const exercises = workout.exercises as Array<{
                name: string;
                sets: number;
                reps: string;
                weight: string;
                rest: string;
                notes?: string;
              }>;
              const equipment = workout.equipment as string[];

              return (
                <Card key={workout.id} className="bg-background/50 border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleWorkoutExpansion(workout.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">{workout.name}</h3>
                          <p className="text-sm text-muted-foreground">{workout.day}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-background">{workout.difficulty}</Badge>
                        <Badge className="bg-accent/20 text-accent border-accent/30 border">
                          Level {workout.intensity}/10
                        </Badge>
                        {/* Edit and Delete buttons for custom workouts */}
                        {(workout as any).customWorkoutPlan && (
                          <div className="flex items-center gap-1 ml-2">
                             <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 h-8">
                              <Sparkles className="h-4 w-4 text-green-500 mr-1" />
                              AI Generated
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              onClick={() => handleEditWorkout(workout)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteWorkout(workout.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Duration</p>
                          <p className="font-semibold">{workout.duration} min</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Goal</p>
                          <p className="font-semibold">{workout.goal}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Intensity</p>
                          <p className="font-semibold">{workout.intensity}/10</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Equipment</p>
                          <p className="font-semibold">{equipment.length} items</p>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border pt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Equipment Section */}
                        {equipment.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              Required Equipment
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {equipment.map((item, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exercises Section */}
                        <div>
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Dumbbell className="h-4 w-4" />
                            Exercise Details
                          </h4>
                          <div className="space-y-3">
                            {exercises.map((exercise, index) => (
                              <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="flex items-start justify-start gap-2 mb-2">
                                  <h5 className="font-semibold text-foreground">{exercise.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {exercise.sets} × {exercise.reps}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground text-xs">Weight:</span>
                                    <span className="font-medium ml-1">{exercise.weight}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs">Rest:</span>
                                    <span className="font-medium ml-1">{exercise.rest}</span>
                                  </div>
                                  {exercise.notes && (
                                    <div className="md:col-span-1">
                                      <span className="text-muted-foreground text-xs">Notes:</span>
                                      <span className="font-medium ml-1 text-primary">{exercise.notes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>

      <CreateProgramSheet
        open={openCreateCustom}
        onOpenChange={handleSheetClose}
        editingProgram={editingProgram}
        preselectedMemberId={editingProgram ? undefined : memberId}
        preselectCustomWorkout={editingProgram ? undefined : true}
      />

      <GenieProgramSheet
        open={openGenieProgram}
        onOpenChange={setOpenGenieProgram}
        memberId={memberId}
      />
    </>
  );
}
