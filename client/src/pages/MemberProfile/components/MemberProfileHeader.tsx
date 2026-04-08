import { Button } from "@/components/ui/button";
import { Shield, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useState } from "react";
import { MemberProfileHeaderProps } from "../types";

export function MemberProfileHeader({ 
  memberId, 
  member,
  onEditClick 
}: MemberProfileHeaderProps) {
  const [openEdit, setOpenEdit] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <Link href="/members">
        <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </Button>
      </Link>
      <div className="flex gap-2">
        <Sheet open={openEdit} onOpenChange={setOpenEdit}>
          <SheetTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onEditClick?.()}
            >
              <Edit2 className="h-4 w-4" /> Edit Profile
            </Button>
          </SheetTrigger>
        </Sheet>
        {/* 
         * Freeze Action - TODO: Implement functionality
         * Purpose: Temporarily suspend a member's membership
         * Features:
         * - Change member status from "Active" to "Frozen"
         * - Pause membership billing during freeze period
         * - Allow members to resume membership later
         * - Store freeze start/end dates
         * 
         * API Endpoint: PATCH /api/members/:id/freeze
         * Request Body: { freeze: boolean, freezeReason?: string, freezeEndDate?: string }
         */}
        <Button size="sm" variant="outline" className="gap-2 border-border" title="TODO: Implement freeze functionality">
          <Shield className="h-4 w-4" /> Freeze
        </Button>
        <Button size="sm" variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}
