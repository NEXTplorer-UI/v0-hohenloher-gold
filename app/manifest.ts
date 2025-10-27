import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL || "/placeholder.svg?height=512&width=512"

  return {
    name: "Hohenloher Gold - Regionale Lebensmittel & Sizilianische Südfrüchte",
    short_name: "Hohenloher Gold",
    description: "Hochwertige, unbehandelte Lebensmittel aus Hohenlohe und frische Südfrüchte direkt aus Sizilien.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#16a34a",
    icons: [
      {
        src: logoUrl,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: logoUrl,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["food", "shopping", "business"],
    lang: "de",
    orientation: "portrait-primary",
  }
}
