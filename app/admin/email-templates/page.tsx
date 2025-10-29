import { EmailTemplateViewer } from "@/components/admin/email-template-viewer"

const generalReplyTemplate = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Südfrüchte Hohenlohe</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%);">
                            <img src="${process.env.NEXT_PUBLIC_LOGO_URL || "https://obxjafjbdxiipqfrmiou.supabase.co/storage/v1/object/public/branding/logo_white.png"}" alt="Südfrüchte Hohenlohe" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Guten Tag,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                <strong>[HIER IHREN TEXT EINFÜGEN]</strong>
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Bei Fragen stehen wir Ihnen gerne zur Verfügung.
                            </p>
                            
                            <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Mit sonnigen Grüßen<br>
                                Ihr Team von Südfrüchte Hohenlohe
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f8f8; border-top: 3px solid #d4a574;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="text-align: center; color: #666666; font-size: 14px; line-height: 1.6;">
                                        <strong style="color: #2d5016;">Südfrüchte Hohenlohe</strong><br>
                                        E-Mail: <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #2d5016; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a><br>
                                        Web: <a href="https://suedfruechte-hohenlohe.de" style="color: #2d5016; text-decoration: none;">suedfruechte-hohenlohe.de</a>
                                    </td>
                                </tr>
                            </table>
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 30px; text-align: center; background: linear-gradient(135deg, #2d5016 0%, #4a7c2c 100%);">
                            <img src="${process.env.NEXT_PUBLIC_LOGO_URL || "https://obxjafjbdxiipqfrmiou.supabase.co/storage/v1/object/public/branding/logo_white.png"}" alt="Südfrüchte Hohenlohe" style="max-width: 200px; height: auto;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #2d5016; font-size: 24px;">
                                Ihre Reklamation
                            </h2>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Guten Tag,
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                vielen Dank für Ihre Nachricht. Es tut uns sehr leid, dass Sie mit Ihrer Bestellung nicht zufrieden waren.
                            </p>
                            
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                <strong>[HIER IHRE ANTWORT ZUR REKLAMATION EINFÜGEN]</strong>
                            </p>
                            
                            <div style="margin: 20px 0; padding: 20px; background-color: #f0f7ed; border-left: 4px solid #2d5016;">
                                <p style="margin: 0; color: #2d5016; font-size: 14px; line-height: 1.6;">
                                    <strong>Hinweis:</strong> Ihre Zufriedenheit ist uns wichtig. Sollten Sie weitere Fragen haben, melden Sie sich gerne bei uns.
                                </p>
                            </div>
                            
                            <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                Mit freundlichen Grüßen<br>
                                Ihr Team von Südfrüchte Hohenlohe
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f8f8; border-top: 3px solid #d4a574;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="text-align: center; color: #666666; font-size: 14px; line-height: 1.6;">
                                        <strong style="color: #2d5016;">Südfrüchte Hohenlohe</strong><br>
                                        E-Mail: <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #2d5016; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a><br>
                                        Web: <a href="https://suedfruechte-hohenlohe.de" style="color: #2d5016; text-decoration: none;">suedfruechte-hohenlohe.de</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

export default function EmailTemplatesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">E-Mail-Vorlagen</h1>
        <p className="text-muted-foreground">
          Hier finden Sie vorgefertigte E-Mail-Vorlagen für die Kundenkommunikation. Klicken Sie auf "HTML kopieren" um
          die Vorlage in Ihr E-Mail-Programm einzufügen.
        </p>
      </div>

      <div className="space-y-6">
        <EmailTemplateViewer
          title="Allgemeine Kundenantwort"
          description="Verwenden Sie diese Vorlage für allgemeine Antworten auf Kundenanfragen."
          htmlContent={generalReplyTemplate}
        />

        <EmailTemplateViewer
          title="Reklamationsantwort"
          description="Verwenden Sie diese Vorlage für Antworten auf Reklamationen und Beschwerden."
          htmlContent={complaintReplyTemplate}
        />
      </div>

      <div className="mt-8 p-6 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">💡 Anleitung</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Wählen Sie die gewünschte Vorlage aus</li>
          <li>Klicken Sie auf "HTML kopieren"</li>
          <li>Öffnen Sie eine neue E-Mail in Ihrem E-Mail-Programm</li>
          <li>Wechseln Sie zur HTML-Ansicht (in Outlook: Einfügen → Text → HTML)</li>
          <li>Fügen Sie den kopierten HTML-Code ein</li>
          <li>Ersetzen Sie den Platzhalter-Text mit Ihrem individuellen Inhalt</li>
        </ol>
      </div>
    </div>
  )
}
