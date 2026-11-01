import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import { onMount } from 'solid-js'
import { HydrationScript, Suspense } from 'solid-js/web'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'
import { ErrorBoundary } from '../components/ErrorBoundary'

// @ts-ignore - Fontsource imports don't have type declarations
import '@fontsource/inter'

import styleCss from '../styles.css?url'
import { registerServiceWorker } from '~/lib/pwa'

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [
      { rel: 'stylesheet', href: styleCss },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon-180.png' },
    ],
    meta: [
      { title: 'HyperLog - Log Viewer' },
      { name: 'description', content: 'A powerful log file viewer' },
      { name: 'theme-color', content: '#0e0e10' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
    ],
  }),
  shellComponent: RootComponent,
})

function RootComponent() {
  onMount(() => {
    registerServiceWorker()
  })
  return (
    <html class="dark">
      <head>
        <HydrationScript />
      </head>
      <body class="bg-background text-foreground">
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
