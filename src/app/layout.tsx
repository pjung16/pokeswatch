import type { Metadata } from "next"
import "./globals.css"
import { Inconsolata, Sen } from "next/font/google"

const inconsolata = Inconsolata({
  variable: "--font-inconsolata",
  subsets: ["latin"],
})
const sen = Sen({
  variable: "--font-sen",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PokeSwatch | Get Color Swatches from Pokemon",
  description:
    "Get the color swatches of your favorite Pokemon and generate color palettes from any Pokemon.",
  keywords: [
    "pokemon",
    "color palette",
    "design",
    "color scheme",
    "pokemon colors",
    "color inspiration",
  ],
  authors: [{ name: "Philip Jung" }],
  creator: "Philip Jung",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inconsolata.variable} ${sen.variable}`}>
        {children}
      </body>
    </html>
  )
}
