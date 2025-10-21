"use client"

import { useState, useCallback } from "react"
import { z } from "zod"

export interface ValidationError {
  field: string
  message: string
}

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>
  mode?: "onChange" | "onBlur" | "onSubmit"
  debounceMs?: number
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  mode = "onChange",
  debounceMs = 300,
}: UseFormValidationOptions<T>) {
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  const validateField = useCallback(
    async (fieldName: string, value: any, allData: T) => {
      if (mode === "onSubmit" && !touchedFields.has(fieldName)) {
        return
      }

      setIsValidating(true)

      try {
        // Create a partial schema for single field validation
        const fieldSchema = schema.pick({ [fieldName]: true } as any)
        await fieldSchema.parseAsync({ [fieldName]: value })

        // Remove error for this field if validation passes
        setErrors((prev) => prev.filter((error) => error.field !== fieldName))
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldError = error.errors.find((err) => err.path.includes(fieldName))
          if (fieldError) {
            setErrors((prev) => [
              ...prev.filter((error) => error.field !== fieldName),
              { field: fieldName, message: fieldError.message },
            ])
          }
        }
      } finally {
        setIsValidating(false)
      }
    },
    [schema, mode, touchedFields],
  )

  const validateForm = useCallback(
    async (data: T): Promise<{ isValid: boolean; errors: ValidationError[] }> => {
      setIsValidating(true)
      setErrors([])

      try {
        await schema.parseAsync(data)
        return { isValid: true, errors: [] }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationErrors: ValidationError[] = error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }))
          setErrors(validationErrors)
          return { isValid: false, errors: validationErrors }
        }
        return { isValid: false, errors: [{ field: "general", message: "Unbekannter Validierungsfehler" }] }
      } finally {
        setIsValidating(false)
      }
    },
    [schema],
  )

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return errors.find((error) => error.field === fieldName)?.message
    },
    [errors],
  )

  const hasFieldError = useCallback(
    (fieldName: string): boolean => {
      return errors.some((error) => error.field === fieldName)
    },
    [errors],
  )

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouchedFields((prev) => new Set([...prev, fieldName]))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => prev.filter((error) => error.field !== fieldName))
  }, [])

  return {
    errors,
    isValidating,
    validateField,
    validateForm,
    getFieldError,
    hasFieldError,
    markFieldTouched,
    clearErrors,
    clearFieldError,
    touchedFields,
  }
}
