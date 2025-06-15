import React from "react"

const CopyToClipboard = ({
  text,
  children,
}: {
  text: string
  children: React.ReactNode
}) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(
        child as React.ReactElement<{ onClick?: () => void }>,
        {
          onClick: () => {
            copyToClipboard()
          },
        }
      )
    }
    return child
  })
}

export default CopyToClipboard
