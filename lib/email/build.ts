/**
 * Email Builder - Baut finale Emails zusammen
 * Kombiniert Templates mit base-layout
 */

import { wrapInBaseLayout } from "./base-layout.tsx"
import {
  orderConfirmationContent,
  pickupReminderContent,
  distributorApplicationContent,
  newsletterContent,
  newsletterConfirmationContent,
  paymentReceiptContent,
  readyForPickupContent,
  orderCancelledContent,
  shippingNotificationContent,
  contactConfirmationContent,
  complaintConfirmationContent,
  orderPickedUpContent, // Added orderPickedUp content import
} from "./templates"
import type { TemplateVars } from "./engine"
import type { emailCopy } from "./copy"
import type { EmailTemplateResult } from "./types" // Declare EmailTemplateResult

export type EmailTemplateId =
  | "orderConfirmation"
  | "pickupReminder"
  | "distributorApplication"
  | "newsletter"
  | "newsletterConfirmation"
  | "paymentReceipt"
  | "readyForPickup"
  | "orderCancelled"
  | "orderPickedUp" // Added orderPickedUp template
  | "shippingNotification"
  | "contactConfirmation"
  | "complaintConfirmation"

export function buildEmail(
  templateId: EmailTemplateId,
  vars: TemplateVars,
  customCopy?: typeof emailCopy,
): EmailTemplateResult {
  let subject = ""
  let contentHtml = ""
  let headerTitle = ""
  let headerColor = "#d4af37"
  let headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
  let unsubscribeEmail: string | undefined = undefined

  switch (templateId) {
    case "orderConfirmation":
      subject = `Bestellbestätigung ${vars.orderId} - Südfrüchte Hohenlohe`
      headerTitle = "Bestellbestätigung"
      contentHtml = orderConfirmationContent(vars, customCopy)
      break

    case "pickupReminder":
      subject = `Erinnerung: Abholung Ihrer Bestellung ${vars.orderId} - Südfrüchte Hohenlohe`
      headerTitle = "Abholtermin-Erinnerung"
      contentHtml = pickupReminderContent(vars, customCopy)
      break

    case "distributorApplication":
      subject = "Ihre Bewerbung bei Südfrüchte Hohenlohe"
      headerTitle = "Bewerbung erhalten"
      contentHtml = distributorApplicationContent(
        {
          ...vars,
          newsletterText: vars.newsletterSignup ? "Ja, ich möchte den Newsletter erhalten" : "Nein",
        },
        customCopy,
      )
      break

    case "newsletter":
      subject = `${vars.subject} - Südfrüchte Hohenlohe`
      headerTitle = ""
      contentHtml = newsletterContent(vars, customCopy)
      unsubscribeEmail = vars.recipientEmail as string | undefined
      break

    case "newsletterConfirmation":
      subject = "Newsletter-Anmeldung bestätigen - Südfrüchte Hohenlohe"
      headerTitle = "Newsletter-Bestätigung"
      contentHtml = newsletterConfirmationContent(vars, customCopy)
      break

    case "paymentReceipt":
      subject = `Zahlungsbeleg für Bestellung ${vars.orderNumber} - Südfrüchte Hohenlohe`
      headerTitle = "Zahlungsbeleg"
      contentHtml = paymentReceiptContent(vars, customCopy)
      break

    case "readyForPickup":
      subject = `Bestellung ${vars.orderNumber} bereit zur Abholung - Südfrüchte Hohenlohe`
      headerTitle = "Bereit zur Abholung"
      contentHtml = readyForPickupContent(vars, customCopy)
      break

    case "orderCancelled":
      subject = `Bestellung ${vars.orderNumber} storniert - Südfrüchte Hohenlohe`
      headerTitle = "Bestellung storniert"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = orderCancelledContent(vars, customCopy)
      break

    case "orderPickedUp": // Added orderPickedUp template case
      subject = `Vielen Dank für Ihre Bestellung ${vars.orderNumber} - Südfrüchte Hohenlohe`
      headerTitle = "Vielen Dank!"
      headerColor = "#10b981"
      headerGradient = "linear-gradient(135deg, #059669 0%, #10b981 100%)"
      contentHtml = orderPickedUpContent(vars, customCopy)
      break

    case "shippingNotification":
      subject = `Bestellung ${vars.orderNumber} wurde versandt - Südfrüchte Hohenlohe`
      headerTitle = "Ihre Bestellung ist unterwegs"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = shippingNotificationContent(vars, customCopy)
      break

    case "contactConfirmation":
      subject = "Ihre Kontaktanfrage - Südfrüchte Hohenlohe"
      headerTitle = "Nachricht erhalten"
      contentHtml = contactConfirmationContent(vars, customCopy)
      break

    case "complaintConfirmation":
      subject = "Ihre Reklamation - Südfrüchte Hohenlohe"
      headerTitle = "Reklamation erfasst"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = complaintConfirmationContent(vars, customCopy)
      break

    default:
      throw new Error(`Unknown template ID: ${templateId}`)
  }

  const html = wrapInBaseLayout(contentHtml, {
    title: headerTitle,
    headerColor,
    headerGradient,
    unsubscribeEmail,
  })

  return { subject, html }
}
