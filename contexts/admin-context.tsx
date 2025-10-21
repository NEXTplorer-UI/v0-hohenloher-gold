"use client"

import type React from "react"

import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, type ReactNode } from "react"

interface AdminUser {
  id: string
  email: string
}

interface AdminState {
  user: AdminUser | null
  loading: boolean
  autoLogoutEnabled: boolean
  logoutTimer: number // minutes
  lastActivity: number
  timeUntilLogout: number | null
  mobileSheetOpen: boolean
}

type AdminAction =
  | { type: "SET_USER"; payload: AdminUser | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_AUTO_LOGOUT"; payload: boolean }
  | { type: "SET_LOGOUT_TIMER"; payload: number }
  | { type: "UPDATE_ACTIVITY" }
  | { type: "SET_TIME_UNTIL_LOGOUT"; payload: number | null }
  | { type: "SET_MOBILE_SHEET"; payload: boolean }
  | { type: "LOAD_SETTINGS"; payload: { autoLogoutEnabled: boolean; logoutTimer: number } }

const AdminContext = createContext<{
  state: AdminState
  dispatch: React.Dispatch<AdminAction>
  updateActivity: () => void
  handleLogout: () => Promise<void>
} | null>(null)

function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload }
    case "SET_LOADING":
      return { ...state, loading: action.payload }
    case "SET_AUTO_LOGOUT":
      return { ...state, autoLogoutEnabled: action.payload }
    case "SET_LOGOUT_TIMER":
      return { ...state, logoutTimer: action.payload }
    case "UPDATE_ACTIVITY":
      return { ...state, lastActivity: Date.now() }
    case "SET_TIME_UNTIL_LOGOUT":
      return { ...state, timeUntilLogout: action.payload }
    case "SET_MOBILE_SHEET":
      return { ...state, mobileSheetOpen: action.payload }
    case "LOAD_SETTINGS":
      return {
        ...state,
        autoLogoutEnabled: action.payload.autoLogoutEnabled,
        logoutTimer: action.payload.logoutTimer,
      }
    default:
      return state
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, {
    user: null,
    loading: true,
    autoLogoutEnabled: true,
    logoutTimer: 30,
    lastActivity: Date.now(),
    timeUntilLogout: null,
    mobileSheetOpen: false,
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("hohenloher-admin-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        dispatch({ type: "LOAD_SETTINGS", payload: settings })
      } catch (error) {
        console.error("Error loading admin settings:", error)
      }
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const settings = {
        autoLogoutEnabled: state.autoLogoutEnabled,
        logoutTimer: state.logoutTimer,
      }
      localStorage.setItem("hohenloher-admin-settings", JSON.stringify(settings))
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [state.autoLogoutEnabled, state.logoutTimer])

  const updateActivity = useCallback(() => {
    dispatch({ type: "UPDATE_ACTIVITY" })
  }, [])

  const handleLogout = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()

    // Clear user state
    dispatch({ type: "SET_USER", payload: null })

    // Redirect to login
    const { useRouter } = await import("next/navigation")
    window.location.href = "/auth/login"
  }, [])

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      updateActivity,
      handleLogout,
    }),
    [state, updateActivity, handleLogout],
  )

  return <AdminContext.Provider value={contextValue}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider")
  }
  return context
}
