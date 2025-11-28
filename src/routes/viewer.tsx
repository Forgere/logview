import { createFileRoute } from '@tanstack/solid-router'
import { createSignal } from 'solid-js'
import { ViewerHeader } from '~/components/Viewer/ViewerHeader'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/viewer')({
  component: RouteComponent,
})

function RouteComponent() {
  const [bottomHeight, setBottomHeight] = createSignal(200)
  return(
    <div class={cn("grid h-full", `grid-rows-[auto_1fr_${bottomHeight()}px]`)}>
      <ViewerHeader />
      <div>1</div>
      <div>
        <div>drag</div>
        2
      </div>
    </div>
  )
}
