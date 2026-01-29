"use client"

import React from "react"
import {
  Button,
  Menu,
  MenuItem,
  ListSubheader,
  Divider,
} from "@mui/material"
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts"
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined"
import { useAuth } from "@/app/hooks/useAuth"
import { TColorFormat } from "@/app/types"

interface SettingsMenuProps {
  iconColor?: string
  className?: string
  // Color format settings
  colorFormat?: TColorFormat
  setColorFormat?: (format: TColorFormat) => void
  // Animation settings
  showAnimations?: boolean
  setShowAnimations?: (fn: (prev: boolean) => boolean) => void
  // Pokemon audio settings
  playPokemonCries?: boolean
  setPlayPokemonCries?: (fn: (prev: boolean) => boolean) => void
}

export default function SettingsMenu({
  iconColor = "black",
  className,
  colorFormat,
  setColorFormat,
  showAnimations,
  setShowAnimations,
  playPokemonCries,
  setPlayPokemonCries,
}: SettingsMenuProps) {
  const { user, isAuthenticated, login, logout, loading } = useAuth()

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const showColorFormat = colorFormat !== undefined && setColorFormat !== undefined
  const showAnimationsSection = showAnimations !== undefined && setShowAnimations !== undefined
  const showAudioSection = playPokemonCries !== undefined && setPlayPokemonCries !== undefined

  return (
    <>
      <Button
        id="settings-button"
        className={className}
        aria-controls={open ? "settings-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        size="small"
        disableRipple
      >
        {isAuthenticated ? (
          <ManageAccountsIcon fontSize="inherit" htmlColor={iconColor} />
        ) : (
          <ManageAccountsOutlinedIcon fontSize="inherit" htmlColor={iconColor} />
        )}
      </Button>
      <Menu
        id="settings-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{
          vertical: -10,
          horizontal: 85,
        }}
        MenuListProps={{
          "aria-labelledby": "settings-button",
        }}
        sx={{
          padding: "50px",
        }}
      >
        <ListSubheader key="account-header">Account</ListSubheader>
        {isAuthenticated
          ? [
              <MenuItem key="user-email" disabled sx={{ opacity: 1, fontSize: "0.85rem" }}>
                {user?.email}
              </MenuItem>,
              <MenuItem
                key="sign-out"
                onClick={() => {
                  logout()
                  handleClose()
                }}
              >
                Sign Out
              </MenuItem>,
            ]
          : <MenuItem
              key="sign-in"
              onClick={() => {
                login()
                handleClose()
              }}
              disabled={loading}
            >
              Sign in with Google
            </MenuItem>
        }

        {showColorFormat && [
          <Divider key="color-divider" />,
          <ListSubheader key="color-header">Color Format</ListSubheader>,
          <MenuItem key="hex" onClick={() => setColorFormat("hex")}>Hex</MenuItem>,
          <MenuItem key="rgb" onClick={() => setColorFormat("rgb")}>RGB</MenuItem>,
          <MenuItem key="hsl" onClick={() => setColorFormat("hsl")}>HSL</MenuItem>,
          <MenuItem key="hsv" onClick={() => setColorFormat("hsv")}>HSV</MenuItem>,
        ]}

        {showAnimationsSection && [
          <Divider key="animations-divider" />,
          <ListSubheader key="animations-header">Show Animations</ListSubheader>,
          <MenuItem key="animations-toggle" onClick={() => setShowAnimations((prev: boolean) => !prev)}>
            {showAnimations ? "Hide" : "Show"}
          </MenuItem>,
        ]}

        {showAudioSection && [
          <Divider key="audio-divider" />,
          <ListSubheader key="audio-header">Play Pokemon Audio</ListSubheader>,
          <MenuItem key="audio-toggle" onClick={() => setPlayPokemonCries((prev: boolean) => !prev)}>
            {playPokemonCries ? "No" : "Yes"}
          </MenuItem>,
        ]}
      </Menu>
    </>
  )
}
