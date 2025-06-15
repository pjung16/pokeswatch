import React, {useEffect, useState} from 'react'
import {trackPokemonSearch} from './trackPokemonSearch'
import {getGlobalSearchedPokemon} from './getSearchedPokemon'

export default function PokemonTracker() {
  const [searched, setSearched] = useState<Record<string, number>>({})
  const [input, setInput] = useState('')

  useEffect(() => {
    getGlobalSearchedPokemon().then(setSearched)
  }, [])

  const handleSearch = async () => {
    if (!input.trim()) return
    await trackPokemonSearch(input)
    const updated = await getGlobalSearchedPokemon()
    setSearched(updated)
    setInput('')
  }

  return (
    <div style={{padding: '1rem'}}>
      <h2>Global Pokémon Searches</h2>
      <p>{Object.keys(searched).length} unique Pokémon searched</p>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Search Pokémon..."
      />
      <button onClick={handleSearch}>Search</button>

      <ul>
        {Object.entries(searched)
          .sort((a, b) => b[1] - a[1]) // sort by count desc
          .map(([name, count]) => (
            <li key={name}>
              {name} – searched {count} time{count > 1 ? 's' : ''}
            </li>
          ))}
      </ul>
    </div>
  )
}
