import * as React from "react"
import Box from "@mui/material/Box"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import FormControl from "@mui/material/FormControl"
import Select, { SelectChangeEvent } from "@mui/material/Select"
import { Button, Menu } from "@mui/material"
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import { getContrastingBaseTextColor } from "../color"

interface IColorDropdownProps {
  colors: string[]
  selectedColor: string
  onColorChange: (color: string) => void
}

export default function ColorDropdown({
  colors,
  selectedColor,
  onColorChange,
}: IColorDropdownProps) {
  const [color, setColor] = React.useState(selectedColor)

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleChange = (event: SelectChangeEvent) => {
    setColor(event.target.value as string)
  }

  return (
    <div>
      <Button
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={handleClick}
        size="small"
        disableRipple
        sx={{ width: 30, height: 30, minWidth: 30, minHeight: 30, padding: 0 }}
      >
        <ArrowDropDownIcon
          style={{ color: getContrastingBaseTextColor(color) }}
        />
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
        {colors.map((colorOption) => (
          <MenuItem
            key={colorOption}
            value={colorOption}
            onClick={() => {
              setColor(colorOption)
              onColorChange(colorOption)
              handleClose()
            }}
            sx={{
              backgroundColor: colorOption,
              color: getContrastingBaseTextColor(colorOption),
              fontFamily: "Inconsolata",
              fontWeight: "bold",
            }}
          >
            {colorOption}
          </MenuItem>
        ))}
      </Menu>
    </div>
  )
}
