"use client"
import styles from "./page.module.css"
import PokeballAndLogo from "./components/PokeballAndLogo"
import { EmptyPokemonCombobox } from "./components/PokemonCombobox/EmptyPokemonCombobox"
import { getPokemonIcon } from "./utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useWindowDimensions } from "./hooks"

export default function Home() {
  const router = useRouter()

  const style: React.CSSProperties = {
    ["--color1" as any]: "#e54545",
    ["--color2" as any]: "#ce372f",
    ["--color3" as any]: "rgb(186, 43, 50)",
  }

  const randomNumbers = Array.from({ length: 1025 }, (_, i) => i + 1)
  const pokemonIcons = randomNumbers.map(getPokemonIcon)
  const iconProps = pokemonIcons.map((icon, idx) => {
    const gridWidth = 41
    const gridHeight = 25
    const cellWidth = 100 / gridWidth
    const cellHeight = 100 / gridHeight
    const row = Math.floor(idx / gridWidth)
    const col = idx % gridWidth
    const top = `${row * cellHeight}%`
    const left = `${col * cellWidth}%`
    return {
      background: icon,
      top,
      left,
    }
  })

  return (
    <div style={style} className={styles.appContainer}>
      <div className={styles.backgroundIconsContainer}>
        {pokemonIcons.map((icon, index) => {
          return (
            <div
              key={icon}
              className={styles.pokemonIcon}
              style={iconProps.at(index)}
            />
          )
        })}
      </div>
      <header>
        <PokeballAndLogo />
      </header>
      <main className={styles.main}>
        <div className={styles.mainText}>
          Discover your favorite Pokémon and their colors!
        </div>
        <EmptyPokemonCombobox />
        <div className={styles.buttonsContainer}>
          <Link href="/pokemon" className={styles.button}>
            Random Pokemon
          </Link>
          <Link href="/swatch" className={styles.button}>
            Create Swatch
          </Link>
        </div>
      </main>
    </div>
  )
}
