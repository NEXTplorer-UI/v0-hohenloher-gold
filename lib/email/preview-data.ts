export const emailPreviewData = {
  orderConfirmation: {
    title: "Bestellbestätigung",
    description: "Wird nach erfolgreicher Bestellung versendet",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      orderDate: "24.10.2024",
      deliveryDate: "26.10.2024",
      deliveryTimeSlot: "14:00 - 16:00",
      deliveryAddress: "Hauptstraße 123, 74080 Heilbronn",
      paymentMethod: "bank_transfer",
      orderItems: [
        {
          product_name: "Sizilianische Orangen",
          quantity: 5,
          unit_price: 3.5,
          total_price: 17.5,
        },
        {
          product_name: "Bio-Zitronen",
          quantity: 3,
          unit_price: 2.8,
          total_price: 8.4,
        },
      ],
      total: "25.90",
    },
  },

  invoice: {
    title: "Rechnung",
    description: "Rechnung für abgeschlossene Bestellungen",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      orderDate: "24.10.2024",
      orderItems: [
        {
          product_name: "Sizilianische Orangen",
          quantity: 5,
          unit_price: 3.5,
          total_price: 17.5,
        },
      ],
      total: "17.50",
    },
  },

  pickupReminder: {
    title: "Abholtermin-Erinnerung",
    description: "Erinnerung an bevorstehenden Abholtermin",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      pickupDate: "26.10.2024",
      pickupTimeSlot: "14:00 - 16:00",
      pickupLocation: "Hauptstraße 123, 74080 Heilbronn",
    },
  },

  distributorApplication: {
    title: "Verteiler-Bewerbung",
    description: "Bestätigung der Bewerbung als Verteiler",
    vars: {
      applicantName: "Max Mustermann",
      applicantEmail: "max@example.com",
      applicantPhone: "0123456789",
      applicantAddress: "Hauptstraße 123, 74080 Heilbronn",
    },
  },

  newsletter: {
    title: "Newsletter",
    description: "Regelmäßiger Newsletter an Abonnenten",
    vars: {
      customerName: "Max Mustermann",
      unsubscribeUrl: "https://suedfruechte-hohenlohe.de/newsletter/unsubscribe?token=abc123",
    },
  },

  newsletterConfirmation: {
    title: "Newsletter-Bestätigung",
    description: "Double-Opt-In Bestätigung für Newsletter",
    vars: {
      confirmUrl: "https://suedfruechte-hohenlohe.de/newsletter/confirm?token=abc123",
    },
  },

  paymentReceipt: {
    title: "Zahlungsbeleg",
    description: "Bestätigung des Zahlungseingangs",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      orderDate: "24.10.2024",
      paymentMethod: "card",
      orderItems: [
        {
          product_name: "Sizilianische Orangen",
          quantity: 5,
          unit_price: 3.5,
          total_price: 17.5,
        },
        {
          product_name: "Bio-Zitronen",
          quantity: 3,
          unit_price: 2.8,
          total_price: 8.4,
        },
      ],
      total: "25.90",
    },
  },

  readyForPickup: {
    title: "Abholbereit",
    description: "Benachrichtigung dass Bestellung abholbereit ist",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      pickupLocation: "Hauptstraße 123, 74080 Heilbronn",
    },
  },

  orderConfirmed: {
    title: "Bestellung bestätigt",
    description: "Manuelle Bestätigung einer Bestellung",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
    },
  },

  orderPickedUp: {
    title: "Bestellung abgeholt",
    description: "Bestätigung dass Bestellung abgeholt wurde",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
    },
  },

  orderCancelled: {
    title: "Bestellung storniert",
    description: "Benachrichtigung über Stornierung",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
    },
  },

  shippingNotification: {
    title: "Versandbenachrichtigung",
    description: "Benachrichtigung über Versand mit Tracking",
    vars: {
      customerName: "Max Mustermann",
      orderNumber: "HG-2024-001",
      trackingNumber: "DHL1234567890",
      carrier: "DHL",
      estimatedDelivery: "26.10.2024",
    },
  },
}

export type EmailPreviewId = keyof typeof emailPreviewData
