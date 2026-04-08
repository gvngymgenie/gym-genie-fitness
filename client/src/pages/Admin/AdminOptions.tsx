import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Dumbbell, HeartPulse, UserCog, Layers, X, GripHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Option {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

interface WorkoutProgram {
  id: string;
  name: string;
  day: string;
  difficulty: string;
  duration: number;
}

export default function AdminOptions() {
  const [activeTab, setActiveTab] = useState("interests");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<Option | null>(null);
  const [selectedWorkouts, setSelectedWorkouts] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isInterest = activeTab === "interests";
  const isHealth = activeTab === "health";
  const isTraining = activeTab === "training";
  const isCollection = activeTab === "collections";
  const endpoint = isInterest ? "/api/options/interests" : isHealth ? "/api/options/health" : isCollection ? "/api/options/workout-collections" : "/api/options/training-types";

  const { data: options = [], isLoading } = useQuery<Option[]>({
    queryKey: [endpoint],
  });

  const { data: collectionWorkouts = [], isLoading: isLoadingWorkouts } = useQuery<WorkoutProgram[]>({
    queryKey: [`/api/options/workout-collections/${selectedCollection?.id}/workouts`],
    enabled: !!selectedCollection,
  });

  const { data: availableWorkouts = [] } = useQuery<WorkoutProgram[]>({
    queryKey: ["/api/options/available-workouts"],
    enabled: isCollection && isWorkoutDialogOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : isCollection ? "Workout Collection" : "Training Type"} option created` });
      setIsDialogOpen(false);
      setNewName("");
      setNewDescription("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiRequest("PATCH", `${endpoint}/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : isCollection ? "Collection" : "Training Type"} updated` });
      setIsDialogOpen(false);
      setEditingOption(null);
      setNewName("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : isCollection ? "Collection" : "Training Type"} deleted` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addWorkoutToCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, workoutId }: { collectionId: string; workoutId: string }) => {
      const res = await apiRequest("POST", `/api/options/workout-collections/${collectionId}/workouts`, { workoutId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/options/workout-collections/${selectedCollection?.id}/workouts`] });
      queryClient.invalidateQueries({ queryKey: ["/api/options/available-workouts"] });
      toast({ title: "Workout added to collection" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeWorkoutFromCollectionMutation = useMutation({
    mutationFn: async ({ collectionId, workoutId }: { collectionId: string; workoutId: string }) => {
      await apiRequest("DELETE", `/api/options/workout-collections/${collectionId}/workouts/${workoutId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/options/workout-collections/${selectedCollection?.id}/workouts`] });
      queryClient.invalidateQueries({ queryKey: ["/api/options/available-workouts"] });
      toast({ title: "Workout removed from collection" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (editingOption) {
      updateMutation.mutate({ id: editingOption.id, name: newName.trim() });
    } else {
      const payload = isCollection 
        ? { name: newName.trim(), description: newDescription.trim() || undefined }
        : { name: newName.trim() };
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (option: Option) => {
    setEditingOption(option);
    setNewName(option.name);
    setNewDescription(option.description || "");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this option?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleManageWorkouts = (collection: Option) => {
    setSelectedCollection(collection);
    setSelectedWorkouts([]);
    setIsWorkoutDialogOpen(true);
  };

  const handleAddSelectedWorkouts = () => {
    if (!selectedCollection) return;
    selectedWorkouts.forEach(workoutId => {
      addWorkoutToCollectionMutation.mutate({ collectionId: selectedCollection.id, workoutId });
    });
    setSelectedWorkouts([]);
    setIsWorkoutDialogOpen(false);
  };

  const handleRemoveWorkout = (workoutId: string) => {
    if (!selectedCollection) return;
    removeWorkoutFromCollectionMutation.mutate({ collectionId: selectedCollection.id, workoutId });
  };

  const unassignedWorkouts = availableWorkouts.filter(
    w => !collectionWorkouts.some(cw => cw.id === w.id)
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">
            OPTIONS MANAGEMENT
          </h1>
          <p className="text-muted-foreground">
            Manage interest, health, training options and workout collections.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
            <TabsTrigger value="interests" className="gap-2">
              <Dumbbell className="h-4 w-4" /> Interests
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="h-4 w-4" /> Health
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <UserCog className="h-4 w-4" /> Training
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <Layers className="h-4 w-4" /> Collections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interests" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setEditingOption(null);
                  setNewName("");
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Interest
              </Button>
            </div>
            <OptionList
              options={options}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="health" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setEditingOption(null);
                  setNewName("");
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Health
              </Button>
            </div>
            <OptionList
              options={options}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="training" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setEditingOption(null);
                  setNewName("");
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Training Type
              </Button>
            </div>
            <OptionList
              options={options}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </TabsContent>

          <TabsContent value="collections" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setEditingOption(null);
                  setNewName("");
                  setNewDescription("");
                  setIsDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add Collection
              </Button>
            </div>
            <CollectionList
              options={options}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageWorkouts={handleManageWorkouts}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingOption(null);
            setNewName("");
            setNewDescription("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOption ? "Edit Option" : "Add New Option"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`Enter ${isInterest ? "interest" : isHealth ? "health" : isCollection ? "collection" : "training type"} name`}
                />
              </div>
              {isCollection && (
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Enter description (optional)"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingOption ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Manage Workouts - {selectedCollection?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">Workouts in Collection ({collectionWorkouts.length})</h4>
                {isLoadingWorkouts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : collectionWorkouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No workouts in this collection yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collectionWorkouts.map(workout => (
                      <div key={workout.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{workout.name}</p>
                          <p className="text-sm text-muted-foreground">{workout.day} • {workout.difficulty} • {workout.duration} min</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRemoveWorkout(workout.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-3">Add Workouts ({unassignedWorkouts.length} available)</h4>
                {unassignedWorkouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">All workouts are already in collections.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {unassignedWorkouts.map(workout => (
                      <div key={workout.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Checkbox
                          id={workout.id}
                          checked={selectedWorkouts.includes(workout.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedWorkouts([...selectedWorkouts, workout.id]);
                            } else {
                              setSelectedWorkouts(selectedWorkouts.filter(id => id !== workout.id));
                            }
                          }}
                        />
                        <label htmlFor={workout.id} className="flex-1 cursor-pointer">
                          <p className="font-medium">{workout.name}</p>
                          <p className="text-sm text-muted-foreground">{workout.day} • {workout.difficulty} • {workout.duration} min</p>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWorkoutDialogOpen(false)}>Close</Button>
              <Button 
                onClick={handleAddSelectedWorkouts} 
                disabled={selectedWorkouts.length === 0 || addWorkoutToCollectionMutation.isPending}
              >
                {addWorkoutToCollectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Selected ({selectedWorkouts.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </Layout>
  );
}

function OptionList({
  options,
  isLoading,
  onEdit,
  onDelete,
}: {
  options: Option[];
  isLoading: boolean;
  onEdit: (opt: Option) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No options found. Add one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <Card key={option.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{option.name}</CardTitle>
                {option.description && (
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                )}
              </div>
              <Badge variant={option.isActive ? "default" : "secondary"}>
                {option.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(option)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => onDelete(option.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CollectionList({
  options,
  isLoading,
  onEdit,
  onDelete,
  onManageWorkouts,
}: {
  options: Option[];
  isLoading: boolean;
  onEdit: (opt: Option) => void;
  onDelete: (id: string) => void;
  onManageWorkouts: (opt: Option) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No collections found. Add one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <Card key={option.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{option.name}</CardTitle>
                {option.description && (
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                )}
              </div>
              <Badge variant={option.isActive ? "default" : "secondary"}>
                {option.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(option)}>
                <Edit2 className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => onDelete(option.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
            <Button variant="secondary" size="sm" className="w-full gap-2" onClick={() => onManageWorkouts(option)}>
              <GripHorizontal className="h-4 w-4" /> Manage Workouts
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}