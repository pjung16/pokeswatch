"use client"
import styles from "./page.module.css"
import PokeballAndLogo from "./components/PokeballAndLogo"
import SettingsMenu from "./components/SettingsMenu"
import { EmptyPokemonCombobox } from "./components/PokemonCombobox/EmptyPokemonCombobox"
import { getPokemonIcon } from "./utils"
import Link from "next/link"

export default function Home() {
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
      <header style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
        <PokeballAndLogo />
        <SettingsMenu className={styles.settingsIcon} iconColor="black" />
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
          <Link href="/game" className={styles.button}>
            Color Guessing Game
          </Link>
          <Link href="/color-swapper" className={styles.button}>
            Color Swapper
          </Link>
        </div>
      </main>
    </div>
  )
}
