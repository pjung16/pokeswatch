"use client"

import React, { useState } from "react"
import { Autocomplete, TextField } from "@mui/material"
import {
  getPokemonIcon,
  queryableNameToPokemonName,
  speciesToOptions,
} from "../../utils"
import species from "../../species.json"
import styles from "./styles.module.css"
import { useRouter } from "next/navigation"

const autocompleteOptions = speciesToOptions(species)

interface PokemonComboboxProps {}

export const EmptyPokemonCombobox: React.FC<PokemonComboboxProps> = ({}) => {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const router = useRouter()

  return (
    <div className={styles.emptyComboboxContainer}>
      <Autocomplete
        open={optionsOpen}
        onOpen={() => setOptionsOpen(true)}
        onClose={() => setOptionsOpen(false)}
        autoHighlight={true}
        options={autocompleteOptions}
        filterOptions={(options, state) => {
          const inputValue = state.inputValue.toLowerCase()
          return options.filter(
            (option) =>
              option.label.toLowerCase().includes(inputValue) ||
              option.id.toString().includes(inputValue)
          )
        }}
        onChange={(event, value) => {
          router.push(`/pokemon/${value?.label}`)
        }}
        // slots={{ listbox: ListboxComponent }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "0px 0px 30px 30px", // bottom rounded corners for dropdown
              border: "1px solid rgba(0, 0, 0, 0.23)",
              borderTopWidth: "0px",
              boxShadow:
                "0 9px 8px -3px rgba(64, 60, 67, .24), 8px 0 8px -7px rgba(64, 60, 67, .24), -8px 0 8px -7px rgba(64, 60, 67, .24)",
            },
          },
          listbox: {
            sx: {
              maxHeight: 400,
              overflowY: "auto",
            },
          },
          popper: {
            modifiers: [
              {
                name: "flip",
                enabled: false, // disables upward opening
              },
            ],
            placement: "bottom-start", // optional but reinforces downward opening
          },
        }}
        disablePortal
        sx={{
          width: "100%",
          backgroundColor: "white",
          "& fieldset": {
            borderRadius: optionsOpen ? "30px 30px 0px 0px" : "30px",
          },
          borderRadius: optionsOpen ? "30px 30px 0px 0px" : "30px",
        }}
        renderInput={(params) => (
          <>
            <TextField
              {...params}
              sx={{
                textTransform: "capitalize",
                "& .MuiAutocomplete-input": { textTransform: "capitalize" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: optionsOpen ? "30px 30px 0px 0px" : "30px",
                  boxShadow: "0px 2px 8px 2px rgba(64, 60, 67, .24)",
                  paddingLeft: "16px",
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                  },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: "rgba(0, 0, 0, 0.23)",
                    borderWidth: "1px",
                  },
                "& .MuiAutocomplete-root .MuiOutlinedInput-root": {},
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0px",
                      marginRight: "-1px",
                    }}
                  >
                    <div
                      style={{
                        // random string here to get question mark icon
                        background: getPokemonIcon("egg"),
                        width: "40px",
                        height: "30px",
                        imageRendering: "pixelated",
                        transform: "scale(1.2)",
                        marginRight: "4px",
                        marginTop: "-12px",
                      }}
                    />
                  </div>
                ),
              }}
            />
          </>
        )}
        renderOption={({ key, ...params }, option) => (
          <li key={key} {...params} style={{ textTransform: "capitalize" }}>
            <div
              style={{
                background: getPokemonIcon(
                  queryableNameToPokemonName(
                    typeof option.id === "string"
                      ? option.label.replaceAll("-", "")
                      : option.label
                  )
                ),
                width: "40px",
                height: "30px",
                imageRendering: "pixelated",
                transform: "scale(1.2)",
                marginRight: "0.5px",
                marginLeft: "-1px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                overflow: "hidden",
              }}
            >
              <div className={styles.pokemonDexNumber}>#{option.id}</div>
              <div>{option.label}</div>
            </div>
          </li>
        )}
        isOptionEqualToValue={(option, value) => {
          return option.id === value.id
        }}
      />
    </div>
  )
}
