interface ShippingConfirmationEmailProps {
  customerName: string
  orderNumber: string
  trackingNumber?: string
  estimatedDelivery: string
  orderItems: Array<{
    name: string
    quantity: number
    price: number
  }>
  totalAmount: number
}

export function ShippingConfirmationEmail({
  customerName,
  orderNumber,
  trackingNumber,
  estimatedDelivery,
  orderItems,
  totalAmount,
}: ShippingConfirmationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{ textAlign: "center", marginBottom: "30px", borderBottom: "2px solid #D4A574", paddingBottom: "20px" }}
      >
        <h1 style={{ color: "#1B4332", fontSize: "28px", margin: "0" }}>Südfrüchte Hohenlohe</h1>
        <p style={{ color: "#D4A574", fontSize: "16px", margin: "5px 0 0 0" }}>x Hohenloher Gold</p>
      </div>

      {/* Main Content */}
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#1B4332", fontSize: "24px", marginBottom: "15px" }}>Ihre Bestellung ist unterwegs!</h2>

        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>Liebe/r {customerName},</p>

        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#333" }}>
          wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung <strong>{orderNumber}</strong>
          erfolgreich versendet wurde und sich bereits auf dem Weg zu Ihnen befindet.
        </p>

        {trackingNumber && (
          <div style={{ backgroundColor: "#f8f9fa", padding: "15px", borderRadius: "8px", margin: "20px 0" }}>
            <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
              <strong>Sendungsverfolgung:</strong> {trackingNumber}
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}>
              <strong>Voraussichtliche Zustellung:</strong> {estimatedDelivery}
            </p>
          </div>
        )}
      </div>

      {/* Order Summary */}
      <div style={{ marginBottom: "30px", backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px" }}>
        <h3 style={{ color: "#1B4332", fontSize: "18px", marginBottom: "15px" }}>Ihre Bestellung im Überblick:</h3>

        {orderItems.map((item, index) => (
          <div
            key={index}
            style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}
          >
            <span>
              {item.quantity}x {item.name}
            </span>
            <span>€{item.price.toFixed(2)}</span>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #ddd", paddingTop: "10px", marginTop: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold" }}>
            <span>Gesamtsumme:</span>
            <span>€{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Important Notice about Fresh Products */}
      <div
        style={{
          backgroundColor: "#FEF3C7",
          border: "1px solid #F59E0B",
          borderRadius: "8px",
          padding: "15px",
          margin: "20px 0",
        }}
      >
        <p style={{ margin: "0", fontSize: "14px", color: "#92400E" }}>
          <strong>Hinweis zu frischen Naturprodukten:</strong> Unsere Südfrüchte sind frische, natürliche Ware. Trotz
          sorgfältiger Kontrollen kann es vorkommen, dass einzelne Früchte verderben. Bei übermäßig viel verdorbener
          Ware nutzen Sie bitte unser Reklamationsformular auf unserer Website unter{" "}
          <a
            href="https://hohenloher-gold.de/contact#complaint-form"
            style={{ color: "#92400E", textDecoration: "underline" }}
          >
            hohenloher-gold.de/contact
          </a>
          . <strong>Reklamationen müssen spätestens 3 Tage nach Erhalt der Ware eingereicht werden.</strong>
        </p>
      </div>

      {/* Contact Information */}
      <div style={{ marginBottom: "30px" }}>
        <h3 style={{ color: "#1B4332", fontSize: "18px", marginBottom: "15px" }}>Bei Fragen sind wir für Sie da:</h3>

        <div style={{ fontSize: "14px", lineHeight: "1.6", color: "#666" }}>
          <p style={{ margin: "5px 0" }}>
            <strong>E-Mail:</strong> suedfruechte-hohenlohe@outlook.de
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Telefon:</strong> 0157 357 038 64
          </p>
          <p style={{ margin: "5px 0" }}>
            <strong>Geschäftszeiten:</strong> Mo-Fr 9:00-17:00 Uhr
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid #ddd",
          paddingTop: "20px",
          textAlign: "center",
          fontSize: "12px",
          color: "#999",
        }}
      >
        <p style={{ margin: "0" }}>
          Südfrüchte Hohenlohe x Hohenloher Gold
          <br />
          Weststraße 28, 74629 Pfedelbach
          <br />
          Ust-Id.-Nr.: DE 244 622 911
        </p>
      </div>
    </div>
  )
}

export default ShippingConfirmationEmail
