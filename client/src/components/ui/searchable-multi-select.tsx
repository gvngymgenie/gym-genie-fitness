import * as React from "react"
import { Check, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

interface Member {
  id: string
  firstName: string
  lastName?: string | null
  phone: string
}

interface SearchableMultiSelectProps {
  value: string[]
  onValueChange: (value: string[]) => void
  members: Member[]
  placeholder?: string
  className?: string
}

export function SearchableMultiSelect({
  value,
  onValueChange,
  members,
  placeholder = "Select members",
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter members based on search query
  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.firstName.toLowerCase().includes(query) ||
        m.lastName?.toLowerCase().includes(query) ||
        m.phone.includes(query)
    )
  }, [members, searchQuery])

  const handleCheckboxChange = (memberId: string, checked: boolean) => {
    if (checked) {
      onValueChange([...value, memberId])
    } else {
      onValueChange(value.filter((id) => id !== memberId))
    }
  }

  const handleRemoveMember = (memberId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange(value.filter((id) => id !== memberId))
  }

  const getMemberLabel = (memberId: string): string => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return ""
    return `${member.firstName} ${member.lastName || ""}`.trim()
  }

  const selectedMembers = value
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as Member[]

  const displayText =
    selectedMembers.length > 0
      ? `${selectedMembers.length} member${selectedMembers.length > 1 ? "s" : ""} selected`
      : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-auto min-h-[3rem] bg-background border-border hover:bg-background hover:text-foreground flex-wrap gap-1",
            className
          )}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedMembers.slice(0, 2).map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-sm"
                >
                  {member.firstName}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => handleRemoveMember(member.id, e)}
                  />
                </span>
              ))}
              {selectedMembers.length > 2 && (
                <span className="text-muted-foreground text-sm">
                  +{selectedMembers.length - 2} more
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 opacity-50"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-60">
          <div className="p-2 space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No members found
              </p>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() =>
                    handleCheckboxChange(
                      member.id,
                      !value.includes(member.id)
                    )
                  }
                >
                  <Checkbox
                    id={`checkbox-${member.id}`}
                    checked={value.includes(member.id)}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(member.id, checked as boolean)
                    }
                    className="h-4 w-4"
                  />
                  <Label
                    htmlFor={`checkbox-${member.id}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {member.firstName} {member.lastName || ""} ({member.phone})
                  </Label>
                  {value.includes(member.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
