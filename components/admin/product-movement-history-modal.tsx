"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

type MovementRecord = {
  id: string
  occurred_at: string
  qty: number
  reason: string
  reference_id: string
  created_by_name: string
  source: string
}

type ProductMovementHistoryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: number | null
  productName: string
}

export function ProductMovementHistoryModal({
  open,
  onOpenChange,
  productId,
  productName,
}: ProductMovementHistoryModalProps) {
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && productId) {
      loadMovements()
    }
  }, [open, productId])

  const loadMovements = async () => {
    if (!productId) return

    setLoading(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data, error } = await supabase
        .from("inventory_movements_with_details")
        .select("*")
        .eq("product_id", productId)
        .or("source.eq.manual,source.eq.admin")
        .order("occurred_at", { ascending: false })

      if (error) {
        console.error("[v0] Error loading movements:", error)
        return
      }

      setMovements(data || [])
    } catch (error) {
      console.error("[v0] Error in loadMovements:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalIn = movements.filter((m) => m.qty > 0).reduce((sum, m) => sum + m.qty, 0)
  const totalOut = Math.abs(movements.filter((m) => m.qty < 0).reduce((sum, m) => sum + m.qty, 0))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manuelle Buchungen: {productName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowUp className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm text-muted-foreground">Gesamt Eingänge</div>
                  <div className="text-xl font-bold text-green-600">{totalIn}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowDown className="h-5 w-5 text-red-600" />
                <div>
                  <div className="text-sm text-muted-foreground">Gesamt Ausgänge</div>
                  <div className="text-xl font-bold text-red-600">{totalOut}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div>
                  <div className="text-sm text-muted-foreground">Anzahl Buchungen</div>
                  <div className="text-xl font-bold">{movements.length}</div>
                </div>
              </div>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {movements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Keine manuellen Buchungen gefunden</div>
              ) : (
                <div className="space-y-2">
                  {movements.map((movement) => {
                    const isIncoming = movement.qty > 0
                    const date = new Date(movement.occurred_at)

                    return (
                      <div
                        key={movement.id}
                        className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-shrink-0">
                          {isIncoming ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                              <ArrowUp className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                              <ArrowDown className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={isIncoming ? "default" : "destructive"} className="text-xs">
                              {isIncoming ? "Eingang" : "Ausgang"}
                            </Badge>
                            <span className="text-sm font-medium">{Math.abs(movement.qty)} Stück</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {movement.reason || "Kein Grund angegeben"}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{date.toLocaleDateString("de-DE")}</span>
                            <span>•</span>
                            <span>{date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                            {movement.created_by_name && (
                              <>
                                <span>•</span>
                                <span>{movement.created_by_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {movement.reference_id && (
                          <div className="text-xs text-muted-foreground font-mono">{movement.reference_id}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
