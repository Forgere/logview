import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary'

// @ts-ignore - Fontsource imports don't have type declarations
import '@fontsource/inter'

import styleCss from '../styles.css?url'

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [{ rel: 'stylesheet', href: styleCss }],
    meta: [
      { title: 'HyperLog - Log Viewer' },
      { name: 'description', content: 'A powerful log file viewer' },
    ],
  }),
  shellComponent: RootComponent,
})

function RootComponent() {
  return (
    <html class="dark">
      <head>
        <HydrationScript />
      </head>
      <body class="bg-[#1e1e1e] text-white">
        <HeadContent />
        <Suspense>
          <ErrorBoundary
            title="Application Error"
            description="Something went wrong with the application. Please try refreshing the page."
          >
            <TanStackQueryProvider>
              <Outlet />
            </TanStackQueryProvider>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
