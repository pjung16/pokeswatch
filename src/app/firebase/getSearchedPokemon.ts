import {db} from './firebase'
import {doc, getDoc} from 'firebase/firestore'

const ref = doc(db, 'global', 'searched_pokemon')

export async function getGlobalSearchedPokemon(): Promise<Record<string, number>> {
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data()?.pokemon || {} : {}
}
