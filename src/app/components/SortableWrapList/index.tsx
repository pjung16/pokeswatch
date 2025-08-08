import React from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { TColorData } from "@/app/types"
import CopyToClipboard from "../CopyToClipboard"
import {
  getContrastingBaseTextColor,
  getContrastingBrightness,
  getContrastingTextColor,
} from "@/app/color"
import { formattedColor } from "@/app/utils"
import styles from "./styles.module.css"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { CustomMouseSensor, CustomTouchSensor } from "./utils"

interface ISortableWrapListProps {
  colorData: TColorData[]
  setColorData: React.Dispatch<React.SetStateAction<TColorData[]>>
  colorFormat: "hex" | "rgb" | "hsl" | "hsv"
}

export default function SortableWrapList({
  colorData,
  setColorData,
  colorFormat,
}: ISortableWrapListProps) {
  const [items, setItems] = React.useState(colorData)

  const mouseSensor = useSensor(CustomMouseSensor)
  const touchSensor = useSensor(CustomTouchSensor)
  const sensors = useSensors(mouseSensor, touchSensor)

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.color === active.id)
      const newIndex = items.findIndex((i) => i.color === over.id)
      setItems(arrayMove(items, oldIndex, newIndex))
      setColorData(arrayMove(items, oldIndex, newIndex))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((cd) => cd.color)}
        strategy={rectSortingStrategy}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {items.slice(0, 10).map((cd) => (
            <SortableItem
              key={cd.color}
              id={cd.color}
              colorData={cd}
              colorFormat={colorFormat}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  colorData,
  colorFormat,
  id,
}: {
  colorData: TColorData
  id: string
  colorFormat: "hex" | "rgb" | "hsl" | "hsv"
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
    zIndex: isDragging ? 999 : "auto",
    boxShadow: isDragging ? "0 4px 8px rgba(0,0,0,0.2)" : "none",
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        style={{
          background: colorData.color,
          color: getContrastingTextColor(colorData.color),
        }}
        className={styles.colorBlock}
      >
        <CopyToClipboard
          key={colorData.color}
          text={
            colorFormat === "hex"
              ? formattedColor(colorData.color, colorFormat)
              : formattedColor(colorData.color, colorFormat).replace(
                  /[^0-9,#]/g,
                  ""
                )
          }
        >
          <div
            data-no-dnd="true"
            style={{
              color: getContrastingBaseTextColor(colorData.color),
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "10px",
              borderRadius: "4px",
              backgroundColor: colorData.color,
            }}
            className={
              getContrastingBrightness(colorData.color) === "120%"
                ? styles.swatchColorCopyLight
                : styles.swatchColorCopyDark
            }
          >
            {colorFormat === "hex"
              ? formattedColor(colorData.color, colorFormat)
              : formattedColor(colorData.color, colorFormat).replace(
                  /[^0-9,#]/g,
                  ""
                )}
            <ContentCopyIcon
              style={{ fontSize: "18px", marginLeft: "8px" }}
              className={styles.copyIcon}
            />
          </div>
        </CopyToClipboard>
      </div>
    </div>
  )
}
