import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Plus, Edit2, Trash2, Loader2, Dumbbell, HeartPulse, UserCog } from "lucide-react";
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

interface Option {
  id: string;
  name: string;
  isActive: boolean;
}

export default function AdminOptions() {
  const [activeTab, setActiveTab] = useState("interests");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isInterest = activeTab === "interests";
  const isHealth = activeTab === "health";
  const isTraining = activeTab === "training";
  const endpoint = isInterest ? "/api/options/interests" : isHealth ? "/api/options/health" : "/api/options/training-types";

  const { data: options = [], isLoading } = useQuery<Option[]>({
    queryKey: [endpoint],
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", endpoint, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : "Training Type"} option created` });
      setIsDialogOpen(false);
      setNewName("");
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
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : "Training Type"} option updated` });
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
      toast({ title: `${isInterest ? "Interest" : isHealth ? "Health" : "Training Type"} option deleted` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (editingOption) {
      updateMutation.mutate({ id: editingOption.id, name: newName.trim() });
    } else {
      createMutation.mutate(newName.trim());
    }
  };

  const handleEdit = (option: Option) => {
    setEditingOption(option);
    setNewName(option.name);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this option?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">
            OPTIONS MANAGEMENT
          </h1>
          <p className="text-muted-foreground">
            Manage interest and health options for leads and members.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="interests" className="gap-2">
              <Dumbbell className="h-4 w-4" /> Interests
            </TabsTrigger>
            <TabsTrigger value="health" className="gap-2">
              <HeartPulse className="h-4 w-4" /> Health
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-2">
              <UserCog className="h-4 w-4" /> Training
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
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingOption(null);
            setNewName("");
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
                  placeholder={`Enter ${isInterest ? "interest" : isHealth ? "health" : "training type"} name`}
                />
              </div>
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
              <CardTitle className="text-lg">{option.name}</CardTitle>
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
