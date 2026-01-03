# Supabase E-Mail-Vorlagen (Deutsch)

Diese Vorlagen können im Supabase Dashboard unter **Authentication → Email Templates** eingefügt werden.

---

## 1. Confirm Signup (Kontobestätigung)

**Subject:** Bestätigen Sie Ihre E-Mail-Adresse

**Body (HTML):**

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail-Adresse bestätigen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Südfrüchte Hohenlohe
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: 600;">
                Willkommen bei Südfrüchte Hohenlohe!
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Vielen Dank für Ihre Registrierung. Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      E-Mail-Adresse bestätigen
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:
              </p>
              <p style="margin: 10px 0 0; color: #10b981; font-size: 14px; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
              
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Wenn Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #1f2937; font-size: 14px; font-weight: 600; text-align: center;">
                Südfrüchte Hohenlohe
              </p>
              <p style="margin: 0 0 5px; color: #6b7280; font-size: 13px; text-align: center;">
                Weststraße 28 | 74629 Pfedelbach
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #10b981; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a> | 
                Tel: <a href="tel:+4915735703864" style="color: #10b981; text-decoration: none;">0157 357 038 64</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
\`\`\`

---

## 2. Reset Password (Passwort zurücksetzen)

**Subject:** Passwort zurücksetzen

**Body (HTML):**

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Passwort zurücksetzen</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 3px solid #10b981;">
              <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                Südfrüchte Hohenlohe
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 20px; font-weight: 600;">
                Passwort zurücksetzen
              </h2>
              
              <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Button unten, um ein neues Passwort festzulegen.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Neues Passwort festlegen
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Falls der Button nicht funktioniert, kopieren Sie bitte diesen Link in Ihren Browser:
              </p>
              <p style="margin: 10px 0 0; color: #10b981; font-size: 14px; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="margin: 30px 0; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  <strong>Wichtig:</strong> Dieser Link ist nur für kurze Zeit gültig. Wenn Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail bitte. Ihr Passwort bleibt dann unverändert.
                </p>
              </div>
              
              <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Aus Sicherheitsgründen empfehlen wir, ein starkes Passwort zu wählen, das mindestens 8 Zeichen lang ist und Buchstaben, Zahlen und Sonderzeichen enthält.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px; color: #1f2937; font-size: 14px; font-weight: 600; text-align: center;">
                Südfrüchte Hohenlohe
              </p>
              <p style="margin: 0 0 5px; color: #6b7280; font-size: 13px; text-align: center;">
                Weststraße 28 | 74629 Pfedelbach
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">
                <a href="mailto:kontakt@suedfruechte-hohenlohe.de" style="color: #10b981; text-decoration: none;">kontakt@suedfruechte-hohenlohe.de</a> | 
                Tel: <a href="tel:+4915735703864" style="color: #10b981; text-decoration: none;">0157 357 038 64</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
\`\`\`

---

## Anleitung zum Einfügen im Supabase Dashboard

1. Gehen Sie zu Ihrem Supabase Projekt Dashboard
2. Navigation: **Authentication** → **Email Templates**
3. Wählen Sie das entsprechende Template aus:
   - **Confirm signup** für die Kontobestätigung
   - **Reset Password** für das Passwort zurücksetzen
4. Kopieren Sie den HTML-Code aus diesem Dokument
5. Fügen Sie ihn in das Template-Feld ein
6. Ändern Sie den **Subject** (Betreff) wie oben angegeben
7. Klicken Sie auf **Save**

## Wichtige Hinweise

- Die Platzhalter `{{ .ConfirmationURL }}` werden automatisch von Supabase ersetzt
- Die E-Mails verwenden Inline-CSS für maximale Kompatibilität mit E-Mail-Clients
- Die Farben (#10b981 = Grün) passen zu Ihrem Branding
- Die E-Mails sind responsive und funktionieren auf allen Geräten

## Passwort-Zurücksetzen-Flow

**Ja, Sie haben eine vollständige Passwort-Zurücksetzen-Funktion:**

1. **Für Admin/Auth-Benutzer:**
   - Link: `/auth/forgot-password`
   - Benutzer gibt E-Mail ein
   - Erhält Supabase-E-Mail mit Link
   - Wird zu `/auth/reset-password` weitergeleitet
   - Setzt neues Passwort

2. **Für Kunden:**
   - Link: `/customer/forgot-password`
   - Gleicher Ablauf wie oben
   - Wird zu `/customer/reset-password` weitergeleitet

3. **Zugriff:**
   - Login-Seiten haben "Passwort vergessen?" Links
   - Funktioniert bereits, nur die E-Mails sind auf Englisch
