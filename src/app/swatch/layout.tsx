"use client"

import classNames from "classnames"
import React from "react"
import styles from "./styles.module.css"
import ShuffleIcon from "@mui/icons-material/Shuffle"
import { SwatchPageProvider, useSwatchPageContext } from "./SwatchPageContext"
import Link from "next/link"
import PokeballAndLogo from "../components/PokeballAndLogo"
import SettingsMenu from "../components/SettingsMenu"

export default function SwatchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SwatchPageProvider>
      <SwatchInnerLayout>{children}</SwatchInnerLayout>
    </SwatchPageProvider>
  )
}

function SwatchInnerLayout({ children }: { children: React.ReactNode }) {
  const { colorFormat, setColorFormat, showAnimations, setShowAnimations } =
    useSwatchPageContext()

  const style: React.CSSProperties = {
    ["--color1" as any]: "#e54545",
    ["--color2" as any]: "#ce372f",
    ["--color3" as any]: "rgb(186, 43, 50)",
  }

  return (
    <div style={style}>
      <header className={styles.appHeader}>
        <PokeballAndLogo />
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link
            className={classNames(
              styles.buttonSwatchPage,
              styles.randomizeButton
            )}
            href="/swatch"
          >
            Randomize
          </Link>
          <a
            className={classNames(
              styles.buttonSwatchPage,
              styles.supportButton
            )}
            href="https://buymeacoffee.com/pjung16"
            target="_blank"
            rel="noreferrer"
          >
            Support 🍕
          </a>
          <Link
            className={classNames(
              styles.mobileButtonSwatchPage,
              styles.randomizeButton
            )}
            href={"/swatch"}
          >
            <ShuffleIcon />
          </Link>
          <a
            className={classNames(
              styles.mobileButtonSwatchPage,
              styles.supportButton
            )}
            href="https://buymeacoffee.com/pjung16"
            target="_blank"
            rel="noreferrer"
          >
            🍕
          </a>
          <SettingsMenu
            className={styles.settingsIconSwatchPage}
            iconColor="black"
            colorFormat={colorFormat}
            setColorFormat={setColorFormat}
            showAnimations={showAnimations}
            setShowAnimations={setShowAnimations}
          />
        </div>
      </header>
      <div>{children}</div>
    </div>
  )
}
