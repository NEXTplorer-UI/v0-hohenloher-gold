"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAdminCache } from "@/hooks/use-admin-cache"

interface AdminNotification {
  id: string
  type: string
  severity: "info" | "warning" | "error" | "critical"
  title: string
  message: string
  metadata: any
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
}

interface PendingEmail {
  id: string
  order_id: string
  email_to: string
  email_type: string
  retry_count: number
  max_retries: number
  scheduled_for: string
  last_error: string | null
  created_at: string
  orders?: {
    order_number: string
  }
}

export function ErrorLogsComponent() {
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refresh: refreshNotifications,
    mutate: mutateNotifications,
  } = useAdminCache<{ notifications: AdminNotification[] }>("/api/admin/notifications?filter=unresolved")

  const {
    data: emailsData,
    isLoading: emailsLoading,
    refresh: refreshEmails,
    mutate: mutateEmails,
  } = useAdminCache<{ emails: PendingEmail[] }>("/api/admin/pending-emails")

  const notifications = notificationsData?.notifications || []
  const pendingEmails = emailsData?.emails || []
  const loading = notificationsLoading || emailsLoading

  const [filter, setFilter] = useState<"all" | "unresolved">("unresolved")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<"resolved" | "all">("resolved")

  const loadData = async () => {
    await Promise.all([refreshNotifications(), refreshEmails()])
  }

  async function resolveNotification(id: string) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}/resolve`, {
        method: "POST",
      })

      if (res.ok) {
        mutateNotifications(
          (current) => ({
            notifications: current?.notifications.map((n) => (n.id === id ? { ...n, is_resolved: true } : n)) || [],
          }),
          false,
        )
        await refreshNotifications()
      }
    } catch (error) {
      console.error("Failed to resolve notification:", error)
    }
  }

  async function retryEmail(id: string) {
    try {
      const res = await fetch(`/api/admin/pending-emails/${id}/retry`, {
        method: "POST",
      })

      if (res.ok) {
        mutateEmails((current) => ({ emails: current?.emails.filter((e) => e.id !== id) || [] }), false)
        await refreshEmails()
      }
    } catch (error) {
      console.error("Failed to retry email:", error)
    }
  }

  async function deleteNotifications() {
    try {
      const res = await fetch(`/api/admin/notifications/delete?type=${deleteType}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setDeleteDialogOpen(false)
        if (deleteType === "all") {
          mutateNotifications({ notifications: [] }, false)
        } else {
          mutateNotifications(
            (current) => ({ notifications: current?.notifications.filter((n) => !n.is_resolved) || [] }),
            false,
          )
        }
        await refreshNotifications()
      }
    } catch (error) {
      console.error("Failed to delete notifications:", error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return "destructive"
      case "warning":
        return "default"
      case "info":
        return "secondary"
      default:
        return "default"
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "error":
        return <XCircle className="h-4 w-4" />
      case "warning":
        return <AlertCircle className="h-4 w-4" />
      case "info":
        return <CheckCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
          <Button
            onClick={() => {
              setDeleteType("resolved")
              setDeleteDialogOpen(true)
            }}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Gelöste löschen
          </Button>
          <Button
            onClick={() => {
              setDeleteType("all")
              setDeleteDialogOpen(true)
            }}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Alle löschen
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications">
            Benachrichtigungen
            {notifications.filter((n) => !n.is_resolved).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {notifications.filter((n) => !n.is_resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails">
            Ausstehende E-Mails
            {pendingEmails.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingEmails.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={filter === "unresolved" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unresolved")}
            >
              Ungelöst
            </Button>
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
              Alle
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Lade Benachrichtigungen...</p>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Keine Benachrichtigungen gefunden</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card key={notification.id} className={notification.is_resolved ? "opacity-60" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(notification.severity)}
                        <div>
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant={getSeverityColor(notification.severity)}>{notification.severity}</Badge>
                            <span className="text-xs">{new Date(notification.created_at).toLocaleString("de-DE")}</span>
                          </CardDescription>
                        </div>
                      </div>
                      {!notification.is_resolved && (
                        <Button size="sm" variant="outline" onClick={() => resolveNotification(notification.id)}>
                          Als gelöst markieren
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{notification.message}</p>
                    {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Details anzeigen
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                          {JSON.stringify(notification.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Lade ausstehende E-Mails...</p>
              </CardContent>
            </Card>
          ) : pendingEmails.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">Keine ausstehenden E-Mails</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingEmails.map((email) => (
                <Card key={email.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {email.email_type === "order_confirmation" ? "Bestellbestätigung" : email.email_type}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <span>Bestellung: {email.orders?.order_number || "N/A"}</span>
                          <span>•</span>
                          <span>{email.email_to}</span>
                        </CardDescription>
                      </div>
                      <Button size="sm" onClick={() => retryEmail(email.id)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Erneut senden
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Geplant: {new Date(email.scheduled_for).toLocaleString("de-DE")}
                      </div>
                      <div>
                        Versuche: {email.retry_count} / {email.max_retries}
                      </div>
                    </div>
                    {email.last_error && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded text-sm text-destructive">
                        Letzter Fehler: {email.last_error}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logs löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "resolved"
                ? "Möchten Sie alle gelösten Benachrichtigungen löschen?"
                : "Möchten Sie ALLE Benachrichtigungen löschen? Diese Aktion kann nicht rückgängig gemacht werden."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={deleteNotifications}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
