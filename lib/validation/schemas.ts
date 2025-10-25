import { z } from "zod"

// German phone number validation
const phoneRegex = /^(\+49|0)[1-9]\d{1,14}$/

// German postal code validation
const postalCodeRegex = /^\d{5}$/

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
  .regex(/[A-Z]/, "Passwort muss mindestens einen Großbuchstaben enthalten")
  .regex(/[a-z]/, "Passwort muss mindestens einen Kleinbuchstaben enthalten")
  .regex(/\d/, "Passwort muss mindestens eine Zahl enthalten")

// Email validation with German domains
const emailSchema = z
  .string()
  .email("Ungültige E-Mail-Adresse")
  .refine((email) => email.length <= 254, "E-Mail-Adresse ist zu lang")

// Registration form schema
export const registrationSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
      .max(50, "Vorname darf maximal 50 Zeichen lang sein")
      .regex(/^[a-zA-ZäöüÄÖÜß\s-]+$/, "Vorname enthält ungültige Zeichen"),
    lastName: z
      .string()
      .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
      .max(50, "Nachname darf maximal 50 Zeichen lang sein")
      .regex(/^[a-zA-ZäöüÄÖÜß\s-]+$/, "Nachname enthält ungültige Zeichen"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    phone: z
      .string()
      .optional()
      .refine((phone) => !phone || phoneRegex.test(phone), "Ungültige Telefonnummer"),
    address: z.string().optional(),
    city: z
      .string()
      .optional()
      .refine((city) => !city || /^[a-zA-ZäöüÄÖÜß\s-]+$/.test(city), "Stadt enthält ungültige Zeichen"),
    postalCode: z
      .string()
      .optional()
      .refine((code) => !code || postalCodeRegex.test(code), "Ungültige Postleitzahl (5 Ziffern)"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
  })

// Login form schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Passwort ist erforderlich"),
})

// Contact form schema
export const contactSchema = z.object({
  firstName: z
    .string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
  lastName: z
    .string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
  email: emailSchema,
  subject: z
    .string()
    .min(5, "Betreff muss mindestens 5 Zeichen lang sein")
    .max(100, "Betreff darf maximal 100 Zeichen lang sein"),
  message: z
    .string()
    .min(10, "Nachricht muss mindestens 10 Zeichen lang sein")
    .max(2000, "Nachricht darf maximal 2000 Zeichen lang sein"),
})

// Complaint form schema
export const complaintSchema = z.object({
  firstName: z
    .string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
  lastName: z
    .string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
  email: emailSchema,
  orderNumber: z
    .string()
    .min(1, "Bestellnummer ist erforderlich")
    .max(50, "Bestellnummer darf maximal 50 Zeichen lang sein"),
  description: z
    .string()
    .min(10, "Beschreibung muss mindestens 10 Zeichen lang sein")
    .max(1000, "Beschreibung darf maximal 1000 Zeichen lang sein"),
  image: z.instanceof(File, { message: "Foto ist erforderlich" }),
})

// Checkout form schema
export const checkoutSchema = z
  .object({
    email: emailSchema,
    firstName: z
      .string()
      .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
      .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
    lastName: z
      .string()
      .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
      .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
    phone: z.string().refine((phone) => phoneRegex.test(phone), "Ungültige Telefonnummer"),
    address: z
      .string()
      .min(5, "Adresse muss mindestens 5 Zeichen lang sein")
      .max(100, "Adresse darf maximal 100 Zeichen lang sein"),
    city: z
      .string()
      .min(2, "Stadt muss mindestens 2 Zeichen lang sein")
      .max(50, "Stadt darf maximal 50 Zeichen lang sein")
      .regex(/^[a-zA-ZäöüÄÖÜß\s-]+$/, "Stadt enthält ungültige Zeichen"),
    postalCode: z.string().regex(postalCodeRegex, "Ungültige Postleitzahl (5 Ziffern)"),
    createAccount: z.boolean().optional(),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.createAccount && data.password) {
        return passwordSchema.safeParse(data.password).success
      }
      return true
    },
    {
      message: "Passwort erfüllt nicht die Anforderungen",
      path: ["password"],
    },
  )
  .refine(
    (data) => {
      if (data.createAccount) {
        return data.password === data.confirmPassword
      }
      return true
    },
    {
      message: "Passwörter stimmen nicht überein",
      path: ["confirmPassword"],
    },
  )

// Distributor application schema
export const distributorSchema = z.object({
  firstName: z
    .string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
  lastName: z
    .string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
  email: emailSchema,
  phone: z.string().refine((phone) => phoneRegex.test(phone), "Ungültige Telefonnummer"),
  plz: z.string().regex(postalCodeRegex, "Ungültige Postleitzahl (5 Ziffern)"),
  city: z
    .string()
    .min(2, "Stadt muss mindestens 2 Zeichen lang sein")
    .max(50, "Stadt darf maximal 50 Zeichen lang sein"),
  businessType: z.string().optional(),
  motivation: z.string().optional(),
  availability: z.string().optional(),
  personalMessage: z
    .string()
    .optional()
    .refine((msg) => !msg || msg.length <= 2000, "Nachricht darf maximal 2000 Zeichen lang sein"),
  newsletter: z.boolean().optional(),
})

// Admin customer input schema
export const adminCustomerSchema = z.object({
  first_name: z
    .string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein"),
  last_name: z
    .string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein"),
  email: emailSchema,
  phone: z
    .string()
    .optional()
    .refine((phone) => !phone || phoneRegex.test(phone), "Ungültige Telefonnummer"),
  street: z.string().optional(),
  house_number: z.string().optional(),
  city: z
    .string()
    .optional()
    .refine((city) => !city || /^[a-zA-ZäöüÄÖÜß\s-]+$/.test(city), "Stadt enthält ungültige Zeichen"),
  postal_code: z
    .string()
    .optional()
    .refine((code) => !code || postalCodeRegex.test(code), "Ungültige Postleitzahl (5 Ziffern)"),
  tags: z.array(z.string()).optional(),
  pickupLocation: z.string().optional(),
  notes: z.string().optional(),
})
