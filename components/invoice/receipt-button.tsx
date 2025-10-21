"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Receipt } from "lucide-react"
import { InvoiceGenerator } from "./invoice-generator"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

interface ReceiptButtonProps {
  orderId: string
  orderData: any
}

export function ReceiptButton({ orderId, orderData }: ReceiptButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const receiptData = {
    invoiceNumber: `Q-${orderId}`,
    date: new Date().toLocaleDateString("de-DE"),
    dueDate: "", // Not needed for receipts
    customer: orderData.customer,
    items: orderData.items,
    subtotal: orderData.subtotal,
    tax: orderData.tax,
    total: orderData.total,
    paymentMethod: "Bar/Abholung",
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Receipt className="h-4 w-4" />
          Quittung
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <InvoiceGenerator orderData={receiptData} type="receipt" />
      </DialogContent>
    </Dialog>
  )
}
