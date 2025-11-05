"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EmailTemplatesViewer() {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const { toast } = useToast()

  const copyToClipboard = async (html: string, templateName: string) => {
    try {
      await navigator.clipboard.writeText(html)
      setCopiedTemplate(templateName)
      toast({
        title: "Kopiert!",
        description: `${templateName} wurde in die Zwischenablage kopiert.`,
      })
      setTimeout(() => setCopiedTemplate(null), 2000)
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Konnte nicht in die Zwischenablage kopieren.",
        variant: "destructive",
      })
    }
  }

  const generalReplyTemplate = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Südfrüchte Hohenlohe</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #b8941f 0%, #d4af37 100%);">
                            <img src="${process.env.NEXT_PUBLIC_NEWS_LOGO_URL || process.env.NEXT_PUBLIC_LOGO_URL || "https://obxjafjbdxiipqfrmiou.supabase.co/storage/v1/object/public/branding/logo.png"}" alt="Südfrüchte Hohenlohe" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #d4af37; margin: 0 0 20px 0; font-size: 24px;">Guten Tag [KUNDENNAME],</h2>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0 0 15px 0;">
                                [IHR TEXT HIER]
                            </p>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0 0 15px 0;">
                                Bei Fragen stehen wir Ihnen gerne zur Verfügung.
                            </p>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0;">
                                Mit sonnigen Grüßen<br>
                                Ihr Team von Südfrüchte Hohenlohe
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px 20px; background-color: #2d3748; color: #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">
                                Südfrüchte Hohenlohe
                            </p>
                            <p style="margin: 5px 0; font-size: 13px; line-height: 1.8; color: #e2e8f0;">
                                Weststraße 28 | 74629 Pfedelbach
                            </p>
                            <p style="margin: 5px 0; font-size: 13px; line-height: 1.8; color: #e2e8f0;">
                                <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #d4af37; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a> | 
                                Tel: 0157 357 038 64
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

  const complaintReplyTemplate = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Südfrüchte Hohenlohe - Reklamation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #b8941f 0%, #d4af37 100%);">
                            <img src="${process.env.NEXT_PUBLIC_NEWS_LOGO_URL || process.env.NEXT_PUBLIC_LOGO_URL || "https://obxjafjbdxiipqfrmiou.supabase.co/storage/v1/object/public/branding/logo.png"}" alt="Südfrüchte Hohenlohe" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #d4af37; margin: 0 0 20px 0; font-size: 24px;">Sehr geehrte/r [KUNDENNAME],</h2>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0 0 15px 0;">
                                vielen Dank für Ihre Nachricht bezüglich [REKLAMATIONSGRUND].
                            </p>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0 0 15px 0;">
                                Es tut uns sehr leid, dass Sie mit [PRODUKT/DIENSTLEISTUNG] nicht zufrieden waren.
                            </p>
                            
                            <div style="background-color: #fef9e7; border-left: 4px solid #d4af37; padding: 15px; margin: 20px 0;">
                                <p style="color: #333333; line-height: 1.6; margin: 0;">
                                    <strong>Unsere Lösung:</strong><br>
                                    [IHRE LÖSUNG/ANTWORT HIER]
                                </p>
                            </div>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0 0 15px 0;">
                                Wir hoffen, dass wir Ihnen damit weiterhelfen konnten. Bei weiteren Fragen stehen wir Ihnen gerne zur Verfügung.
                            </p>
                            
                            <p style="color: #333333; line-height: 1.6; margin: 0;">
                                Mit freundlichen Grüßen<br>
                                Ihr Team von Südfrüchte Hohenlohe
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 25px 20px; background-color: #2d3748; color: #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: #e2e8f0;">
                                Südfrüchte Hohenlohe
                            </p>
                            <p style="margin: 5px 0; font-size: 13px; line-height: 1.8; color: #e2e8f0;">
                                Weststraße 28 | 74629 Pfedelbach
                            </p>
                            <p style="margin: 5px 0; font-size: 13px; line-height: 1.8; color: #e2e8f0;">
                                <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #d4af37; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a> | 
                                Tel: 0157 357 038 64
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-Mail Vorlagen für Ihr E-Mail-Programm
          </CardTitle>
          <CardDescription>
            Kopieren Sie diese HTML-Vorlagen und fügen Sie sie in Ihr E-Mail-Programm ein (Outlook, Gmail, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Allgemeine Antwort</TabsTrigger>
              <TabsTrigger value="complaint">Reklamation</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Allgemeine Kundenantwort</CardTitle>
                  <CardDescription>Für Standard-Kundenanfragen und allgemeine Korrespondenz</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => copyToClipboard(generalReplyTemplate, "Allgemeine Antwort")}
                      variant="default"
                      className="bg-primary"
                    >
                      {copiedTemplate === "Allgemeine Antwort" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          HTML kopieren
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2">Platzhalter zum Ersetzen:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[KUNDENNAME]</code> - Name des Kunden
                      </li>
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[IHR TEXT HIER]</code> - Ihr individueller
                        Nachrichtentext
                      </li>
                    </ul>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 text-sm font-medium">Vorschau:</div>
                    <div
                      className="p-4 bg-white overflow-auto max-h-96"
                      dangerouslySetInnerHTML={{ __html: generalReplyTemplate }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="complaint" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reklamations-Antwort</CardTitle>
                  <CardDescription>Für Beschwerden und Reklamationen</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => copyToClipboard(complaintReplyTemplate, "Reklamation")}
                      variant="default"
                      className="bg-primary"
                    >
                      {copiedTemplate === "Reklamation" ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Kopiert!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          HTML kopieren
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2">Platzhalter zum Ersetzen:</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[KUNDENNAME]</code> - Name des Kunden
                      </li>
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[REKLAMATIONSGRUND]</code> - Grund der
                        Reklamation
                      </li>
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[PRODUKT/DIENSTLEISTUNG]</code> - Betroffenes
                        Produkt
                      </li>
                      <li>
                        <code className="bg-background px-2 py-1 rounded">[IHRE LÖSUNG/ANTWORT HIER]</code> - Ihre
                        Lösung
                      </li>
                    </ul>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 text-sm font-medium">Vorschau:</div>
                    <div
                      className="p-4 bg-white overflow-auto max-h-96"
                      dangerouslySetInnerHTML={{ __html: complaintReplyTemplate }}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Anleitung zur Verwendung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Outlook:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Klicken Sie auf "HTML kopieren"</li>
                  <li>Öffnen Sie eine neue E-Mail in Outlook</li>
                  <li>Klicken Sie auf "Einfügen" → "Als HTML einfügen"</li>
                  <li>Ersetzen Sie die Platzhalter mit Ihren Inhalten</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Gmail:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Klicken Sie auf "HTML kopieren"</li>
                  <li>Öffnen Sie eine neue E-Mail in Gmail</li>
                  <li>Drücken Sie Strg+Shift+V (Windows) oder Cmd+Shift+V (Mac) zum Einfügen</li>
                  <li>Ersetzen Sie die Platzhalter mit Ihren Inhalten</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Apple Mail:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
                  <li>Klicken Sie auf "HTML kopieren"</li>
                  <li>Öffnen Sie eine neue E-Mail in Apple Mail</li>
                  <li>Drücken Sie Cmd+V zum Einfügen</li>
                  <li>Ersetzen Sie die Platzhalter mit Ihren Inhalten</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
