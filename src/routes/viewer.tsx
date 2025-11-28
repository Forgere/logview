import { createFileRoute } from '@tanstack/solid-router'
import { createSignal } from 'solid-js'
import { ViewerHeader } from '~/components/Viewer/ViewerHeader'

export const Route = createFileRoute('/viewer')({
  component: RouteComponent,
})

function RouteComponent() {
const [bottomHeight, setBottomHeight] = createSignal(200)

  let containerRef: HTMLDivElement | undefined
  let startY = 0
  let startHeight = 0

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    startY = e.clientY
    startHeight = bottomHeight()

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY
      console.log(e.clientY, delta)
      const newHeight = Math.max(80, startHeight + delta)
      setBottomHeight(newHeight)
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div class="flex h-screen flex-col select-none">
      <ViewerHeader />

      <div class="flex-1 bg-slate-100">主内容区域</div>

      <div
        ref={el => (containerRef = el)}
        class="relative w-full bg-white border-t border-gray-300"
        style={{ height: `${bottomHeight()}px` }}
      >
        <div
          class="absolute left-0 right-0 top-0 h-4 cursor-ns-resize bg-gray-300 hover:bg-blue-400"
          onMouseDown={onMouseDown}
        />
        <div class="overflow-auto pt-4">底部面板内容</div>
      </div>
    </div>
  )
}