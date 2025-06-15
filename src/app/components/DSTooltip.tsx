import React from "react"
import { styled } from "@mui/material/styles"
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip"
import { getContrastingTextColor } from "../color"

type TTooltipProps = TooltipProps & {
  tooltipColor: string
}

export const DSTooltip = styled(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ className, tooltipColor, ...props }: TTooltipProps) => (
    <Tooltip {...props} arrow classes={{ popper: className }} />
  )
)((props) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: "white",
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: props.tooltipColor,
    width: "250px",
    color: getContrastingTextColor(props.tooltipColor),
    textAlign: "center",
    padding: "10px",
    borderTop: "2px solid #fff",
    borderBottom: "2px solid #fff",
    boxShadow: "4px 0 0 -2px #fff, -4px 0 0 -2px #fff",
    zIndex: "99",
    borderRadius: "0",
    fontSize: "16px",
    fontFamily: "inherit",
  },
}))
