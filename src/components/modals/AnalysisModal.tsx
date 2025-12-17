import { Show, createEffect, createSignal, on } from 'solid-js'
import { Sparkles } from 'lucide-solid'
import type { LogMarker } from '~/types'
import { Modal } from '~/components/ui/Modal'

interface AnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  markers: Array<LogMarker>
  selectedIds: Set<string>
}

export function AnalysisModal(props: AnalysisModalProps) {
  const [text, setText] = createSignal('')
  const [isLoading, setIsLoading] = createSignal(true)

  createEffect(
    on(
      () => props.isOpen,
      (isOpen) => {
        if (isOpen) {
          setIsLoading(true)
          setText('')

          // Get selected markers
          const selectedCount = props.selectedIds.size
          const sample = props.markers
            .filter((m) => props.selectedIds.has(m.id))
            .map((m) => m.contextLine)
            .slice(0, 1)

          const mockReport = `
### Log Analysis Report

**Scope:** ${selectedCount} marked lines selected for review.

**Key Findings:**
1. **Sequence Anomalies:** Detected non-sequential processing in the selected block. Timestamps diverge by >50ms in the critical path.
2. **Error Patterns:** The selected segment contains references to 'WidgetComponent' failure, often correlated with memory pressure.
3. **System State:** Network latency spikes are correlated with the selected WARN logs.

**Sample Context:**
> ${sample[0]?.substring(0, 60) || 'N/A'}...

**Recommendation:**
Check the 'logService' latency simulation parameters and verify the retry logic on the authentication module.
          `

          setTimeout(() => {
            setText(mockReport)
            setIsLoading(false)
          }, 1500)
        }
      },
    ),
  )

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="AI Analysis"
      class="w-[600px]"
    >
      <div class="prose prose-invert prose-sm max-w-none">
        <Show
          when={!isLoading()}
          fallback={
            <div class="flex items-center justify-center h-32 text-purple-400 animate-pulse">
              <Sparkles size={24} class="mr-2" /> Analyzing log patterns...
            </div>
          }
        >
          <div class="whitespace-pre-wrap leading-relaxed text-gray-300">
            {text()}
          </div>
        </Show>
      </div>
    </Modal>
  )
}
