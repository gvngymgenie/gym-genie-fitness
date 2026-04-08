import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Utensils, ChevronRight, Plus, Settings, Clock, Trophy, Trash2, ListPlus, Loader2, User, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreateProgramSheet } from "@/components/CreateProgramSheet";
import { CreateDietSheet } from "@/components/CreateDietSheet";
import type { Member, WorkoutProgram, DietPlan, WorkoutProgramAssignment, DietPlanAssignment } from "@shared/schema";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes?: string;
};

export default function Workouts() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openAssign, setOpenAssign] = useState(false);
  const [editingProgram, setEditingProgram] = useState<WorkoutProgram | null>(null);
  const [openCreateDiet, setOpenCreateDiet] = useState(false);
  const [openEditMeal, setOpenEditMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<DietPlan | null>(null);
  const [openAssignDiet, setOpenAssignDiet] = useState(false);
  const [assigningDiet, setAssigningDiet] = useState<DietPlan | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [collectionFilter, setCollectionFilter] = useState<string>("All");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedDietCards, setExpandedDietCards] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleCardExpand = (programId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const toggleDietCardExpand = (planId: string) => {
    setExpandedDietCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  interface WorkoutCollection {
    id: string;
    name: string;
  }

  const { data: workoutCollections = [] } = useQuery<WorkoutCollection[]>({
    queryKey: ["/api/options/workout-collections"],
  });

  const [programForm, setProgramForm] = useState({
    name: "",
    day: "Monday",
    difficulty: "Intermediate",
    duration: "60",
    intensity: 5,
    goal: "Hypertrophy",
    exercises: [{ name: "", sets: 4, reps: "8-10", weight: "", rest: "90s", notes: "" }] as Exercise[],
    equipment: [] as string[],
    equipmentInput: "",
  });

  const [dietForm, setDietForm] = useState({
    meal: "",
    foods: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const { data: members = [], isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: workoutPrograms = [], isLoading: loadingPrograms } = useQuery<WorkoutProgram[]>({
    queryKey: ["/api/workout-programs"],
  });

  const { data: dietPlans = [], isLoading: loadingDiets } = useQuery<DietPlan[]>({
    queryKey: ["/api/diet-plans"],
  });

  interface WorkoutCollectionMember {
    workoutId: string;
    collectionId: string;
  }

  const { data: workoutCollectionMembers = [] } = useQuery<WorkoutCollectionMember[]>({
    queryKey: ["/api/options/workout-collection-members"],
  });

  const activeMembers = useMemo(() => members.filter(m => m.status === "Active"), [members]);

  // Filter out custom workout plans - only show general programs
  const memberPrograms = workoutPrograms.filter(p => !(p as any).customWorkoutPlan);
  const memberDiets = dietPlans.filter(p => !p.customDiet);

  const filteredPrograms = useMemo(() => {
    let filtered = memberPrograms;
    if (difficultyFilter !== "All") {
      filtered = filtered.filter(p => p.difficulty === difficultyFilter);
    }
    if (collectionFilter !== "All") {
      filtered = filtered.filter(p => {
        const programId = p.id;
        return workoutCollectionMembers.some(m => m.workoutId === programId && m.collectionId === collectionFilter);
      });
    }
    return filtered;
  }, [memberPrograms, difficultyFilter, collectionFilter, workoutCollectionMembers]);

  const totalMacros = useMemo(() => memberDiets.reduce((acc, meal) => ({
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat
  }), { protein: 0, carbs: 0, fat: 0 }), [memberDiets]);

  const totalCalories = useMemo(() => memberDiets.reduce((acc, meal) => acc + meal.calories, 0), [memberDiets]);

  const createProgramMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/workout-programs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Workout program created" });
      setOpenCreate(false);
      resetProgramForm();
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
      setOpenEdit(false);
      setEditingProgram(null);
      resetProgramForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProgramMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/workout-programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Workout program deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: programAssignments = [], refetch: refetchAssignments } = useQuery<WorkoutProgramAssignment[]>({
    queryKey: ["/api/workout-programs", editingProgram?.id, "assignments"],
    queryFn: async () => {
      if (!editingProgram?.id) return [];
      const res = await apiRequest("GET", `/api/workout-programs/${editingProgram.id}/assignments`);
      return res.json();
    },
    enabled: !!editingProgram?.id && openAssign,
  });

  const addAssignmentMutation = useMutation({
    mutationFn: async ({ programId, memberId }: { programId: string; memberId: string }) => {
      const res = await apiRequest("POST", `/api/workout-programs/${programId}/assignments`, { memberId });
      return res.json();
    },
    onSuccess: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Member assigned to program" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: async ({ programId, memberId }: { programId: string; memberId: string }) => {
      await apiRequest("DELETE", `/api/workout-programs/${programId}/assignments/${memberId}`);
    },
    onSuccess: () => {
      refetchAssignments();
      queryClient.invalidateQueries({ queryKey: ["/api/workout-programs"] });
      toast({ title: "Member removed from program" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Diet Plan Assignments
  const { data: dietAssignments = [], refetch: refetchDietAssignments } = useQuery<DietPlanAssignment[]>({
    queryKey: ["/api/diet-plans", assigningDiet?.id, "assignments"],
    queryFn: async () => {
      if (!assigningDiet?.id) return [];
      const res = await apiRequest("GET", `/api/diet-plans/${assigningDiet.id}/assignments`);
      return res.json();
    },
    enabled: !!assigningDiet?.id && openAssignDiet,
  });

  const addDietAssignmentMutation = useMutation({
    mutationFn: async ({ dietPlanId, memberId }: { dietPlanId: string; memberId: string }) => {
      const res = await apiRequest("POST", `/api/diet-plans/${dietPlanId}/assignments`, { memberId });
      return res.json();
    },
    onSuccess: () => {
      refetchDietAssignments();
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Member assigned to diet plan" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeDietAssignmentMutation = useMutation({
    mutationFn: async ({ dietPlanId, memberId }: { dietPlanId: string; memberId: string }) => {
      await apiRequest("DELETE", `/api/diet-plans/${dietPlanId}/assignments/${memberId}`);
    },
    onSuccess: () => {
      refetchDietAssignments();
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Member removed from diet plan" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createDietMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/diet-plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Diet plan created" });
      setOpenCreateDiet(false);
      resetDietForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDietMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/diet-plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Diet plan updated" });
      setOpenEditMeal(false);
      setEditingMeal(null);
      resetDietForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteDietMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/diet-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Diet plan deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetProgramForm = () => {
    setProgramForm({
      name: "",
      day: "Monday",
      difficulty: "Intermediate",
      duration: "60",
      intensity: 5,
      goal: "Hypertrophy",
      exercises: [{ name: "", sets: 4, reps: "8-10", weight: "", rest: "90s", notes: "" }],
      equipment: [],
      equipmentInput: "",
    });
  };

  const resetDietForm = () => {
    setDietForm({ meal: "", foods: "", calories: "", protein: "", carbs: "", fat: "" });
  };

  const handleEditProgram = (program: WorkoutProgram) => {
    setEditingProgram(program);
    setProgramForm({
      name: program.name,
      day: program.day,
      difficulty: program.difficulty,
      duration: String(program.duration),
      intensity: program.intensity,
      goal: program.goal || "Hypertrophy",
      exercises: program.exercises as Exercise[],
      equipment: program.equipment as string[],
      equipmentInput: (program.equipment as string[]).join(", "),
    });
    setOpenEdit(true);
  };

  const handleAssignProgram = (program: WorkoutProgram) => {
    setEditingProgram(program);
    setOpenAssign(true);
  };

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
      memberId: null,
    };

    if (editingProgram) {
      updateProgramMutation.mutate({ id: editingProgram.id, data });
    } else {
      createProgramMutation.mutate(data);
    }
  };

  const handleDietSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foodsArray = dietForm.foods.split(",").map(f => f.trim()).filter(Boolean);
    const data = {
      meal: dietForm.meal,
      foods: foodsArray,
      calories: parseInt(dietForm.calories) || 0,
      protein: parseInt(dietForm.protein) || 0,
      carbs: parseInt(dietForm.carbs) || 0,
      fat: parseInt(dietForm.fat) || 0,
      memberId: null,
    };

    if (editingMeal) {
      updateDietMutation.mutate({ id: editingMeal.id, data });
    } else {
      createDietMutation.mutate(data);
    }
  };

  const handleEditMeal = (plan: DietPlan) => {
    setEditingMeal(plan);
    setDietForm({
      meal: plan.meal,
      foods: (plan.foods as string[]).join(", "),
      calories: plan.calories.toString(),
      protein: plan.protein.toString(),
      carbs: plan.carbs.toString(),
      fat: plan.fat.toString(),
    });
    setOpenEditMeal(true);
  };

  const isLoading = loadingMembers || loadingPrograms || loadingDiets;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight" data-testid="heading-workouts">Workouts & Diet</h1>
          <p className="text-muted-foreground">Manage training programs and nutrition for gym members.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="programs" className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg mb-6">
              <TabsTrigger value="programs" className="px-6 data-[state=active]:bg-background">Training Programs</TabsTrigger>
              <TabsTrigger value="diet" className="px-6 data-[state=active]:bg-background">Diet Plans</TabsTrigger>
            </TabsList>

            <TabsContent value="programs" className="space-y-6 animate-in fade-in">
<div className="flex justify-between items-center align-center w-full">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground py-2">Difficulty:</span>
                {["All", "Beginner", "Intermediate", "Advanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficultyFilter(level)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      difficultyFilter === level
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`filter-difficulty-${level.toLowerCase()}`}
                  >
                    {level}
                  </button>
                ))}
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-muted-foreground py-2">Collection:</span>
                  <Select value={collectionFilter} onValueChange={setCollectionFilter}>
                    <SelectTrigger className="w-48 h-10 bg-background border-border" data-testid="filter-collection">
                      <SelectValue placeholder="All Collections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Collections</SelectItem>
                      {workoutCollections.map((col) => (
                        <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* <Button   className="gap-2 border-accent/30 text-accent hover:bg-accent/10" onClick={() => setOpenCreateDiet(true)} data-testid="button-create-diet"> */}
                <Button variant="outline" className="gap-2 text-primary hover:bg-primary/10 border-primary/30" onClick={() => setOpenCreate(true)} data-testid="button-create-program">
                  <ListPlus className="h-4 w-4" /> Create Program
                </Button>
              </div>
              
              <div className="space-y-4">
                  {filteredPrograms.length === 0 ? (
                    <Card className="bg-card/50 backdrop-blur-sm p-8 text-center">
                      <p className="text-muted-foreground">
                        {difficultyFilter === "All" && collectionFilter === "All" 
                          ? "No workout programs yet. Create one to get started." 
                          : difficultyFilter !== "All" && collectionFilter !== "All"
                            ? `No ${difficultyFilter} programs found in this collection.`
                            : collectionFilter !== "All"
                              ? "No workout programs in this collection."
                              : `No ${difficultyFilter} programs found.`}
                      </p>
                    </Card>
                  ) : (
                    filteredPrograms.map((program) => {
                      const exercises = program.exercises as Exercise[];
                      const equipment = program.equipment as string[];
                      const isExpanded = expandedCards.has(program.id);
                      return (
                        <Card key={program.id} className="bg-card/50 backdrop-blur-sm border-t-4 border-t-primary hover:shadow-lg transition-all" data-testid={`card-program-${program.id}`}>
                          <CardHeader 
                            className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleCardExpand(program.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Dumbbell className="h-5 w-5 text-primary" />
                                <div>
                                  <h3 className="font-bold text-lg text-foreground tracking-tight uppercase">{program.name}</h3>
                                  <p className="text-sm text-muted-foreground">{program.day}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-background">{program.difficulty}</Badge>
                                <Badge className="bg-accent/20 text-accent border-accent/30 border">
                                  Level {program.intensity}/10
                                </Badge>
                                {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </CardHeader>
                          {isExpanded && (
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-border">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-semibold text-foreground">{program.duration}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Goal:</span>
                                <span className="font-semibold text-foreground tracking-tight uppercase">{program.goal}</span>
                              </div>
                            </div>

                            {equipment.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {equipment.map((eq, i) => (
                                  <Badge key={i} variant="outline" className="bg-background text-xs">{eq}</Badge>
                                ))}
                              </div>
                            )}

                            <div className="space-y-3">
                              {exercises.map((ex, i) => (
                                <div key={i} className="p-3 rounded-lg bg-background border border-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-foreground uppercase text-sm tracking-tight">{ex.name}</h4>
                                    <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                                      {ex.sets}x{ex.reps}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground uppercase font-bold tracking-tighter">
                                    <div><span className="text-foreground">{ex.weight}</span> weight</div>
                                    <div>Rest: <span className="text-foreground">{ex.rest}</span></div>
                                    {ex.notes && <div className="col-span-3 text-primary lowercase font-normal italic">{ex.notes}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button className="flex-1 gap-2 h-10 uppercase font-bold text-xs tracking-wider" size="sm" onClick={(e) => { e.stopPropagation(); handleEditProgram(program); }} data-testid={`button-edit-program-${program.id}`}>
                                <Settings className="h-4 w-4" /> Edit Program
                              </Button>
                              <Button variant="outline" className="flex-1 gap-2 h-10 uppercase font-bold text-xs tracking-wider border-primary/50 text-primary" size="sm" onClick={(e) => { e.stopPropagation(); handleAssignProgram(program); }} data-testid={`button-assign-program-${program.id}`}>
                                <User className="h-4 w-4" /> Assign to Member
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteProgramMutation.mutate(program.id); }} data-testid={`button-delete-program-${program.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                          )}
                        </Card>
                      );
                    })
                  )}
              </div>
            </TabsContent>

            <TabsContent value="diet" className="space-y-6 animate-in fade-in">
              <div className="flex justify-end">
                <Button variant="outline" className="gap-2 border-accent/30 text-accent hover:bg-accent/10" onClick={() => setOpenCreateDiet(true)} data-testid="button-create-diet">
                  <ListPlus className="h-4 w-4" /> Create Diet Plan
                </Button>
              </div>
              <div className="space-y-4">
                  {memberDiets.length === 0 ? (
                    <Card className="bg-card/50 backdrop-blur-sm p-8 text-center">
                      <p className="text-muted-foreground">No diet plans yet. Create one to get started.</p>
                    </Card>
                  ) : (
                    memberDiets.map((plan) => {
                      const foods = plan.foods as string[];
                      const isExpanded = expandedDietCards.has(plan.id);
                      return (
                        <Card key={plan.id} className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all border-l-4 border-l-accent/50" data-testid={`card-diet-${plan.id}`}>
                          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleDietCardExpand(plan.id)}>
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-lg flex items-center gap-2 text-foreground tracking-tight uppercase">
                                <Utensils className="h-5 w-5 text-accent" />
                                {plan.meal}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-accent bg-accent/10 px-3 py-1 rounded-full font-bold">
                                  {plan.calories} kcal
                                </span>
                                {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </CardHeader>
                          {isExpanded && (
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {foods.map((food, i) => (
                                <Badge key={i} variant="outline" className="bg-background border-accent/20 text-accent/80">{food}</Badge>
                              ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-border text-center">
                              <div>
                                <p className="text-2xl font-bold text-blue-500">{plan.protein}g</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Protein</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-green-500">{plan.carbs}g</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Carbs</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-orange-500">{plan.fat}g</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Fat</p>
                              </div>
                            </div>
                            {plan.notes && (
                              <div className="text-sm text-muted-foreground italic pt-3">
                              <strong> Notes:</strong>  {plan.notes}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 gap-2 h-10 border-accent/30 text-accent hover:bg-accent/10 uppercase font-bold tracking-widest text-xs" size="sm" onClick={(e) => { e.stopPropagation(); handleEditMeal(plan); }} data-testid={`button-edit-diet-${plan.id}`}>
                                <Settings className="h-4 w-4" /> Edit Meal
                              </Button>
                              <Button variant="outline" className="flex-1 gap-2 h-10 border-primary/50 text-primary hover:bg-primary/10 uppercase font-bold tracking-widest text-xs" size="sm" onClick={(e) => { e.stopPropagation(); setAssigningDiet(plan); setOpenAssignDiet(true); }} data-testid={`button-assign-diet-${plan.id}`}>
                                <User className="h-4 w-4" /> Assign
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteDietMutation.mutate(plan.id); }} data-testid={`button-delete-diet-${plan.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                          )}
                        </Card>
                      );
                    })
                  )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <CreateProgramSheet 
          open={openCreate || openEdit} 
          onOpenChange={(val) => { 
            setOpenCreate(val); 
            setOpenEdit(val); 
            if (!val) { 
              setEditingProgram(null); 
              resetProgramForm(); 
            } 
          }}
          editingProgram={editingProgram}
        />

        <Sheet open={openAssign} onOpenChange={(val) => { setOpenAssign(val); if (!val) setEditingProgram(null); }}>
          <SheetContent className="sm:max-w-md w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                Assign Program
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6">
              <p className="text-muted-foreground">Assign "{editingProgram?.name}" to members:</p>
              
              {programAssignments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currently Assigned ({programAssignments.length})</Label>
                  <div className="space-y-2">
                    {programAssignments.map((assignment) => {
                      const assignedMember = activeMembers.find(m => m.id === assignment.memberId);
                      return assignedMember ? (
                        <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                              {assignedMember.avatar ? (
                                <img src={assignedMember.avatar} className="h-full w-full object-cover" alt={assignedMember.firstName} />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-bold">{assignedMember.firstName?.charAt(0) || "?"}</div>
                              )}
                            </div>
                            <span className="font-medium">{assignedMember.firstName} {assignedMember.lastName || ""}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (editingProgram) {
                                removeAssignmentMutation.mutate({ programId: editingProgram.id, memberId: assignment.memberId });
                              }
                            }}
                            disabled={removeAssignmentMutation.isPending}
                            data-testid={`button-unassign-member-${assignment.memberId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Add Member
                </Label>
                <Select onValueChange={(memberId) => {
                  if (editingProgram) {
                    addAssignmentMutation.mutate({ programId: editingProgram.id, memberId });
                  }
                }}>
                  <SelectTrigger className="bg-background border-border h-11" data-testid="select-assign-member">
                    <SelectValue placeholder="Select Member to Add" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.filter(m => !programAssignments.some(a => a.memberId === m.id)).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Done</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={openAssignDiet} onOpenChange={(val) => { setOpenAssignDiet(val); if (!val) setAssigningDiet(null); }}>
          <SheetContent className="sm:max-w-md w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-accent uppercase tracking-tight">
                Assign Diet Plan
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-6">
              <p className="text-muted-foreground">Assign "{assigningDiet?.meal}" to members:</p>
              
              {dietAssignments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currently Assigned ({dietAssignments.length})</Label>
                  <div className="space-y-2">
                    {dietAssignments.map((assignment) => {
                      const assignedMember = activeMembers.find(m => m.id === assignment.memberId);
                      return assignedMember ? (
                        <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                              {assignedMember.avatar ? (
                                <img src={assignedMember.avatar} className="h-full w-full object-cover" alt={assignedMember.firstName} />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs font-bold">{assignedMember.firstName?.charAt(0) || "?"}</div>
                              )}
                            </div>
                            <span className="font-medium">{assignedMember.firstName} {assignedMember.lastName || ""}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (assigningDiet) {
                                removeDietAssignmentMutation.mutate({ dietPlanId: assigningDiet.id, memberId: assignment.memberId });
                              }
                            }}
                            disabled={removeDietAssignmentMutation.isPending}
                            data-testid={`button-unassign-diet-member-${assignment.memberId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Add Member
                </Label>
                <Select onValueChange={(memberId) => {
                  if (assigningDiet) {
                    addDietAssignmentMutation.mutate({ dietPlanId: assigningDiet.id, memberId });
                  }
                }}>
                  <SelectTrigger className="bg-background border-border h-11" data-testid="select-assign-diet-member">
                    <SelectValue placeholder="Select Member to Add" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.filter(m => !dietAssignments.some(a => a.memberId === m.id)).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Done</Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>

        <CreateDietSheet 
          open={openCreateDiet || openEditMeal} 
          onOpenChange={(val) => { 
            setOpenCreateDiet(val); 
            setOpenEditMeal(val); 
            if (!val) { 
              setEditingMeal(null); 
            } 
          }}
          editingMeal={editingMeal}
        />
      </div>
    </Layout>
  );
}
