"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!window.location.hash) {
        window.scrollTo(0, 0)
      } else {
        const element = document.getElementById(window.location.hash.slice(1))
        if (element) {
          element.scrollIntoView({ behavior: "smooth" })
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}
