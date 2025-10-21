import type { Metadata } from "next"
import ClientPage from "./ClientPage"

export const metadata: Metadata = {
  title: "Hohenloher Gold - Natürliche Qualität aus Hohenlohe | Sizilianische Südfrüchte",
  description:
    "Entdecken Sie unbehandelte Lebensmittel und frische Südfrüchte direkt vom Erzeuger. Bio-Qualität aus Hohenlohe und Sizilien ohne Zertifizierungszwang.",
  keywords: [
    "Hohenloher Gold",
    "natürliche Lebensmittel",
    "sizilianische Südfrüchte",
    "Bio ohne Zertifikat",
    "Direktvermarkter Hohenlohe",
    "unbehandelte Früchte",
    "nachhaltige Ernährung",
  ],
  openGraph: {
    title: "Hohenloher Gold - Natürliche Qualität aus Hohenlohe",
    description: "Entdecken Sie unbehandelte Lebensmittel und frische Südfrüchte direkt vom Erzeuger.",
    images: ["/fresh-sicilian-oranges-and-lemons-in-wooden-crates.png"],
  },
}

export default function HomePage() {
  return <ClientPage />
}
