import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'

import '@fontsource/inter'

import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'

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
          <TanStackQueryProvider>
            <Outlet />
          </TanStackQueryProvider>
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
