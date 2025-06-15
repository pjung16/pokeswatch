// app/swatch/page.tsx
import SwatchRedirector from "./SwatchRedirector"

export const metadata = {
  title: "Pokémon Swatch",
  description: "Explore Pokémon palettes and swatches.",
}

export default function SwatchPage() {
  return (
    <div>
      {/* <h1>Pokémon Swatch</h1> */}
      <SwatchRedirector />
    </div>
  )
}
