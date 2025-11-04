"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X } from "lucide-react"
import { FeedbackModal } from "./feedback-modal"

const ENABLED_PAGES = [
  "/",
  "/shop",
  "/products",
  "/customer/dashboard",
  "/verteiler",
  "/checkout",
  "/admin",
  "/pos/pickup",
  "/order-confirmation",
]

export function FeedbackButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState("")

  useEffect(() => {
    // Get current page path
    const path = window.location.pathname
    setCurrentPage(path)

    // Check if feedback button should be shown on this page
    const shouldShow = ENABLED_PAGES.some((page) => path === page || path.startsWith(page + "/"))

    if (shouldShow) {
      // Show button after 5 seconds (smart timing)
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [])

  if (!isVisible || isMinimized) {
    return null
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <div className="relative">
          {/* Close/Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-muted hover:bg-muted/80 rounded-full flex items-center justify-center shadow-md transition-colors z-10"
            aria-label="Feedback-Button ausblenden"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Main feedback button */}
          <Button
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full shadow-2xl hover:shadow-xl transition-all hover:scale-105 pr-6"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Feedback
          </Button>
        </div>
      </div>

      <FeedbackModal open={isModalOpen} onOpenChange={setIsModalOpen} currentPage={currentPage} />
    </>
  )
}
