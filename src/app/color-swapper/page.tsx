import { promises as fs } from "fs"
import { TPokemon } from "../types"
import ColorSwitcherClientPage from "./ColorSwitcherClientPage"

export const dynamicParams = false

export async function generateStaticParams() {
  return []
}

export async function generateMetadata() {
  return {
    title: "Color Swapper - PokeSwatch",
    description: "Swap and customize Pokemon sprite colors!",
  }
}

export default async function Page() {
  return <ColorSwitcherClientPage />
}
