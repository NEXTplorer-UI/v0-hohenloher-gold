/**
 * Email-Templates mit Platzhaltern
 * Nutzen base-layout.ts für einheitliches Design
 */

import { renderTemplate, type TemplateVars } from "./engine"
import { emailCopy } from "./copy"

export interface EmailTemplateResult {
  subject: string
  html: string
}

type EmailCopyType = typeof emailCopy

// Bestellbestätigung Content
export function orderConfirmationContent(vars: TemplateVars, customCopy?: EmailCopyType): string {
  const copy = customCopy || emailCopy

  const paymentMethodText =
    vars.paymentMethod === "transfer"
      ? "Überweisung"
      : vars.paymentMethod === "cash"
        ? "Barzahlung bei Abholung"
        : vars.paymentMethod === "card"
          ? "Kartenzahlung"
          : "Unbekannt"

  const bankDetailsSection =
    vars.paymentMethod === "transfer"
      ? `
    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #856404; margin-top: 0;">${copy.orderConfirmation.bankDetailsHeading}</h3>
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
      <p style="margin: 15px 0 0 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 14px;">
        <strong>${copy.orderConfirmation.bankImportant}</strong>
      </p>
    </div>
  `
      : ""

  const shippingNotice =
    vars.paymentMethod === "transfer" && vars.deliveryMethod === "delivery"
      ? `
    <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #1565c0; margin-top: 0;">📦 Versandhinweis</h4>
      <p style="margin: 0; color: #1565c0;">${copy.orderConfirmation.shippingNotice}</p>
    </div>
  `
      : ""

  const template = `
    <h2>${copy.orderConfirmation.greeting}</h2>
    <p>${copy.orderConfirmation.intro}</p>
    
    <div class="info-box">
      <h3>${copy.orderConfirmation.detailsHeading}</h3>
      <p><strong>${copy.orderConfirmation.orderNumber}</strong> {{orderId}}</p>
      <p><strong>${copy.orderConfirmation.totalAmount}</strong> {{orderTotal}}</p>
      <p><strong>${copy.orderConfirmation.paymentMethod}</strong> ${paymentMethodText}</p>
      {{#if pickupDate}}<p><strong>${copy.orderConfirmation.pickupDate}</strong> {{pickupDate}}</p>{{/if}}
    </div>
    
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

  const template = `
    <h2>${copy.pickupReminder.greeting}</h2>
    <p>${copy.pickupReminder.intro}</p>
    
    <div class="highlight-box">
      <h3>${copy.pickupReminder.detailsHeading}</h3>
      <p><strong>${copy.pickupReminder.orderNumber}</strong> {{orderId}}</p>
      <p><strong>${copy.pickupReminder.pickupDate}</strong> {{pickupDate}}</p>
      <p><strong>${copy.pickupReminder.pickupLocation}</strong> {{pickupLocation}}</p>
    </div>
    
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
  return renderTemplate(String(vars.content || ""), vars)
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
    
    <div style="background: #f6f7f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
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
