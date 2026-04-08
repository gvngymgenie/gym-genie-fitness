import * as React from "react"
import { Check } from "lucide-react"
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

interface MultiSelectDropdownProps {
  value: string[]
  onValueChange: (value: string[]) => void
  options: string[]
  placeholder?: string
  className?: string
}

export function MultiSelectDropdown({
  value,
  onValueChange,
  options,
  placeholder = "Select options",
  className,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false)

  const handleCheckboxChange = (option: string, checked: boolean) => {
    if (checked) {
      onValueChange([...value, option])
    } else {
      onValueChange(value.filter(item => item !== option))
    }
  }

  const displayText = value.length > 0 
    ? value.join(", ")
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-11 bg-background border-border hover:bg-background hover:text-foreground",
            className
          )}
        >
          <span className="truncate">{displayText}</span>
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
        <ScrollArea className="h-60">
          <div className="p-2 space-y-2">
            {options.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md"
              >
                <Checkbox
                  id={`checkbox-${option}`}
                  checked={value.includes(option)}
                  onCheckedChange={(checked) => 
                    handleCheckboxChange(option, checked as boolean)
                  }
                  className="h-4 w-4"
                />
                <Label
                  htmlFor={`checkbox-${option}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {option}
                </Label>
                {value.includes(option) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}