import React from "react"
import { FixedSizeList, ListChildComponentProps } from "react-window"
import { autocompleteClasses } from "@mui/material/Autocomplete"
import classNames from "classnames"

const LISTBOX_PADDING = 8
const ITEM_HEIGHT = 36

function renderRow(props: ListChildComponentProps) {
  const { data, index, style } = props
  const option = data[index]

  // Merge MUI's option class with any existing className
  const optionClassName = classNames(
    option.props.className,
    autocompleteClasses.option
  )

  return React.cloneElement(option, {
    className: optionClassName,
    style: {
      ...style,
      top: (style.top as number) + LISTBOX_PADDING,
      // Remove custom styles that override MUI's option styling
      position: "absolute",
      // Don't set display or marginLeft here
    },
  })
}

const ListboxComponent = React.forwardRef<HTMLUListElement, any>(
  function ListboxComponent(props, ref) {
    const { children, className, ...other } = props
    const itemData = React.Children.toArray(children)
    const itemCount = itemData.length
    const height = Math.min(8, itemCount) * ITEM_HEIGHT + 2 * LISTBOX_PADDING

    // Find the selected index
    const selectedIndex = itemData.findIndex(
      (child: any) => child.props && child.props["aria-selected"]
    )
    const initialScrollOffset =
      selectedIndex >= 0 ? selectedIndex * ITEM_HEIGHT : 0

    const OuterElementContext = React.createContext({})

    const OuterElementType = React.forwardRef<
      HTMLUListElement,
      React.HTMLAttributes<HTMLUListElement>
    >((props, ref) => {
      const outerProps = React.useContext(OuterElementContext)
      return (
        <ul
          ref={ref}
          className={classNames(autocompleteClasses.listbox, className)}
          role="listbox"
          {...outerProps}
          {...props}
          style={{
            padding: 0,
            margin: 0,
            position: "relative",
            listStyle: "none",
            height,
            ...props.style,
          }}
        />
      )
    })

    return (
      <OuterElementContext.Provider value={other}>
        <FixedSizeList
          height={height}
          width="100%"
          itemSize={ITEM_HEIGHT}
          itemCount={itemCount}
          itemData={itemData}
          innerElementType="ul"
          outerElementType={OuterElementType}
          overscanCount={5}
          initialScrollOffset={initialScrollOffset}
        >
          {renderRow}
        </FixedSizeList>
      </OuterElementContext.Provider>
    )
  }
)

export default ListboxComponent
