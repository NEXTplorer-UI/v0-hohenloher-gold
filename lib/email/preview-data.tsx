/**
 * Sample data for email previews
 */

import type { TemplateVars } from "./engine"

export type EmailPreviewId =
  | "orderConfirmation"
  | "invoice"
  | "pickupReminder"
  | "distributorApplication"
  | "newsletter"
  | "newsletterConfirmation"

export interface EmailPreviewData {
  title: string
  description: string
  vars: TemplateVars
}

export const emailPreviewData: Record<EmailPreviewId, EmailPreviewData> = {
  orderConfirmation: {
    title: "Bestellbestätigung",
    description: "Wird nach erfolgreicher Bestellung versendet",
    vars: {
      customerName: "Max Mustermann",
      orderId: "HG-2024-001",
      orderTotal: "45,90 €",
      paymentMethod: "transfer",
      pickupDate: "15. Januar 2025",
      deliveryMethod: "pickup",
    },
  },

  invoice: {
    title: "Rechnung",
    description: "Rechnung mit PDF-Anhang",
    vars: {
      customerName: "Max Mustermann",
      orderId: "HG-2024-001",
    },
  },

  pickupReminder: {
    title: "Abholtermin-Erinnerung",
    description: "Erinnerung vor dem Abholtermin",
    vars: {
      customerName: "Max Mustermann",
      orderId: "HG-2024-001",
      pickupDate: "15. Januar 2025, 10:00 Uhr",
      pickupLocation: "Hofladen Müller, Hauptstraße 123, 74523 Schwäbisch Hall",
    },
  },

  distributorApplication: {
    title: "Verteiler-Bewerbung",
    description: "Bestätigung der Verteiler-Bewerbung",
    vars: {
      firstName: "Max",
      lastName: "Mustermann",
      email: "max@example.com",
      phone: "+49 123 456789",
      plz: "74523",
      city: "Schwäbisch Hall",
      businessType: "Hofladen",
      experience: "5 Jahre Erfahrung im Einzelhandel",
      motivation: "Ich möchte regionale Produkte anbieten",
      availability: "Montag bis Freitag, 9-18 Uhr",
      personalMessage: "Ich freue mich auf die Zusammenarbeit!",
      newsletterSignup: true,
    },
  },

  newsletter: {
    title: "Newsletter",
    description: "Newsletter-Versand an Abonnenten",
    vars: {
      subject: "Neue Ernte eingetroffen!",
      content: `
        <h2>Frische sizilianische Orangen sind da!</h2>
        <p>Liebe Kunden,</p>
        <p>wir freuen uns, Ihnen mitteilen zu können, dass unsere neue Ernte frischer sizilianischer Orangen eingetroffen ist.</p>
        <p>Jetzt bestellen und die Sonne Siziliens genießen!</p>
      `,
    },
  },

  newsletterConfirmation: {
    title: "Newsletter-Bestätigung",
    description: "Double-Opt-In Bestätigungsmail",
    vars: {
      email: "max@example.com",
      confirmUrl: "https://hohenloher-gold.de/newsletter/confirm?token=abc123",
    },
  },
}
