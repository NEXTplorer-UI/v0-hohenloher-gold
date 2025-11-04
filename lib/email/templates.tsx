/**
 * Email-Templates mit Platzhaltern
 * Nutzen base-layout.ts für einheitliches Design
 */

import { renderTemplate, type TemplateVars } from "./engine"
import { emailCopy } from "./copy"
import { calculatePaymentDeadline } from "../format-time"

export interface EmailTemplateResult {
  subject: string
  html: string
}

type EmailCopyType = typeof emailCopy

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case "transfer":
      return "Überweisung"
    case "cash":
      return "Barzahlung bei Abholung"
    case "card":
      return "Kartenzahlung"
    case "sumup":
      return "Kartenzahlung (SumUp)"
    default:
      return "Unbekannt"
  }
}

// Bestellbestätigung Content
export function orderConfirmationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const paymentMethodDisplay = getPaymentMethodLabel(vars.paymentMethod)

  const itemsBySchedule = vars.itemsBySchedule as any[] | undefined
  const hasDeliverySchedules = itemsBySchedule && itemsBySchedule.length > 0

  const itemsList = hasDeliverySchedules
    ? itemsBySchedule
        .map((group: any) => {
          const schedule = group.schedule
          const scheduleHeader = schedule
            ? `<div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin: 20px 0 12px 0; border-left: 4px solid #d4af37;">
               <p style="margin: 0; font-weight: bold; color: #000;">📅 Liefertermin: ${new Date(schedule.delivery_date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
               ${schedule.pickup_start_time && schedule.pickup_end_time ? `<p style="margin: 5px 0 0 0; color: #666;">⏰ Abholzeit: ${schedule.pickup_start_time} - ${schedule.pickup_end_time} Uhr</p>` : ""}
             </div>`
            : ""

          const items = group.items
            .map(
              (item: any) =>
                `<div class="data-row">
            <span class="data-label">${item.products?.name || item.product_name || "Unbekanntes Produkt"}${item.product_size ? ` (${item.product_size})` : ""}</span>
            <span class="data-value">${item.quantity} ${item.products?.unit || item.unit || "Stück"} à €${(item.unit_price / 100).toFixed(2)} = €${(item.total_price / 100).toFixed(2)}</span>
          </div>`,
            )
            .join("")

          return scheduleHeader + items
        })
        .join("")
    : vars.orderItems
      ? (vars.orderItems as any[])
          .map(
            (item) =>
              `<div class="data-row">
            <span class="data-label">${item.product_name}${item.product_size ? ` (${item.product_size})` : ""}</span>
            <span class="data-value">${item.quantity} ${item.unit || "Stück"} à €${item.unit_price?.toFixed(2) || "0.00"} = €${item.total_price?.toFixed(2) || "0.00"}</span>
          </div>`,
          )
          .join("")
      : ""

  const pickupLinkSection = vars.pickupToken
    ? `
    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fef3c7; border-radius: 8px;">
      <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #000;">
        🎫 Ihre Bestellung online anzeigen
      </p>
      <a href="https://suedfruechte-hohenlohe.de/pos/pickup?token=${vars.pickupToken}" 
         style="display: inline-block; background: #d4af37; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Ihre Bestellung anzeigen
      </a>
      <p style="font-size: 13px; color: #666; margin: 12px 0 0 0;">
        Dieser Link ist 45 Tage gültig und führt zu Ihren Bestelldetails mit QR-Code für die Abholung.
      </p>
    </div>
  `
    : ""

  const bankDetailsSection =
    vars.paymentMethod === "transfer"
      ? `
    <div class="highlight-box">
      <h3 style="margin-top: 0;">${copy.orderConfirmation.bankDetailsHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.orderConfirmation.bankRecipient}</span>
        <span class="data-value">${copy.orderConfirmation.bankRecipientValue}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.orderConfirmation.bankIban}</span>
        <span class="data-value">${copy.orderConfirmation.bankIbanValue}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.orderConfirmation.bankBic}</span>
        <span class="data-value">${copy.orderConfirmation.bankBicValue}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.orderConfirmation.bankReference}</span>
        <span class="data-value">Bestellung {{orderId}}</span>
      </div>
      <div class="info-box" style="margin-top: 15px;">
        <p style="margin: 0; font-size: 14px;">
          <strong>${copy.orderConfirmation.bankImportant}</strong>
        </p>
      </div>
      ${
        vars.orderDate
          ? `
      <div class="info-box" style="margin-top: 15px; background: #fef3c7; border-left: 4px solid #d4af37;">
        <p style="margin: 0; font-size: 14px;">
          <strong>${copy.orderConfirmation.bankPaymentDeadline}</strong> ${copy.orderConfirmation.bankPaymentDeadlineText} <strong>${calculatePaymentDeadline(vars.orderDate)}</strong>
        </p>
      </div>
      `
          : ""
      }
    </div>
  `
      : ""

  const shippingNotice =
    vars.deliveryMethod === "delivery"
      ? `
    <div class="info-box">
      <p style="margin: 0;"><strong>📦 Versandhinweis:</strong> ${
        vars.hasCitrusFruits
          ? "Ihre Bestellung enthält Südfrüchte. Der Versand erfolgt nach Wareneingang, sobald die frischen Früchte bei uns eintreffen."
          : copy.orderConfirmation.shippingNotice
      }</p>
    </div>
  `
      : ""

  const template = `
    <h2>${copy.orderConfirmation.greeting}</h2>
    <p>${copy.orderConfirmation.intro}</p>
    
    <div class="info-box">
      <h3>${copy.orderConfirmation.detailsHeading}</h3>
      <p><strong>${copy.orderConfirmation.orderNumber}</strong> {{orderId}}</p>
      <p><strong>${copy.orderConfirmation.totalAmount}</strong> €{{orderTotal}}</p>
      <p><strong>${copy.orderConfirmation.paymentMethod}</strong> ${paymentMethodDisplay}</p>
      ${
        vars.hasCitrusFruits && vars.pickupDate
          ? `<p><strong>🍊 Liefertermin Südfrüchte:</strong> {{pickupDate}}</p>`
          : vars.pickupDate
            ? `<p><strong>${vars.deliveryMethod === "delivery" ? "Voraussichtlicher Liefertermin:" : copy.orderConfirmation.pickupDate}</strong> {{pickupDate}}</p>`
            : ""
      }
    </div>
    
    ${pickupLinkSection}
    
    ${itemsList ? `<div class="data-section"><h3>${copy.orderConfirmation.itemsHeading}</h3>${itemsList}</div>` : ""}
    
    ${bankDetailsSection}
    ${shippingNotice}
    
    <p>${copy.orderConfirmation.outro}</p>
    
    <p>${copy.orderConfirmation.closing}<br>
    ${copy.orderConfirmation.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Rechnung Content
export function invoiceContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.invoice.greeting}</h2>
    <p>${copy.invoice.intro}</p>
    <p>${copy.invoice.body}</p>
    
    <div class="info-box">
      <h3>${copy.invoice.infoHeading}</h3>
      <ul>
        <li>${copy.invoice.info1}</li>
        <li>${copy.invoice.info2}</li>
        <li>${copy.invoice.info3}</li>
      </ul>
    </div>
    
    <p>${copy.invoice.outro}</p>
    
    <p>${copy.invoice.closing}<br>
    ${copy.invoice.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Abholtermin-Erinnerung Content
export function pickupReminderContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const paymentMethodDisplay = getPaymentMethodLabel(vars.paymentMethod)

  const itemsList = vars.orderItems
    ? (vars.orderItems as any[])
        .map(
          (item) =>
            `<div class="data-row">
          <span class="data-label">${item.product_name}</span>
          <span class="data-value">${item.quantity} ${item.unit || "Stück"}</span>
        </div>`,
        )
        .join("")
    : ""

  const template = `
    <h2>${copy.pickupReminder.greeting}</h2>
    <p>${copy.pickupReminder.intro}</p>
    
    <div class="highlight-box">
      <h3>${copy.pickupReminder.detailsHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.pickupReminder.orderNumber}</span>
        <span class="data-value">{{orderId}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.pickupReminder.pickupDate}</span>
        <span class="data-value">{{pickupDate}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.pickupReminder.pickupLocation}</span>
        <span class="data-value">{{pickupLocation}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Zahlungsmethode</span>
        <span class="data-value">${paymentMethodDisplay}</span>
      </div>
    </div>
    
    ${itemsList ? `<div class="data-section"><h3>Ihre Bestellung:</h3>${itemsList}</div>` : ""}
    
    <p>${copy.pickupReminder.reminder}</p>
    <p>${copy.pickupReminder.outro}</p>
    
    <p>${copy.pickupReminder.closing}<br>
    ${copy.pickupReminder.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Verteiler-Bewerbung Content
export function distributorApplicationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.distributorApplication.greeting}</h2>
    <p>${copy.distributorApplication.intro}</p>
    <p>${copy.distributorApplication.body}</p>
    
    <div class="highlight-box">
      <strong>${copy.distributorApplication.summaryHeading}</strong>
    </div>
    
    <div class="data-section">
      <h3>${copy.distributorApplication.personalDataHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.common.name}</span>
        <span class="data-value">{{firstName}} {{lastName}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.common.email}</span>
        <span class="data-value">{{email}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.common.phone}</span>
        <span class="data-value">{{phone}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.common.postalCode}</span>
        <span class="data-value">{{plz}} {{city}}</span>
      </div>
    </div>
    
    <div class="data-section">
      <h3>${copy.distributorApplication.businessInfoHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.common.businessType}</span>
        <span class="data-value">{{businessType}}</span>
      </div>
      {{#if experience}}
      <div class="data-row">
        <span class="data-label">${copy.common.experience}</span>
        <span class="data-value">{{experience}}</span>
      </div>
      {{/if}}
      {{#if motivation}}
      <div class="data-row">
        <span class="data-label">${copy.common.motivation}</span>
        <span class="data-value">{{motivation}}</span>
      </div>
      {{/if}}
      {{#if availability}}
      <div class="data-row">
        <span class="data-label">${copy.common.availability}</span>
        <span class="data-value">{{availability}}</span>
      </div>
      {{/if}}
      {{#if personalMessage}}
      <div class="data-row">
        <span class="data-label">${copy.common.message}</span>
        <span class="data-value">{{personalMessage}}</span>
      </div>
      {{/if}}
      <div class="data-row">
        <span class="data-label">${copy.common.newsletter}</span>
        <span class="data-value">{{newsletterText}}</span>
      </div>
    </div>
    
    <p>${copy.distributorApplication.contact}</p>
    
    <p>${copy.distributorApplication.closing}<br>
    ${copy.distributorApplication.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Newsletter Content
export function newsletterContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const imageSection = vars.imageUrl
    ? `<div style="text-align: center; margin: 20px 0;">
         <img src="${vars.imageUrl}" alt="Newsletter Bild" style="max-width: 100%; height: auto; border-radius: 8px;" />
       </div>`
    : ""

  const template = `
    <h2>{{subject}}</h2>
    ${imageSection}
    <div style="line-height: 1.6;">
      {{content}}
    </div>
  `

  return renderTemplate(template, vars)
}

export function newsletterConfirmationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.newsletterConfirmation.greeting}</h2>
    <p>${copy.newsletterConfirmation.intro}</p>
    <p>${copy.newsletterConfirmation.body}</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{confirmUrl}}" 
         style="display: inline-block; background: #d4af37; color: #000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        ${copy.newsletterConfirmation.buttonText}
      </a>
    </div>
    
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
        ${copy.newsletterConfirmation.alternativeText}
      </p>
      <p style="margin: 0; font-size: 12px; color: #999; word-break: break-all;">
        {{confirmUrl}}
      </p>
    </div>
    
    <p style="font-size: 14px; color: #666;">
      ${copy.newsletterConfirmation.outro}
    </p>
    
    <p>${copy.newsletterConfirmation.closing}<br>
    ${copy.newsletterConfirmation.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Zahlungsbeleg
export function paymentReceiptContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const itemsList = vars.orderItems
    ? (vars.orderItems as any[])
        .map(
          (item) =>
            `<div class="data-row">
          <span class="data-label">${item.product_name}</span>
          <span class="data-value">${item.quantity}x à €${item.unit_price.toFixed(2)} = €${item.total_price.toFixed(2)}</span>
        </div>`,
        )
        .join("")
    : ""

  const template = `
    <h2>${copy.paymentReceipt.greeting}</h2>
    <p>${copy.paymentReceipt.intro}</p>
    <p>${copy.paymentReceipt.body}</p>
    
    <div class="highlight-box">
      <h3>${copy.paymentReceipt.receiptHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.paymentReceipt.orderNumber}</span>
        <span class="data-value">{{orderNumber}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.paymentReceipt.orderDate}</span>
        <span class="data-value">{{orderDate}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.paymentReceipt.paymentMethod}</span>
        <span class="data-value">${getPaymentMethodLabel(String(vars.paymentMethod || ""))}</span>
      </div>
    </div>
    
    <div class="data-section">
      <h3>${copy.paymentReceipt.itemsHeading}</h3>
      ${itemsList}
    </div>
    
    <div class="info-box">
      <div class="data-row">
        <span class="data-label"><strong>${copy.paymentReceipt.totalAmount}</strong></span>
        <span class="data-value"><strong>€{{total}}</strong></span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.paymentReceipt.paymentStatus}</span>
        <span class="data-value" style="color: #16a34a;">${copy.paymentReceipt.paymentStatusValue}</span>
      </div>
    </div>
    
    <p>${copy.paymentReceipt.outro}</p>
    
    <p>${copy.paymentReceipt.closing}<br>
    ${copy.paymentReceipt.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Abholbereit
export function readyForPickupContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.readyForPickup.greeting}</h2>
    <p>${copy.readyForPickup.intro}</p>
    
    <div class="highlight-box">
      <h3>${copy.readyForPickup.detailsHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.readyForPickup.orderNumber}</span>
        <span class="data-value">{{orderNumber}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">${copy.readyForPickup.pickupLocation}</span>
        <span class="data-value">{{pickupLocation}}</span>
      </div>
    </div>
    
    <div class="info-box">
      <p style="margin: 0;">${copy.readyForPickup.reminder}</p>
    </div>
    
    <p>${copy.readyForPickup.outro}</p>
    
    <p>${copy.readyForPickup.closing}<br>
    ${copy.readyForPickup.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Bestellung abgeholt
export function orderPickedUpContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.orderPickedUp.greeting}</h2>
    <p>${copy.orderPickedUp.intro}</p>
    <p>${copy.orderPickedUp.body}</p>
    
    <div class="info-box">
      <p style="margin: 0;">${copy.orderPickedUp.feedback}</p>
    </div>
    
    <p>${copy.orderPickedUp.outro}</p>
    
    <p>${copy.orderPickedUp.closing}<br>
    ${copy.orderPickedUp.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Bestellung storniert
export function orderCancelledContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.orderCancelled.greeting}</h2>
    <p>${copy.orderCancelled.intro}</p>
    
    <div class="info-box">
      <h3>${copy.orderCancelled.detailsHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.orderCancelled.orderNumber}</span>
        <span class="data-value">{{orderNumber}}</span>
      </div>
    </div>
    
    <p>${copy.orderCancelled.body}</p>
    <p>${copy.orderCancelled.contact}</p>
    
    <p>${copy.orderCancelled.closing}<br>
    ${copy.orderCancelled.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Versandbenachrichtigung (NEU)
export function shippingNotificationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>${copy.shippingNotification.greeting}</h2>
    <p>${copy.shippingNotification.intro}</p>
    
    <div class="highlight-box">
      <h3>${copy.shippingNotification.detailsHeading}</h3>
      <div class="data-row">
        <span class="data-label">${copy.shippingNotification.orderNumber}</span>
        <span class="data-value">{{orderNumber}}</span>
      </div>
      {{#if trackingNumber}}
      <div class="data-row">
        <span class="data-label">${copy.shippingNotification.trackingNumber}</span>
        <span class="data-value">{{trackingNumber}}</span>
      </div>
      {{/if}}
      {{#if carrier}}
      <div class="data-row">
        <span class="data-label">${copy.shippingNotification.carrier}</span>
        <span class="data-value">{{carrier}}</span>
      </div>
      {{/if}}
      {{#if estimatedDelivery}}
      <div class="data-row">
        <span class="data-label">${copy.shippingNotification.estimatedDelivery}</span>
        <span class="data-value">{{estimatedDelivery}}</span>
      </div>
      {{/if}}
    </div>
    
    <p>${copy.shippingNotification.body}</p>
    
    {{#if trackingNumber}}
    <div class="info-box">
      <p style="margin: 0;">${copy.shippingNotification.trackingInfo}</p>
    </div>
    {{/if}}
    
    <p>${copy.shippingNotification.outro}</p>
    
    <p>${copy.shippingNotification.closing}<br>
    ${copy.shippingNotification.signature}</p>
  `

  return renderTemplate(template, vars)
}

// Kontaktformular Bestätigung Content
export function contactConfirmationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>Vielen Dank für Ihre Nachricht!</h2>
    <p>Hallo {{name}},</p>
    <p>wir haben Ihre Kontaktanfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
    
    <div class="info-box">
      <h3>Ihre Nachricht:</h3>
      <p style="margin: 10px 0 0 0; color: #666;">{{message}}</p>
    </div>
    
    <p>Wir bearbeiten Anfragen in der Regel innerhalb von 24 Stunden.</p>
    
    <p>Mit freundlichen Grüßen<br>
    Ihr Team von Südfrüchte Hohenlohe</p>
  `

  return renderTemplate(template, vars)
}

// Reklamationsformular Bestätigung Content
export function complaintConfirmationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const template = `
    <h2>Ihre Reklamation wurde erfasst</h2>
    <p>Hallo {{name}},</p>
    <p>vielen Dank für Ihre Rückmeldung. Wir haben Ihre Reklamation erhalten und werden uns umgehend darum kümmern.</p>
    
    <div class="highlight-box">
      <h3>Details Ihrer Reklamation:</h3>
      <div class="data-row">
        <span class="data-label">Bestellnummer:</span>
        <span class="data-value">{{orderNumber}}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Produkt:</span>
        <span class="data-value">{{product}}</span>
      </div>
    </div>
    
    <div class="info-box">
      <h3>Ihre Beschreibung:</h3>
      <p style="margin: 10px 0 0 0; color: #666;">{{description}}</p>
    </div>
    
    <p>Wir werden Ihr Anliegen prüfen und uns innerhalb von 24 Stunden bei Ihnen melden.</p>
    
    <p>Mit freundlichen Grüßen<br>
    Ihr Team von Südfrüchte Hohenlohe</p>
  `

  return renderTemplate(template, vars)
}

// This function is no longer used but kept for backwards compatibility
export const orderConfirmationWithAccountContent = orderConfirmationContent
