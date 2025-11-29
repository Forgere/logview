import { createFileRoute, redirect } from '@tanstack/solid-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/viewer' })
  },
  component: () => null,
})
