import React, { useEffect, useState } from "react"
import { Autocomplete, TextField } from "@mui/material"
import {
  getPokemonIcon,
  queryableNameToPokemonName,
  speciesToOptions,
} from "../../utils"
import species from "../../species.json"
import styles from "./styles.module.css"
import ListboxComponent from "@/app/components/VirtualizedListboxComponent"

const autocompleteOptions = speciesToOptions(species)

interface PokemonComboboxProps {
  pokemonFromInput: { label: string; id: number | string }
  setPokemonFromInput: React.Dispatch<
    React.SetStateAction<{ label: string; id: number | string }>
  >
  isPokemonForm: boolean
  selectedPokemon: string
  setSelectedPokemon: React.Dispatch<React.SetStateAction<string>>
  pokemonIconString: string
  formOptions: { label: string; id: number | string }[]
  updatePokemonRoute: (
    currentUrl: string,
    oldPokemonName: string,
    newPokemonName: string
  ) => void
}

export const PokemonCombobox: React.FC<PokemonComboboxProps> = ({
  pokemonFromInput,
  setPokemonFromInput,
  selectedPokemon,
  setSelectedPokemon,
  pokemonIconString,
  formOptions,
  updatePokemonRoute,
  isPokemonForm,
}) => {
  const [optionsOpen, setOptionsOpen] = useState(false)

  useEffect(() => {
    if (formOptions.length > 1) {
      setPokemonFromInput({
        label: pokemonFromInput.label,
        id: `${pokemonFromInput.id}`,
      })
    }
  }, [
    formOptions,
    pokemonFromInput.label,
    pokemonFromInput.id,
    setPokemonFromInput,
  ])
  return (
    <div className={styles.comboboxContainer}>
      <Autocomplete
        open={optionsOpen}
        onOpen={() => setOptionsOpen(true)}
        onClose={() => setOptionsOpen(false)}
        autoHighlight={true}
        options={
          formOptions.length > 1
            ? [...formOptions, ...autocompleteOptions]
            : autocompleteOptions
        }
        filterOptions={(options, state) => {
          const inputValue = state.inputValue.toLowerCase()
          return options.filter(
            (option) =>
              option.label.toLowerCase().includes(inputValue) ||
              option.id.toString().includes(inputValue)
          )
        }}
        groupBy={
          formOptions.length > 1 ? (option) => typeof option.id : undefined
        }
        renderGroup={(params) => {
          const group = params.group
          const isPokemonGroup = group === "string"
          return (
            <div key={params.group}>
              <strong>{!isPokemonGroup ? "Pokémon" : "Forms"}</strong>
              <div>{params.children}</div>
            </div>
          )
        }}
        onChange={(event, value) => {
          if (value) {
            updatePokemonRoute(
              window.location.pathname,
              selectedPokemon,
              value.label
            )
            setPokemonFromInput(value)
            setSelectedPokemon(value.label)
          }
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
              maxHeight: 200,
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
                        background: getPokemonIcon(
                          queryableNameToPokemonName(
                            isPokemonForm
                              ? pokemonIconString.replaceAll("-", "")
                              : pokemonIconString
                          )
                        ),
                        width: "40px",
                        height: "30px",
                        imageRendering: "pixelated",
                        transform: "scale(1.2)",
                      }}
                    />
                    <div
                      className={styles.pokemonDexNumber}
                      style={{ marginRight: "2px" }}
                    >
                      #{pokemonFromInput.id}
                    </div>
                  </div>
                ),
                // renderSuffix: () => (
                //   <div className={styles.pokemonDexNumber}>#{data?.id}</div>
                // ),
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
            {/* <div
                          style={{
                            width: '40px',
                            height: '40px',
                            border: '2px solid grey',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '10px',
                            transform: 'scale(1.1)',
                          }}
                        >
                          <div
                            style={{
                              background: getPokemonIcon(option.label),
                              width: '40px',
                              height: '30px',
                              imageRendering: 'pixelated',
                            }}
                          />
                        </div> */}
            <div
              style={{
                display: "flex",
                // flexDirection: 'column',
                alignItems: "center",
                gap: "4px",
                overflow: "hidden",
                // marginLeft: '6px',
              }}
            >
              <div className={styles.pokemonDexNumber}>#{option.id}</div>
              <div>{option.label}</div>
            </div>
          </li>
        )}
        value={pokemonFromInput}
        isOptionEqualToValue={(option, value) => {
          return option.id === value.id
        }}
      />
    </div>
  )
}
