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
        Disclaimer: This is a fan-made project and is not affiliated with,
        endorsed, sponsored, or specifically approved by Nintendo, Game Freak,
        or The Pokémon Company. All Pokémon content, including names, images,
        and other associated media, are the property of their respective owners.
      </div>

      <div className={styles.credits}>
        Credits: Portions of this website utilize assets and code from the
        PokéRogue project, which is licensed under the AGPL-3.0 License. In
        accordance with this license, the source code for this website is
        available at:{" "}
        <a
          href="https://github.com/pjung16/pokeswatch"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
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
