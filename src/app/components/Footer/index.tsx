import React from "react"
import Link from "next/link"
import styles from "./styles.module.css"

const Footer: React.FC<{ shouldCenter?: boolean }> = ({ shouldCenter }) => {
  return (
    <footer
      className={styles.footer}
      style={{ margin: shouldCenter ? "0 auto" : "" }}
    >
      <div className={styles.sitemap}>
        <h3>Quick Links</h3>
        <div className={styles.sitemapLinks}>
          <Link href="/" className={styles.sitemapLink}>
            Home
          </Link>
          <Link href="/pokemon" className={styles.sitemapLink}>
            Random Pokémon
          </Link>
          <Link href="/swatch" className={styles.sitemapLink}>
            Create Swatch
          </Link>
          <Link href="/game" className={styles.sitemapLink}>
            Color Guessing Game
          </Link>
          <Link href="/color-swapper" className={styles.sitemapLink}>
            Color Swapper
          </Link>
        </div>
      </div>

      <div className={styles.disclaimer}>
        PokeSwatch is not affiliated with Nintendo, Game Freak, or The Pokémon Company. 
        Pokémon content is the property of their respective owners. Data from{" "}
        <a
          href="https://pokeapi.co/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          PokeAPI
        </a>,{" "}
        sprites by{" "}
        <a
          href="https://www.deviantart.com/kingofthe-x-roads"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          KingOfThe-X-Roads
        </a>,{" "}
        <a
          href="https://www.youtube.com/@RetroNC"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          RetroNC
        </a>, and{" "}
        <a
          href="https://www.smogon.com/forums/threads/smogon-sprite-project.3647722/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Smogon Sprite Project
        </a> 
        , and assets from{" "}
        <a
          href="https://github.com/pagefaultgames/pokerogue-assets"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          PokéRogue 
        </a> (AGPL-3.0 License).
        Source:{" "}
        <a
          href="https://github.com/pjung16/pokeswatch"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          https://github.com/pjung16/pokeswatch
        </a>  
      </div>

      <div className={styles.copyright}>
        © 2025 PokeSwatch. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
