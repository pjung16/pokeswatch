"use client"

import React, { Suspense } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import GameContent from "./GameContent"

export default function GamePageClient() {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense>
        <GameContent />
      </Suspense>
    </QueryClientProvider>
  )
}
