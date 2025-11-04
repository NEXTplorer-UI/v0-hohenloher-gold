"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogIn, UserPlus, LayoutDashboard, Package, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function UserAccountDropdown() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    console.log("[v0] UserAccountDropdown mounted")

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log("[v0] Initial user state:", user ? "logged in" : "not logged in")
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[v0] Auth state changed:", _event, session?.user ? "logged in" : "not logged in")
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    if (isOpen && contentRef.current) {
      setTimeout(() => {
        const element = contentRef.current
        if (element) {
          const rect = element.getBoundingClientRect()
          const styles = window.getComputedStyle(element)
          console.log("[v0] Dropdown content dimensions:", {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            position: styles.position,
          })
        }
      }, 100)
    }
  }, [isOpen])

  const handleLogout = async () => {
    console.log("[v0] Logout clicked")
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const handleLoginClick = () => {
    console.log("[v0] Login menu item clicked - navigating to /customer/login")
    router.push("/customer/login")
  }

  const handleRegisterClick = () => {
    console.log("[v0] Register menu item clicked - navigating to /customer/register")
    router.push("/customer/register")
  }

  if (loading) {
    console.log("[v0] UserAccountDropdown loading...")
    return (
      <Button variant="ghost" size="sm" disabled className="relative">
        <User className="w-4 h-4" />
      </Button>
    )
  }

  console.log("[v0] UserAccountDropdown rendering, user:", user ? "logged in" : "not logged in")

  return (
    <DropdownMenu
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] Dropdown open state:", open)
        setIsOpen(open)
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => console.log("[v0] Dropdown trigger clicked")}
        >
          <User className="w-4 h-4" />
          <span className="sr-only">Benutzerkonto</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        ref={contentRef}
        align="end"
        className="w-56"
        style={{ zIndex: 9999 }}
        onPointerDownOutside={() => console.log("[v0] Clicked outside dropdown")}
        onEscapeKeyDown={() => console.log("[v0] Escape key pressed")}
      >
        {user ? (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Mein Konto</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/customer/dashboard"
                className="cursor-pointer"
                onClick={() => console.log("[v0] Dashboard link clicked")}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/customer/dashboard?tab=orders"
                className="cursor-pointer"
                onClick={() => console.log("[v0] Orders link clicked")}
              >
                <Package className="mr-2 h-4 w-4" />
                <span>Bestellungen</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/customer/dashboard?tab=profile"
                className="cursor-pointer"
                onClick={() => console.log("[v0] Settings link clicked")}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer" variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Abmelden</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel onClick={() => console.log("[v0] Dropdown content rendered")}>
              Willkommen
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLoginClick} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              <span>Anmelden</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRegisterClick} className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Registrieren</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
