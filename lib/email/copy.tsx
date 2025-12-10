/**
 * Email-Texte zentral verwaltet
 * Leicht änderbar ohne Code-Anpassungen
 */

export const emailCopy = {
  // Bestellbestätigung
  orderConfirmation: {
    greeting: "Liebe/r {{customerName}},",
    intro: "vielen Dank für Ihre Bestellung bei Südfrüchte Hohenlohe!",
    detailsHeading: "Bestelldetails:",
    orderNumber: "Bestellnummer:",
    itemsHeading: "Bestellte Artikel:",
    totalAmount: "Gesamtbetrag:",
    paymentMethod: "Zahlungsmethode:",
    pickupDate: "Abholtermin:",
    bankDetailsHeading: "Bankverbindung für Überweisung",
    bankRecipient: "Empfänger:",
    bankRecipientValue: "Gerlinde Fink",
    bankIban: "IBAN:",
    bankIbanValue: "DE35 6225 1550 1000 5154 15",
    bankBic: "BIC:",
    bankBicValue: "SOLADES1KUN",
    bankReference: "Verwendungszweck:",
    bankImportant: "Wichtig: Bitte geben Sie unbedingt die Bestellnummer als Verwendungszweck an.",
    bankPaymentDeadline: "Zahlungsziel:",
    bankPaymentDeadlineText: "Bitte überweisen Sie den Betrag bis spätestens",
    shippingNotice: "Ihre Ware wird innerhalb von 1-3 Tagen nach Zahlungseingang versandt.",
    outro: "Wir werden Ihre Bestellung sorgfältig vorbereiten und Sie informieren, sobald sie zur Abholung bereit ist.",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Abholtermin-Erinnerung
  pickupReminder: {
    greeting: "Liebe/r {{customerName}},",
    intro: "Ihre Bestellung ist bereit zur Abholung!",
    detailsHeading: "Abholdetails:",
    orderNumber: "Bestellnummer:",
    pickupDate: "Abholtermin:",
    pickupLocation: "Abholort:",
    reminder: "Bitte bringen Sie diese E-Mail oder Ihre Bestellnummer zur Abholung mit.",
    outro: "Wir freuen uns auf Sie!",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Verteiler-Bewerbung
  distributorApplication: {
    greeting: "Hallo {{firstName}},",
    intro: "schön, dass Sie Teil unserer Südfrüchte Hohenlohe Familie werden möchten!",
    body: "Wir haben Ihre Bewerbung als Verteiler erhalten und freuen uns sehr über Ihr Interesse. Unser Team wird sich Ihre Angaben in Ruhe anschauen und sich in den nächsten Tagen bei Ihnen melden.",
    summaryHeading: "Ihre Bewerbung im Überblick:",
    personalDataHeading: "Persönliche Daten",
    businessInfoHeading: "Geschäftsinformationen",
    contact:
      "Falls Sie noch Fragen haben oder etwas ändern möchten, können Sie uns jederzeit unter <strong>kontakt@suedfruechte-hohenlohe.de</strong> erreichen.",
    closing: "Herzliche Grüße aus Hohenlohe,",
    signature: "Ihr Südfrüchte Hohenlohe Team 🌻",
  },

  // Newsletter
  newsletter: {
    unsubscribe: "E-Mail abbestellen",
  },

  // Newsletter-Bestätigung
  newsletterConfirmation: {
    greeting: "Hallo,",
    intro: "vielen Dank für Ihr Interesse an unserem Newsletter!",
    body: "Bitte bestätigen Sie Ihre Anmeldung, indem Sie auf den folgenden Button klicken:",
    buttonText: "Newsletter-Anmeldung bestätigen",
    alternativeText: "Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:",
    outro: "Wenn Sie sich nicht für unseren Newsletter angemeldet haben, können Sie diese E-Mail einfach ignorieren.",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Zahlungsbeleg
  paymentReceipt: {
    greeting: "Liebe/r {{customerName}},",
    intro: "vielen Dank für Ihre Zahlung!",
    body: "Anbei erhalten Sie Ihren digitalen Zahlungsbeleg für Bestellung <strong>{{orderNumber}}</strong>.",
    receiptHeading: "Zahlungsbeleg",
    orderNumber: "Bestellnummer:",
    orderDate: "Datum:",
    paymentMethod: "Zahlungsmethode:",
    itemsHeading: "Bestellte Artikel:",
    totalAmount: "Gesamtbetrag:",
    paymentStatus: "Zahlungsstatus:",
    paymentStatusValue: "Bezahlt",
    outro: "Vielen Dank für Ihren Einkauf!",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Abholbereit
  readyForPickup: {
    greeting: "Liebe/r {{customerName}},",
    intro: "Ihre Bestellung ist bereit zur Abholung!",
    detailsHeading: "Abholdetails:",
    orderNumber: "Bestellnummer:",
    pickupLocation: "Abholort:",
    reminder: "Bitte bringen Sie diese E-Mail oder Ihre Bestellnummer zur Abholung mit.",
    outro: "Wir freuen uns auf Sie!",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Bestellung storniert
  orderCancelled: {
    greeting: "Liebe/r {{customerName}},",
    intro: "Ihre Bestellung wurde storniert.",
    detailsHeading: "Stornierte Bestellung:",
    orderNumber: "Bestellnummer:",
    body: "Falls Sie Fragen zur Stornierung haben, kontaktieren Sie uns gerne.",
    contact: "Sie erreichen uns unter <strong>kontakt@suedfruechte-hohenlohe.de</strong> oder telefonisch.",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Versandbenachrichtigung
  shippingNotification: {
    greeting: "Liebe/r {{customerName}},",
    intro: "Ihre Bestellung ist unterwegs!",
    detailsHeading: "Versanddetails:",
    orderNumber: "Bestellnummer:",
    trackingNumber: "Sendungsnummer:",
    carrier: "Versanddienstleister:",
    estimatedDelivery: "Voraussichtliche Zustellung:",
    body: "Ihre Bestellung wurde heute versandt und sollte in den nächsten Tagen bei Ihnen eintreffen.",
    trackingInfo: "Sie können Ihre Sendung mit der oben genannten Sendungsnummer verfolgen.",
    outro: "Wir wünschen Ihnen viel Freude mit Ihren Produkten!",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Allgemein
  common: {
    name: "Name:",
    email: "E-Mail:",
    phone: "Telefon:",
    postalCode: "PLZ / Ort:",
    businessType: "Art des Standorts:",
    experience: "Erfahrung:",
    motivation: "Motivation:",
    availability: "Verfügbarkeit:",
    message: "Persönliche Nachricht:",
    newsletter: "Newsletter:",
    notProvided: "Nicht angegeben",
    yes: "Ja",
    no: "Nein",
  },
}
