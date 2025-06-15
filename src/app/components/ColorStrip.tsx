import React, { useState } from "react"
import { TColorData } from "../types"
import { DSTooltip } from "../components/DSTooltip"
import CopyToClipboard from "../components/CopyToClipboard"

const ColorStrip = ({
  data,
  height = 40,
  width = 300,
  tooltipTextFormatter,
}: {
  data: TColorData[]
  height?: number
  width?: number | string
  tooltipTextFormatter: (color: string) => string
}) => {
  const [showEqualWidth, setShowEqualWidth] = useState<boolean>(false)

  return (
    <div
      style={{
        display: "flex",
        height: `${height}px`,
        width: typeof width === "number" ? `${width}px` : width,
        border: "1px solid #000",
        borderRadius: "0px",
        overflow: "hidden",
        cursor: "pointer",
      }}
      onClick={() => setShowEqualWidth((prev) => !prev)}
    >
      {data.map(({ color, percentage }) => (
        <CopyToClipboard key={color} text={tooltipTextFormatter(color)}>
          <DSTooltip
            tooltipColor={color ?? "#000"}
            title={
              <>
                <div>{tooltipTextFormatter(color)}</div>
                <div>{percentage.toFixed(1)}%</div>
              </>
            }
            placement={"top"}
            arrow
          >
            <div
              style={{
                backgroundColor: color,
                width: `${showEqualWidth ? 100 / data.length : percentage}%`,
                height: "100%",
                transition: "width 0.1s ease-in-out",
              }}
            />
          </DSTooltip>
        </CopyToClipboard>
      ))}
    </div>
  )
}

export default ColorStrip
