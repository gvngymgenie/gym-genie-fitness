import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Edit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProfilePicture } from "@/components/ProfilePicture";
import { cn } from "@/lib/utils";
import { MemberProfileCardProps } from "../types";

export function MemberProfileCard({ 
  memberId, 
  member,
  trainers
}: MemberProfileCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!member) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
      <CardContent className="pt-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="h-32 w-32 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-muted flex items-center justify-center text-4xl font-bold text-primary">
              <ProfilePicture 
                src={member.avatarStaticUrl ?? member.avatar ?? undefined}
                memberName={`${member.firstName} ${member.lastName}`}
                className="h-full w-full object-cover"
                size="xl"
              />
            </div>
            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute -right-2 -bottom-2 h-8 w-8 rounded-lg shadow-lg"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold font-heading">{member.firstName} {member.lastName}</h2>
              <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" />
            </div>
            <p className="text-sm text-muted-foreground font-mono">#{member.id.slice(0, 8)}</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 py-4 border-y border-border/50">
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Status</p>
              <Badge className={cn(
                "font-bold hover:bg-opacity-20",
                member.status === "Active" ? "bg-green-500/20 text-green-500 border-green-500/30" :
                member.status === "Expiring Soon" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
                member.status === "Expired" ? "bg-red-500/20 text-red-600 border-red-500/30" :
                "bg-muted text-muted-foreground"
              )}>{member.status}</Badge>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date of Joining</p>
              <p className="text-sm font-semibold">{member.startDate}</p>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gender</p>
              <p className="text-sm font-semibold capitalize">{member.gender}</p>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date of Birth</p>
              <p className="text-sm font-semibold">{member.dob || "Not set"}</p>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Phone</p>
              <p className="text-sm font-semibold">{member.phone}</p>
            </div>
            <div className="text-left space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Height (cm)</p>
              <p className="text-sm font-semibold">{member.height || "Not set"}</p>
            </div>
          </div>

          <div className="w-full space-y-4 pt-2">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Address</p>
              <p className="text-sm">{member.address || "Not set"}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Interest Areas</p>
              <div className="flex flex-wrap gap-2">
                {member.interestAreas && member.interestAreas.length > 0 ? (
                  member.interestAreas.map((area, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-3 py-1 hover:bg-primary/20 transition-colors"
                    >
                      {area}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="bg-muted text-foreground font-bold text-xs px-3 py-1">
                    General Fitness
                  </Badge>
                )}
              </div>
            </div>
            
            <TrainerAssignment 
              memberId={memberId}
              member={member}
              trainers={trainers}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrainerAssignment({ 
  memberId, 
  member,
  trainers 
}: MemberProfileCardProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch training types from API
  const { data: trainingTypes = [] } = useQuery<Array<{ id: string; name: string; isActive: boolean }>>({
    queryKey: ["/api/options/training-types"],
  });

  if (!member) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="text-left group cursor-pointer">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 flex items-center justify-between">
            Trainer <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
          <p className="text-sm font-semibold text-primary underline decoration-dotted underline-offset-4">
            {member.trainerId
              ? (() => {
                  const assignedTrainer = trainers.find((t: any) => t.id === member.trainerId);
                  return assignedTrainer
                    ? `${assignedTrainer.firstName} ${assignedTrainer.lastName}`
                    : "No Trainer Assigned";
                })()
              : "No Trainer Assigned"
            }
          </p>
        </div>
      </SheetTrigger>
      <SheetContent className="sm:max-w-[425px] bg-card border-border shadow-2xl">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold font-heading text-primary">Assign Trainer</SheetTitle>
        </SheetHeader>
        <form className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="trainer" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Trainer</Label>
            <Select
              defaultValue={member.trainerId || ""}
              onValueChange={async (trainerId) => {
                await apiRequest("PATCH", `/api/members/${memberId}`, { trainerId });
                queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
                toast({ title: "Trainer assigned successfully" });
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select a trainer" />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((trainer: any) => (
                  <SelectItem key={trainer.id} value={trainer.id}>
                    {trainer.firstName} {trainer.lastName} ({trainer.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Training Type</Label>
            <Select
              defaultValue={member.trainingType || ""}
              onValueChange={async (trainingType) => {
                await apiRequest("PATCH", `/api/members/${memberId}`, { trainingType });
                queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
                toast({ title: "Training type updated successfully" });
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Select training type" />
              </SelectTrigger>
              <SelectContent>
                {trainingTypes.map((type: any) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90">Assign Trainer</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
