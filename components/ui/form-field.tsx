"use client"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface FormFieldProps {
  label: string
  name: string
  type?: "text" | "email" | "password" | "tel" | "textarea"
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
  maxLength?: number
  rows?: number
  showValidIcon?: boolean
}

export function FormField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  className,
  maxLength,
  rows = 3,
  showValidIcon = false,
}: FormFieldProps) {
  const hasError = !!error
  const isValid = !hasError && value.length > 0 && showValidIcon

  const inputClassName = cn(
    "transition-colors duration-200",
    hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
    isValid && "border-green-500 focus:border-green-500 focus:ring-green-500",
    className,
  )

  const InputComponent = type === "textarea" ? Textarea : Input

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <InputComponent
          id={name}
          name={name}
          type={type === "textarea" ? undefined : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={inputClassName}
          maxLength={maxLength}
          rows={type === "textarea" ? rows : undefined}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : undefined}
        />
        {(hasError || isValid) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasError ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        )}
      </div>
      {hasError && (
        <p id={`${name}-error`} className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {maxLength && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength} Zeichen
        </p>
      )}
    </div>
  )
}
