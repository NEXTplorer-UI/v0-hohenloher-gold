/**
 * Zentrales Email-Layout für alle Südfrüchte Hohenlohe Emails
 * Definiert einheitliches Design: Logo, Farben, Fonts, Footer
 */

export interface BaseLayoutOptions {
  title: string
  preheader?: string
  headerColor?: string
  headerGradient?: string
  unsubscribeEmail?: string
}

export function wrapInBaseLayout(contentHtml: string, options: BaseLayoutOptions): string {
  const {
    title,
    preheader = "",
    headerColor = "#d4af37",
    headerGradient = "linear-gradient(135deg, #b8941f 0%, #d4af37 100%)",
    unsubscribeEmail,
  } = options

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hohenloher-gold.de"
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || `${siteUrl}/suedfruechte-hohenlohe-logo.png`

  const unsubscribeLink = unsubscribeEmail
    ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #4a5568;">
         <a href="${siteUrl}/newsletter/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}" style="color: ${headerColor};">
           Newsletter abbestellen
         </a>
       </p>`
    : ""

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${preheader ? `<meta name="description" content="${preheader}">` : ""}
  <title>${title}</title>
  <style>
    /* Reset & Base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f6f7f9;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Container */
    .email-wrapper {
      width: 100%;
      background: #f6f7f9;
      padding: 20px 0;
    }
    .email-container {
      max-width: 620px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    /* Header */
    .email-header {
      background: ${headerGradient};
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .email-logo {
      display: block;
      max-width: 180px;
      height: auto;
      margin: 0 auto 15px;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .email-header p {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.95;
    }
    
    /* Content */
    .email-content {
      padding: 30px 25px;
      background: white;
    }
    .email-content h2 {
      color: ${headerColor};
      font-size: 22px;
      margin: 0 0 15px 0;
    }
    .email-content h3 {
      color: ${headerColor};
      font-size: 18px;
      margin: 20px 0 10px 0;
    }
    .email-content p {
      margin: 0 0 15px 0;
      color: #333;
      line-height: 1.6;
    }
    
    /* Highlight Box */
    .highlight-box {
      background: #fef9e7;
      border-left: 4px solid ${headerColor};
      padding: 15px 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    /* Info Box */
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info-box h3 {
      margin-top: 0;
    }
    
    /* Data Section */
    .data-section {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .data-row {
      margin: 10px 0;
      display: flex;
      flex-wrap: wrap;
    }
    .data-label {
      font-weight: 600;
      color: #666;
      min-width: 150px;
      margin-right: 10px;
    }
    .data-value {
      color: #333;
      flex: 1;
    }
    
    /* Footer */
    .email-footer {
      background: #2d3748;
      color: #e2e8f0;
      padding: 25px 20px;
      text-align: center;
      font-size: 13px;
      line-height: 1.8;
    }
    .email-footer p {
      margin: 5px 0;
    }
    .email-footer a {
      color: ${headerColor};
      text-decoration: none;
    }
    .email-footer a:hover {
      text-decoration: underline;
    }
    
    /* Responsive */
    @media only screen and (max-width: 640px) {
      .email-container {
        border-radius: 0;
      }
      .email-content {
        padding: 20px 15px;
      }
      .data-row {
        flex-direction: column;
      }
      .data-label {
        min-width: auto;
        margin-bottom: 5px;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <img src="${logoUrl}" alt="Südfrüchte Hohenlohe" class="email-logo" />
        <h1>Südfrüchte Hohenlohe</h1>
        <p>${title}</p>
      </div>
      
      <div class="email-content">
        ${contentHtml}
      </div>
      
      <div class="email-footer">
        <p><strong>Südfrüchte Hohenlohe</strong></p>
        <p>Süßfrüchte aus Sizilien und Hohenlohe</p>
        <p>Weststraße 28 | 74629 Pfedelbach</p>
        <p>
          <a href="mailto:kontakt@suedfruechte-hohenlohe.de">kontakt@suedfruechte-hohenlohe.de</a> | 
          Tel: <a href="tel:+4915735703864">0157 357 038 64</a>
        </p>
        ${unsubscribeLink}
      </div>
    </div>
  </div>
</body>
</html>`
}
