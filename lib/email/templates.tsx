/**
 * Email Template Content Functions
 * Diese Datei enthält alle Email-Template-Inhalte
 */

import type { TemplateVars } from "./engine"
import type { emailCopy } from "./copy"

export function orderPickedUpContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  const customerName = vars.customerName || "Kunde"
  const orderNumber = vars.orderNumber || vars.orderId || ""

  return `
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hallo ${customerName},
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      vielen Dank, dass Sie Ihre Bestellung <strong>${orderNumber}</strong> bei uns abgeholt haben!
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Wir hoffen, dass Ihnen unsere Produkte schmecken und Sie sich bester Qualität erfreuen können. 
      Es war uns eine Freude, Sie bei uns begrüßen zu dürfen.
    </p>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Sollten Sie Fragen haben oder Feedback geben möchten, stehen wir Ihnen jederzeit gerne zur Verfügung.
    </p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="color: #065f46; font-size: 14px; line-height: 1.5; margin: 0;">
        <strong>💚 Wir freuen uns auf Ihren nächsten Besuch!</strong><br>
        Bleiben Sie gesund und genießen Sie unsere frischen Früchte.
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Mit sonnigen Grüßen<br>
      Ihr Team von Südfrüchte Hohenlohe
    </p>
  `
}

export function orderConfirmationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Order confirmation content</p>"
}

export function pickupReminderContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Pickup reminder content</p>"
}

export function distributorApplicationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Distributor application content</p>"
}

export function newsletterContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Newsletter content</p>"
}

export function newsletterConfirmationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Newsletter confirmation content</p>"
}

export function paymentReceiptContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Payment receipt content</p>"
}

export function readyForPickupContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Ready for pickup content</p>"
}

export function orderCancelledContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Order cancelled content</p>"
}

export function shippingNotificationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Shipping notification content</p>"
}

export function contactConfirmationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Contact confirmation content</p>"
}

export function complaintConfirmationContent(vars: TemplateVars, customCopy?: typeof emailCopy): string {
  // Placeholder - this should already exist in your codebase
  return "<p>Complaint confirmation content</p>"
}
