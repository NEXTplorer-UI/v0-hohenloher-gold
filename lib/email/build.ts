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
      headerColor = "#16a34a"
      headerGradient = "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
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
