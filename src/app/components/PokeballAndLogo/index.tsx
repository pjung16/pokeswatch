"use client"

import React from "react"
import styles from "./styles.module.css"
import classNames from "classnames"
import { navigateToRandomPokemon } from "@/app/utils"
import speciesMap from "../../speciesMap.json"
import { useRouter } from "next/navigation"
import Link from "next/link"

const PokeballAndLogo = () => {
  const router = useRouter()

  return (
    <div className={styles.pokeballandLogoContainer}>
      <div
        className={classNames(styles.pokeball, styles.pbHyper)}
        onClick={() => navigateToRandomPokemon(speciesMap, router)}
      >
        <div className={styles.top}></div>
        <div className={styles.button} />
      </div>
      <Link href="/">
        <h1 className={styles.logo}>PokeSwatch</h1>
      </Link>
    </div>
  )
}

export default PokeballAndLogo
