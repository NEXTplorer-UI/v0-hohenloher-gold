/**
 * SumUp Checkout Verification
 * Verifies payment status with SumUp API
 */

export interface SumUpCheckoutResult {
  status: "PAID" | "PENDING" | "FAILED" | "CANCELLED"
  checkoutId: string
  amount: number
  currency: string
  transactionId?: string
  transactionCode?: string
}

export async function verifySumUpCheckout(checkoutId: string): Promise<SumUpCheckoutResult> {
  const accessToken = process.env.SUMUP_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error("SUMUP_ACCESS_TOKEN not configured")
  }

  const response = await fetch(`https://api.sumup.com/v0.1/checkouts/${checkoutId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`SumUp API error: ${response.status}`)
  }

  const data = await response.json()

  return {
    status: data.status,
    checkoutId: data.id,
    amount: data.amount,
    currency: data.currency,
    transactionId: data.transaction_id,
    transactionCode: data.transaction_code,
  }
}
