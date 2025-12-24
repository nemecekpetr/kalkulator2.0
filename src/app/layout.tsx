import type { Metadata } from "next"
import { Nunito_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Konfigurator bazenu | Rentmil",
  description: "Nakonfigurujte si vas novy bazen online. Rentmil - Vas bazenovy mistr s 23 lety zkusenosti.",
  keywords: ["bazen", "konfigurator", "rentmil", "plastovy bazen", "zahradni bazen"],
  authors: [{ name: "Rentmil s.r.o." }],
  openGraph: {
    title: "Konfigurator bazenu | Rentmil",
    description: "Nakonfigurujte si vas novy bazen online. Rentmil - Vas bazenovy mistr s 23 lety zkusenosti.",
    type: "website",
    locale: "cs_CZ",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="cs">
      <body className={`${nunitoSans.variable} antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
