"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)

    if (typeof window === "undefined" || !window.matchMedia) {
      setIsMobile(false)
      return
    }

    try {
      const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

      if (!mql) {
        setIsMobile(false)
        return
      }

      const onChange = () => {
        if (typeof window !== "undefined") {
          setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
        }
      }

      mql.addEventListener("change", onChange)
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

      return () => {
        if (mql && mql.removeEventListener) {
          mql.removeEventListener("change", onChange)
        }
      }
    } catch (error) {
      setIsMobile(false)
    }
  }, [])

  return mounted ? isMobile : false
}
