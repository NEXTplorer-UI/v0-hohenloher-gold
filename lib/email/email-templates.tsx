export interface EmailTemplate {
  subject: string
  html: string
}

export class EmailTemplates {
  static invoice(customerName: string, orderId: string): EmailTemplate {
    return {
      subject: `Rechnung für Ihre Bestellung ${orderId} - Hohenloher Gold`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hohenloher Gold</h1>
            <p style="margin: 5px 0 0 0;">Ihre Rechnung ist bereit</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Liebe/r ${customerName},</h2>
            
            <p>vielen Dank für Ihre Bestellung bei Hohenloher Gold!</p>
            
            <p>Im Anhang finden Sie die Rechnung für Ihre Bestellung <strong>${orderId}</strong>.</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #a16207; margin-top: 0;">Wichtige Informationen:</h3>
              <ul>
                <li>Bitte bewahren Sie diese Rechnung für Ihre Unterlagen auf</li>
                <li>Bei Fragen zur Rechnung kontaktieren Sie uns gerne</li>
                <li>Zahlungsziel: 14 Tage nach Rechnungsdatum</li>
              </ul>
            </div>
            
            <p>Wir freuen uns auf Ihren nächsten Besuch!</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr Team von Hohenloher Gold</p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
            <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
          </div>
        </div>
      `,
    }
  }

  static orderConfirmation(
    customerName: string,
    orderId: string,
    orderTotal: string,
    paymentMethod: string,
    deliveryMethod?: string,
    pickupDate?: string,
  ): EmailTemplate {
    const paymentMethodText =
      paymentMethod === "transfer"
        ? "Überweisung"
        : paymentMethod === "cash"
          ? "Barzahlung bei Abholung"
          : paymentMethod === "card"
            ? "Kartenzahlung"
            : "Unbekannt"

    const bankDetailsSection =
      paymentMethod === "transfer"
        ? `
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">Bankverbindung für Überweisung</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
          <div>
            <strong>Empfänger:</strong><br>
            Stimme und Struktur
          </div>
          <div>
            <strong>IBAN:</strong><br>
            DE89 3704 0044 0532 0130 00
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div>
            <strong>BIC:</strong><br>
            COBADEFFXXX
          </div>
          <div>
            <strong>Verwendungszweck:</strong><br>
            Bestellung ${orderId}
          </div>
        </div>
        <p style="margin: 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 14px;">
          <strong>Wichtig:</strong> Bitte geben Sie unbedingt die Bestellnummer als Verwendungszweck an.
        </p>
      </div>
    `
        : ""

    const shippingNotice =
      paymentMethod === "transfer" && deliveryMethod === "delivery"
        ? `
      <div style="background: #e3f2fd; border: 1px solid #90caf9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="color: #1565c0; margin-top: 0;">📦 Versandhinweis</h4>
        <p style="margin: 0; color: #1565c0;">
          Ihre Ware wird innerhalb von 1-3 Tagen nach Zahlungseingang versandt.
        </p>
      </div>
    `
        : ""

    return {
      subject: `Bestellbestätigung ${orderId} - Hohenloher Gold`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hohenloher Gold</h1>
            <p style="margin: 5px 0 0 0;">Bestellbestätigung</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Liebe/r ${customerName},</h2>
            
            <p>vielen Dank für Ihre Bestellung bei Hohenloher Gold!</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #a16207; margin-top: 0;">Bestelldetails:</h3>
              <p><strong>Bestellnummer:</strong> ${orderId}</p>
              <p><strong>Gesamtbetrag:</strong> ${orderTotal}</p>
              <p><strong>Zahlungsmethode:</strong> ${paymentMethodText}</p>
              ${pickupDate ? `<p><strong>Abholtermin:</strong> ${pickupDate}</p>` : ""}
            </div>
            
            ${bankDetailsSection}
            ${shippingNotice}
            
            <p>Wir werden Ihre Bestellung sorgfältig vorbereiten und Sie informieren, sobald sie zur Abholung bereit ist.</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr Team von Hohenloher Gold</p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
            <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
          </div>
        </div>
      `,
    }
  }

  static pickupReminder(
    customerName: string,
    orderId: string,
    pickupDate: string,
    pickupLocation: string,
  ): EmailTemplate {
    return {
      subject: `Erinnerung: Abholung Ihrer Bestellung ${orderId} - Hohenloher Gold`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hohenloher Gold</h1>
            <p style="margin: 5px 0 0 0;">Abholtermin-Erinnerung</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            <h2>Liebe/r ${customerName},</h2>
            
            <p>Ihre Bestellung ist bereit zur Abholung!</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <h3 style="color: #16a34a; margin-top: 0;">Abholdetails:</h3>
              <p><strong>Bestellnummer:</strong> ${orderId}</p>
              <p><strong>Abholtermin:</strong> ${pickupDate}</p>
              <p><strong>Abholort:</strong> ${pickupLocation}</p>
            </div>
            
            <p>Bitte bringen Sie diese E-Mail oder Ihre Bestellnummer zur Abholung mit.</p>
            
            <p>Wir freuen uns auf Sie!</p>
            
            <p>Mit freundlichen Grüßen<br>
            Ihr Team von Hohenloher Gold</p>
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
            <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
          </div>
        </div>
      `,
    }
  }

  static newsletter(subject: string, content: string): EmailTemplate {
    return {
      subject: `${subject} - Hohenloher Gold Newsletter`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #a16207 0%, #d97706 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Hohenloher Gold</h1>
            <p style="margin: 5px 0 0 0;">Newsletter</p>
          </div>
          
          <div style="padding: 20px; background: #f9f9f9;">
            ${content}
          </div>
          
          <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>Hohenloher Gold | Weststraße 28 | 74629 Pfedelbach</p>
            <p>E-Mail: kontakt@suedfruechte-hohenlohe.de | Tel: 0157 357 038 64</p>
            <p><a href="#" style="color: #d97706;">Newsletter abbestellen</a></p>
          </div>
        </div>
      `,
    }
  }
}
