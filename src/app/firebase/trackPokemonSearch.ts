import {db, auth} from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
} from 'firebase/firestore'
import {FirebaseError} from 'firebase/app'

export async function trackPokemonSearch(name: string) {
  const normalized = name.toLowerCase()
  const user = auth.currentUser
  if (!user) return

  const userRef = doc(db, 'users', user.uid)
  const globalRef = doc(db, 'global', 'searched_pokemon')

  // Get user data
  const userSnap = await getDoc(userRef)
  const alreadySearched: string[] = userSnap.exists()
    ? userSnap.data()?.searched || []
    : []

  // If user has already searched this Pokémon, do nothing
  if (alreadySearched.includes(normalized)) return

  // 1. Update the global count (or create if missing)
  try {
    await updateDoc(globalRef, {
      [`pokemon.${normalized}`]: increment(1),
    })
  } catch (e) {
    if (e instanceof FirebaseError && e.code === 'not-found') {
      await setDoc(globalRef, {
        pokemon: {[normalized]: 1},
      })
    } else {
      console.error('Failed to update global count:', e)
      return
    }
  }

  // 2. Track this Pokémon as searched for this user
  await setDoc(userRef, {searched: arrayUnion(normalized)}, {merge: true})
}
