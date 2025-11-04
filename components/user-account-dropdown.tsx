"use client"

import { Button } from "@/components/ui/button"
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsOpen(false)
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="relative">
        <User className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="sm" className="relative" onClick={() => setIsOpen(!isOpen)}>
        <User className="w-4 h-4" />
        <span className="sr-only">Benutzerkonto</span>
      </Button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[9999]"
          style={{ top: "100%" }}
        >
          <div className="py-1" role="menu">
            {user ? (
              <>
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium leading-none">Mein Konto</p>
                  <p className="text-xs leading-none text-muted-foreground truncate mt-1">{user.email}</p>
                </div>
                <Link
                  href="/customer/dashboard"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/customer/dashboard?tab=orders"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span>Bestellungen</span>
                </Link>
                <Link
                  href="/customer/dashboard?tab=profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Einstellungen</span>
                </Link>
                <div className="border-t">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium">Willkommen</p>
                </div>
                <Link
                  href="/customer/login"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Anmelden</span>
                </Link>
                <Link
                  href="/customer/register"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Registrieren</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
