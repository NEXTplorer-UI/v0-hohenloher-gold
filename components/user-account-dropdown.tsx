"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { User, LogIn, UserPlus, LayoutDashboard, Package, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"

export function UserAccountDropdown() {
  const { user, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isMobile = useIsMobile()

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
    const { signOut } = await import("@/contexts/auth-context")
    await signOut()
    setIsOpen(false)
    router.push("/")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="relative p-1.5 opacity-50 cursor-not-allowed inline-flex items-center justify-center">
        <User className="w-10 h-10 text-gold" strokeWidth={1.5} />
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="relative" ref={dropdownRef}>
        <Button variant="ghost" size="sm" className="relative p-2" onClick={() => setIsOpen(!isOpen)}>
          <User className="w-8 h-8 text-gold" strokeWidth={1.5} />
          <span className="sr-only">Benutzerkonto</span>
        </Button>

        {isOpen && (
          <Card className="absolute right-0 top-full mt-2 w-56 z-50 shadow-lg">
            <CardContent className="p-0">
              {user ? (
                <>
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium leading-none">Mein Konto</p>
                    <p className="text-xs leading-none text-muted-foreground truncate mt-1">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/customer/dashboard"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      href="/customer/dashboard?tab=orders"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      <span>Bestellungen</span>
                    </Link>
                    <Link
                      href="/customer/dashboard?tab=profile"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Einstellungen</span>
                    </Link>
                  </div>
                  <div className="border-t py-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Abmelden</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-medium">Willkommen</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/customer/login"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      <span>Anmelden</span>
                    </Link>
                    <Link
                      href="/customer/register"
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => setIsOpen(false)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Registrieren</span>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="relative p-1.5 hover:bg-gold/10 transition-colors rounded-md cursor-pointer inline-flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <User className="w-8 h-8 text-sidebar-foreground text-gold" strokeWidth={1.5} />
        <span className="sr-only">Benutzerkonto</span>
      </div>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-56 z-50 shadow-lg">
          <CardContent className="p-0">
            {user ? (
              <>
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium leading-none">Mein Konto</p>
                  <p className="text-xs leading-none text-muted-foreground truncate mt-1">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/customer/dashboard"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/customer/dashboard?tab=orders"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>Bestellungen</span>
                  </Link>
                  <Link
                    href="/customer/dashboard?tab=profile"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Einstellungen</span>
                  </Link>
                </div>
                <div className="border-t py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Abmelden</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium">Willkommen</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/customer/login"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Anmelden</span>
                  </Link>
                  <Link
                    href="/customer/register"
                    className="flex items-center px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                    onClick={() => setIsOpen(false)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span>Registrieren</span>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
