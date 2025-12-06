"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  onSearchChange: (search: string) => void
  searchValue: string
  options: ComboboxOption[]
  placeholder?: string
  emptyText?: string
  className?: string
}

export function Combobox({
  value,
  onValueChange,
  onSearchChange,
  searchValue,
  options,
  placeholder = "Select...",
  emptyText = "No results found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    console.log("[v0] Combobox open state changed:", open)
  }, [open])

  React.useEffect(() => {
    if (open) {
      // Strategy 1: Try immediate focus on ref
      if (inputRef.current) {
        inputRef.current.focus()
        return
      }

      // Strategy 2: Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          return
        }

        // Strategy 3: Fall back to querySelector with longer timeout
        setTimeout(() => {
          const input = document.querySelector("[cmdk-input]") as HTMLInputElement
          if (input) {
            input.focus()
          }
        }, 300) // Increased to 300ms for production reliability
      })
    }
  }, [open])

  const selectedOption = options.find((option) => option.value === value)

  return (
    <Popover
      open={open}
      onOpenChange={(newOpen) => {
        console.log("[v0] Popover onOpenChange called:", newOpen)
        setOpen(newOpen)
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          onClick={(e) => {
            e.stopPropagation()
            console.log("[v0] Combobox button clicked, current open state:", open)
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999]"
        align="start"
        sideOffset={8}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-slot="popover-content"]')) {
            e.preventDefault()
          }
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder="Suchen..."
            value={searchValue}
            onValueChange={onSearchChange}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    console.log("[v0] ComboboxItem selected:", option.value)
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
