"use client"

import React from "react"
import styles from "./styles.module.css"
import classNames from "classnames"
import { navigateToRandomPokemon, speciesToOptions } from "@/app/utils"
import species from "../../species.json"
import { useRouter } from "next/navigation"
import Link from "next/link"

const autocompleteOptions = speciesToOptions(species)

interface IProps {
  isHomePage?: boolean
}

const PokeballAndLogo = ({ isHomePage }: IProps) => {
  const router = useRouter()

  return (
    <div className={styles.pokeballandLogoContainer}>
      <div
        className={classNames(
          styles.pokeball,
          styles.pbHyper,
          isHomePage && styles.homepagepokeball
        )}
        onClick={() => navigateToRandomPokemon(autocompleteOptions, router)}
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
