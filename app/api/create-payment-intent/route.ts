import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    return NextResponse.json(
      {
        error: "Payment processing is not configured. Please contact support.",
        type: "configuration_error",
        retryable: false,
        contactSupport: true,
      },
      { status: 503 },
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20",
  })

  try {
    const body = await request.json()
    const { amount, currency, orderNumber, customerEmail, customerName } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        {
          error: "Ungültiger Betrag. Bitte überprüfen Sie Ihre Bestellung.",
          type: "validation_error",
          retryable: false,
          contactSupport: false,
        },
        { status: 400 },
      )
    }

    if (!orderNumber || !customerEmail) {
      return NextResponse.json(
        {
          error: "Fehlende Bestellinformationen. Bitte versuchen Sie es erneut.",
          type: "validation_error",
          retryable: true,
          contactSupport: false,
        },
        { status: 400 },
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ["card", "paypal", "sepa_debit"],
      metadata: {
        orderNumber,
        customerEmail,
        customerName,
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)

    if (error instanceof Stripe.errors.StripeError) {
      let errorMessage = "Ein Zahlungsfehler ist aufgetreten."
      let retryable = true
      let contactSupport = false

      switch (error.type) {
        case "StripeCardError":
          errorMessage = "Ihre Karte wurde abgelehnt. Bitte versuchen Sie eine andere Zahlungsmethode."
          retryable = true
          contactSupport = true
          break
        case "StripeRateLimitError":
          errorMessage = "Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut."
          retryable = true
          contactSupport = false
          break
        case "StripeInvalidRequestError":
          errorMessage = "Ungültige Zahlungsanfrage. Bitte kontaktieren Sie den Support."
          retryable = false
          contactSupport = true
          break
        case "StripeAPIError":
          errorMessage = "Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut."
          retryable = true
          contactSupport = true
          break
        case "StripeConnectionError":
          errorMessage = "Verbindungsfehler zum Zahlungsanbieter. Bitte versuchen Sie es erneut."
          retryable = true
          contactSupport = false
          break
        case "StripeAuthenticationError":
          errorMessage = "Zahlungskonfigurationsfehler. Bitte kontaktieren Sie den Support."
          retryable = false
          contactSupport = true
          break
      }

      return NextResponse.json(
        {
          error: errorMessage,
          type: "payment_error",
          code: error.code,
          retryable,
          contactSupport,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        type: "server_error",
        retryable: true,
        contactSupport: true,
      },
      { status: 500 },
    )
  }
}
