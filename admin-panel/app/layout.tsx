import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BlitzRush Admin Panel",
  description: "Administrative dashboard for BlitzRush game management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
