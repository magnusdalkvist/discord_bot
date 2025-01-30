"use client";

import * as React from "react";
import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export function MultiSelect({
  categories,
  users,
  onSelect,
}: {
  categories: { label: string; value: string }[];
  users: { label: string; value: string }[];
  onSelect?: (selectedItems: { type: "category" | "user"; value: string }[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<
    { type: "category" | "user"; value: string }[]
  >([]);
  React.useEffect(() => {
    onSelect?.(selectedItems);
  }, [selectedItems, onSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {selectedItems.length > 0
            ? `${selectedItems.length} ${selectedItems.length > 1 ? "filters" : "filter"}`
            : "Select filters..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search filters..." />
          <CommandList>
            <CommandEmpty>No category found</CommandEmpty>
            <CommandGroup heading="Categories">
              {categories?.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    setSelectedItems((prev) => {
                      if (
                        prev.some((item) => item.type === "category" && item.value === option.value)
                      ) {
                        return prev.filter(
                          (item) => !(item.type === "category" && item.value === option.value)
                        );
                      }
                      return [...prev, { type: "category", value: option.value }];
                    });
                  }}
                >
                  <Checkbox
                    checked={selectedItems.some(
                      (item) => item.type === "category" && item.value === option.value
                    )}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Users">
              {users?.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    setSelectedItems((prev) => {
                      if (
                        prev.some((item) => item.type === "user" && item.value === option.value)
                      ) {
                        return prev.filter(
                          (item) => !(item.type === "user" && item.value === option.value)
                        );
                      }
                      return [...prev, { type: "user", value: option.value }];
                    });
                  }}
                >
                  <Checkbox
                    checked={selectedItems.some(
                      (item) => item.type === "user" && item.value === option.value
                    )}
                    className="mr-2"
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
