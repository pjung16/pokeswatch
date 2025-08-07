"use client"

import { Button, Menu, MenuItem, ListSubheader } from "@mui/material"
import classNames from "classnames"
import React from "react"
import styles from "./[pokemonList]/styles.module.css"
import { useRouter } from "next/navigation"
import { speciesToOptions } from "../utils"
import species from "../species.json"
import SettingsIcon from "@mui/icons-material/Settings"
import ShuffleIcon from "@mui/icons-material/Shuffle"
import { SwatchPageProvider, useSwatchPageContext } from "./SwatchPageContext"
import Link from "next/link"
import PokeballAndLogo from "../components/PokeballAndLogo"

const autocompleteOptions = speciesToOptions(species)

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
  const router = useRouter()
  const { colorFormat, setColorFormat, showAnimations, setShowAnimations } =
    useSwatchPageContext()

  const chooseRandomPokemon = () => {
    const randomNumber = Math.floor(Math.random() * 1025) + 1
    const randomPokemon = autocompleteOptions.find(
      (ao) => ao.id === randomNumber
    )
    if (randomPokemon) {
      router.push(`/pokemon/${randomPokemon.label}`)
    }
  }

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

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
          <Button
            id="basic-button"
            className={styles.settingsIconSwatchPage}
            aria-controls={open ? "basic-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={handleClick}
            size="small"
            disableRipple
          >
            <SettingsIcon fontSize="inherit" htmlColor="black" />
          </Button>
          <Menu
            id="basic-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            transformOrigin={{
              vertical: -10,
              horizontal: 85,
            }}
            MenuListProps={{
              "aria-labelledby": "basic-button",
            }}
            sx={{
              padding: "50px",
            }}
          >
            <ListSubheader>Color Format</ListSubheader>
            <MenuItem onClick={() => setColorFormat("hex")}>Hex</MenuItem>
            <MenuItem
              onClick={() => {
                setColorFormat("rgb")
              }}
            >
              RGB
            </MenuItem>
            <MenuItem onClick={() => setColorFormat("hsl")}>HSL</MenuItem>
            <MenuItem onClick={() => setColorFormat("hsv")}>HSV</MenuItem>
            <ListSubheader>Show Animations</ListSubheader>
            <MenuItem
              onClick={() => setShowAnimations((prev: boolean) => !prev)}
            >
              {showAnimations ? "Hide" : "Show"}
            </MenuItem>
          </Menu>
        </div>
      </header>
      <div>{children}</div>
    </div>
  )
}
