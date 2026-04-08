import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Weight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { WorkoutProgram } from "@shared/schema";

const DAYS_OF_WEEK = [
  "All",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Get current day of the week (computed once at module load)
const CURRENT_DAY = (() => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
})();

interface TransformedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
  form: string;
  alternatives: string[];
}

interface TransformedWorkout {
  day: string;
  name: string;
  difficulty: string;
  duration: string;
  intensity: number;
  exercises: TransformedExercise[];
  completed: boolean;
  date: string;
  personalRecord: string | null;
}

export default function MemberWorkouts() {
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState(CURRENT_DAY);
  const { member, isMemberAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isMemberAuthenticated) {
      navigate("/member/login");
    }
  }, [authLoading, isMemberAuthenticated, navigate]);

  // Fetch workout assignments for this member
  const {
    data: workoutAssignments = [],
    isLoading: assignmentsLoading,
    isError: assignmentsError,
  } = useQuery<
    {
      id: string;
      programId: string;
      memberId: string;
      assignedAt: string;
    }[]
  >({
    queryKey: ["/api/members", member?.id, "workout-assignments"],
    queryFn: async () => {
      if (!member?.id) return [];
      const res = await fetch(`/api/members/${member.id}/workout-assignments`);
      if (!res.ok) throw new Error("Failed to fetch workout assignments");
      return res.json();
    },
    enabled: !!member?.id,
  });

  // Fetch all workout programs to match with assignments
  const {
    data: allWorkoutPrograms = [],
    isLoading: programsLoading,
    isError: programsError,
  } = useQuery<WorkoutProgram[]>({
    queryKey: ["/api/workout-programs"],
    queryFn: async () => {
      const res = await fetch("/api/workout-programs");
      if (!res.ok) throw new Error("Failed to fetch workout programs");
      return res.json();
    },
    enabled: !!member?.id,
  });

  // Fetch custom workouts created specifically for this member
  const {
    data: customWorkouts = [],
    isLoading: customLoading,
    isError: customError,
  } = useQuery<WorkoutProgram[]>({
    queryKey: ["/api/workout-programs", "custom", member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      const res = await fetch(`/api/workout-programs?memberId=${member.id}`);
      if (!res.ok) throw new Error("Failed to fetch custom workouts");
      return res.json();
    },
    enabled: !!member?.id,
  });

  // Combine assigned workouts with custom workouts
  const assignedWorkouts = (allWorkoutPrograms as WorkoutProgram[]).filter(
    (program: WorkoutProgram) =>
      workoutAssignments.some(
        (assignment) => assignment.programId === program.id,
      ),
  );

  // Merge assigned and custom workouts, avoiding duplicates
  const memberWorkouts = [
    ...assignedWorkouts,
    ...(customWorkouts as WorkoutProgram[]).filter(
      (w: WorkoutProgram) => !assignedWorkouts.some((aw) => aw.id === w.id),
    ),
  ];

  const isLoading = assignmentsLoading || programsLoading || customLoading;
  const hasError = assignmentsError || programsError || customError;

  const workouts: TransformedWorkout[] = memberWorkouts.map((program, idx) => {
    const exercises = (program.exercises || []).map(
      (ex: any, exIdx: number) => ({
        id: `${program.id}-ex-${exIdx}`,
        name: ex.name || "Exercise",
        sets: ex.sets || 3,
        reps: ex.reps || "8-12",
        weight: ex.weight || "N/A",
        rest: ex.rest || "60 sec",
        notes: ex.notes || "",
        form: ex.form || "Maintain proper form throughout the movement",
        alternatives: ex.alternatives || [],
      }),
    );

    return {
      day: program.day,
      name: program.name,
      difficulty: program.difficulty || "Intermediate",
      duration: `${program.duration} mins`,
      intensity: program.intensity || 5,
      exercises,
      completed: false,
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      personalRecord: null,
    };
  });

  // Filter workouts based on search query and selected day
  const filteredWorkouts = useMemo(() => {
    return workouts.filter((workout) => {
      // Filter by day
      const matchesDay = selectedDay === "All" || workout.day === selectedDay;

      // Filter by search query (search in workout name and exercise names)
      const matchesSearch =
        searchQuery === "" ||
        workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workout.exercises.some((ex) =>
          ex.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      return matchesDay && matchesSearch;
    });
  }, [workouts, selectedDay, searchQuery]);

  const toggleExercise = (id: string) => {
    setExpandedExercise(expandedExercise === id ? null : id);
  };

  if (isLoading || authLoading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold font-heading text-foreground">
              MY WORKOUTS
            </h1>
            <p className="text-muted-foreground">
              Your personalized weekly training plan with detailed exercise
              guidance.
            </p>
          </div>
          <Button className="gap-2">Download PDF</Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search workouts or exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Day Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedDay === day
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                }`}
              >
                {day === "All" ? "All" : day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {(searchQuery || selectedDay !== CURRENT_DAY) &&
          workouts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredWorkouts.length} of {workouts.length} workouts
              {selectedDay !== CURRENT_DAY && selectedDay !== "All" && (
                <span className="ml-2">
                  • Filtering by:{" "}
                  <span className="font-medium text-foreground">
                    {selectedDay}
                  </span>
                </span>
              )}
              {selectedDay === "All" && (
                <span className="ml-2">• Showing all workouts</span>
              )}
            </p>
          )}

        {/* Weekly Plan */}
        <div className="space-y-4">
          {hasError ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 text-destructive opacity-50" />
                <p className="text-sm font-medium text-destructive">
                  Failed to load workouts
                </p>
                <p className="text-xs mt-1">
                  There was an error connecting to the server. Please try again
                  later.
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="mt-4"
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : workouts.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Dumbbell className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">No workouts available</p>
                <p className="text-xs mt-1">
                  You don't have any workouts assigned yet. Contact your trainer
                  to get started!
                </p>
              </CardContent>
            </Card>
          ) : filteredWorkouts.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <Dumbbell className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm italic">
                  No workouts match your search criteria.
                </p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDay(CURRENT_DAY);
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredWorkouts.map((workout, idx) => (
              <Card
                key={idx}
                className="bg-card/50 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 text-xs font-semibold"
                      >
                        {workout.day}
                      </Badge>
                      <h3 className="text-xl font-bold text-foreground">
                        {workout.name}
                      </h3>
                      {workout.completed && (
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30 border text-xs">
                          ✓ Completed
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-background text-xs"
                      >
                        {workout.difficulty}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          workout.intensity <= 3
                            ? "bg-blue-500/20 text-blue-500 border-blue-500/30"
                            : workout.intensity <= 6
                              ? "bg-orange-500/20 text-orange-500 border-orange-500/30"
                              : "bg-red-500/20 text-red-500 border-red-500/30"
                        } border`}
                      >
                        Level {workout.intensity}/10
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Meta Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Duration
                          </p>
                          <p className="font-semibold">{workout.duration}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Exercises
                          </p>
                          <p className="font-semibold">
                            {workout.exercises.length}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Intensity
                          </p>
                          <p className="font-semibold">
                            {workout.intensity}/10
                          </p>
                        </div>
                      </div>
                      {workout.personalRecord && (
                        <div className="flex items-center gap-2 text-sm text-green-500">
                          <RotateCcw className="h-4 w-4" />
                          <div>
                            <p className="text-muted-foreground text-xs">PR</p>
                            <p className="font-semibold text-xs">
                              {workout.personalRecord}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Exercises List */}
                    <div className="space-y-2">
                      {workout.exercises.map((ex) => (
                        <div key={ex.id}>
                          <div className="w-full p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors text-left flex flex-col gap-2"
                          >
                            <div className=" w-full flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground">
                                    {ex.name}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {ex.sets} × {ex.reps}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {ex.weight && ex.weight !== "N/A" && (
                                    <span>
                                      Weight:{" "}
                                      <span className="font-medium text-foreground">
                                        {ex.weight}
                                      </span>
                                    </span>
                                  )}
                                  <span>
                                    Rest:{" "}
                                    <span className="font-medium text-foreground">
                                      {ex.rest}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <Button 
                                className="border border-transparent bg-transparent cursor-pointer"  
                                onClick={() => toggleExercise(ex.id)}>
                              {expandedExercise === ex.id ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}</Button>
                            </div>
                            {expandedExercise === ex.id && (
                              <div className="p-3 rounded-lg bg-muted/20 border border-border border-t-0 space-y-3 animate-in slide-in-from-top-2">
                                {ex.notes && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                      Notes
                                    </p>
                                    <p className="text-sm text-primary">
                                      {ex.notes}
                                    </p>
                                  </div>
                                )}

                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Form & Technique
                                  </p>
                                  <p className="text-sm text-foreground">
                                    {ex.form}
                                  </p>
                                </div>

                                {ex.alternatives.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                                      Alternatives
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {ex.alternatives.map((alt, j) => (
                                        <Badge
                                          key={j}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {alt}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      className="w-full mt-2"
                      variant={workout.completed ? "outline" : "default"}
                    >
                      {workout.completed ? "View Details" : "Start Workout"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MemberLayout>
  );
}
