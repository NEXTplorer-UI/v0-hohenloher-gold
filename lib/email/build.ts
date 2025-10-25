/**
 * Email Builder - Baut finale Emails zusammen
 * Kombiniert Templates mit base-layout
 */

import { wrapInBaseLayout } from "./base-layout"
import {
  orderConfirmationContent,
  invoiceContent,
  pickupReminderContent,
  distributorApplicationContent,
  newsletterContent,
  newsletterConfirmationContent,
  paymentReceiptContent,
  readyForPickupContent,
  orderConfirmedContent,
  orderPickedUpContent,
  orderCancelledContent,
  shippingNotificationContent,
  contactConfirmationContent,
  complaintConfirmationContent,
  type EmailTemplateResult,
} from "./templates"
import type { TemplateVars } from "./engine"
import type { emailCopy } from "./copy"

export type EmailTemplateId =
  | "orderConfirmation"
  | "invoice"
  | "pickupReminder"
  | "distributorApplication"
  | "newsletter"
  | "newsletterConfirmation"
  | "paymentReceipt"
  | "readyForPickup"
  | "orderConfirmed"
  | "orderPickedUp"
  | "orderCancelled"
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

  switch (templateId) {
    case "orderConfirmation":
      subject = `Bestellbestätigung ${vars.orderId} - Südfrüchte Hohenlohe`
      headerTitle = "Bestellbestätigung"
      contentHtml = orderConfirmationContent(vars, customCopy)
      break

    case "invoice":
      subject = `Rechnung für Ihre Bestellung ${vars.orderId} - Südfrüchte Hohenlohe`
      headerTitle = "Ihre Rechnung ist bereit"
      contentHtml = invoiceContent(vars, customCopy)
      break

    case "pickupReminder":
      subject = `Erinnerung: Abholung Ihrer Bestellung ${vars.orderId} - Südfrüchte Hohenlohe`
      headerTitle = "Abholtermin-Erinnerung"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
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
      subject = `${vars.subject} - Südfrüchte Hohenlohe Newsletter`
      headerTitle = "Newsletter"
      contentHtml = newsletterContent(vars, customCopy)
      break

    case "newsletterConfirmation":
      subject = "Newsletter-Anmeldung bestätigen - Südfrüchte Hohenlohe"
      headerTitle = "Newsletter-Bestätigung"
      contentHtml = newsletterConfirmationContent(vars, customCopy)
      break

    case "paymentReceipt":
      subject = `Zahlungsbeleg für Bestellung ${vars.orderNumber} - Südfrüchte Hohenlohe`
      headerTitle = "Zahlungsbeleg"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = paymentReceiptContent(vars, customCopy)
      break

    case "readyForPickup":
      subject = `Bestellung ${vars.orderNumber} bereit zur Abholung - Südfrüchte Hohenlohe`
      headerTitle = "Bereit zur Abholung"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = readyForPickupContent(vars, customCopy)
      break

    case "orderConfirmed":
      subject = `Bestellung ${vars.orderNumber} bestätigt - Südfrüchte Hohenlohe`
      headerTitle = "Bestellung bestätigt"
      contentHtml = orderConfirmedContent(vars, customCopy)
      break

    case "orderPickedUp":
      subject = `Bestellung ${vars.orderNumber} abgeholt - Südfrüchte Hohenlohe`
      headerTitle = "Vielen Dank!"
      headerColor = "#d4af37"
      headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)"
      contentHtml = orderPickedUpContent(vars, customCopy)
      break

    case "orderCancelled":
      subject = `Bestellung ${vars.orderNumber} storniert - Südfrüchte Hohenlohe`
      headerTitle = "Bestellung storniert"
      headerColor = "#dc2626"
      headerGradient = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
      contentHtml = orderCancelledContent(vars, customCopy)
      break

    case "shippingNotification":
      subject = `Bestellung ${vars.orderNumber} wurde versandt - Südfrüchte Hohenlohe`
      headerTitle = "Ihre Bestellung ist unterwegs"
      headerColor = "#2563eb"
      headerGradient = "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
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
      headerColor = "#f59e0b"
      headerGradient = "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
      contentHtml = complaintConfirmationContent(vars, customCopy)
      break

    default:
      throw new Error(`Unknown template ID: ${templateId}`)
  }

  const html = wrapInBaseLayout(contentHtml, {
    title: headerTitle,
    headerColor,
    headerGradient,
  })

  return { subject, html }
}
