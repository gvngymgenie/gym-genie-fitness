import { useState, useEffect } from "react";
import { format, parse, isValid, setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { Calendar as CalendarIcon } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - 80 + i);

export interface DatePickerWithNavProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  testId?: string;
}

export function DatePickerWithNav({ date, onDateChange, placeholder = "dd-mm-yyyy", testId }: DatePickerWithNavProps) {
  const [inputValue, setInputValue] = useState(date ? format(date, "dd-MM-yyyy") : "");
  const [calendarMonth, setCalendarMonth] = useState<Date>(date || new Date());
  const [open, setOpen] = useState(false);

  // Sync input value with date prop
  useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd-MM-yyyy"));
      setCalendarMonth(date);
    } else {
      setInputValue("");
    }
  }, [date]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    const parsed = parse(value, "dd-MM-yyyy", new Date());
    if (isValid(parsed) && value.length === 10) {
      onDateChange(parsed);
      setCalendarMonth(parsed);
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd-MM-yyyy"));
      setCalendarMonth(selectedDate);
    }
    setOpen(false);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = setMonth(calendarMonth, parseInt(monthIndex));
    setCalendarMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(calendarMonth, parseInt(year));
    setCalendarMonth(newDate);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="bg-background border-border h-11 flex-1"
        data-testid={testId}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex items-center justify-between gap-2 p-3 border-b">
            <Select value={calendarMonth.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={month} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={calendarMonth.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}