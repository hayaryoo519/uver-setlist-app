import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/** テストごとに新しい QueryClient を作成してキャッシュ干渉を防ぐ */
export const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
