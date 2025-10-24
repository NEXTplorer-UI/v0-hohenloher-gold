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
    totalAmount: "Gesamtbetrag:",
    paymentMethod: "Zahlungsmethode:",
    pickupDate: "Abholtermin:",
    bankDetailsHeading: "Bankverbindung für Überweisung",
    bankRecipient: "Empfänger:",
    bankRecipientValue: "Stimme und Struktur",
    bankIban: "IBAN:",
    bankIbanValue: "DE89 3704 0044 0532 0130 00",
    bankBic: "BIC:",
    bankBicValue: "COBADEFFXXX",
    bankReference: "Verwendungszweck:",
    bankImportant: "Wichtig: Bitte geben Sie unbedingt die Bestellnummer als Verwendungszweck an.",
    shippingNotice: "Ihre Ware wird innerhalb von 1-3 Tagen nach Zahlungseingang versandt.",
    outro: "Wir werden Ihre Bestellung sorgfältig vorbereiten und Sie informieren, sobald sie zur Abholung bereit ist.",
    closing: "Mit freundlichen Grüßen",
    signature: "Ihr Team von Südfrüchte Hohenlohe",
  },

  // Rechnung
  invoice: {
    greeting: "Liebe/r {{customerName}},",
    intro: "vielen Dank für Ihre Bestellung bei Südfrüchte Hohenlohe!",
    body: "Im Anhang finden Sie die Rechnung für Ihre Bestellung <strong>{{orderId}}</strong>.",
    infoHeading: "Wichtige Informationen:",
    info1: "Bitte bewahren Sie diese Rechnung für Ihre Unterlagen auf",
    info2: "Bei Fragen zur Rechnung kontaktieren Sie uns gerne",
    info3: "Zahlungsziel: 14 Tage nach Rechnungsdatum",
    outro: "Wir freuen uns auf Ihren nächsten Besuch!",
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
    unsubscribe: "Newsletter abbestellen",
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

  // Allgemein
  common: {
    name: "Name:",
    email: "E-Mail:",
    phone: "Telefon:",
    postalCode: "PLZ / Ort:",
    businessType: "Art des Geschäfts:",
    experience: "Erfahrung:",
    motivation: "Motivation:",
    availability: "Verfügbarkeit:",
    message: "Ihre Nachricht:",
    newsletter: "Newsletter:",
    notProvided: "Nicht angegeben",
    yes: "Ja",
    no: "Nein",
  },
}
