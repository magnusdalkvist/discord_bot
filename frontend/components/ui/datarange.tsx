"use client";

import * as React from "react";
import { add, addDays, format, set } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: React.HTMLAttributes<HTMLDivElement> & {
  date: DateRange | undefined;
  setDate: (date: DateRange) => void;
}) {
  const [selection, setSelection] = React.useState<string>("0");
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="px-4 pt-4">
            <Select
              value={selection}
              onValueChange={(value) => {
                setSelection(value);
                if (value === "week") {
                  // find Monday of the current week
                  const today = new Date();
                  const day = today.getDay();
                  const monday = new Date(today);
                  monday.setDate(today.getDate() - (day === 0 ? 6 : day));
                  setDate({
                    from: monday,
                    to: new Date(),
                  });
                  return;
                }
                const values = value.split(",");
                setDate({
                  from: addDays(new Date(), parseInt(values[0])),
                  to: values[1] ? addDays(new Date(), parseInt(values[1])) : undefined,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="0">Today</SelectItem>
                <SelectItem value="-1">Yesterday</SelectItem>
                <SelectItem value="-2,0">Last 3 days</SelectItem>
                <SelectItem value="week">This week</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(date) => {
              if (date) {
                setDate(date);
                setSelection("");
              }
            }}
            numberOfMonths={1}
            toDate={new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
