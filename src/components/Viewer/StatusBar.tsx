import { Show, createMemo } from 'solid-js'
import { CircleDot } from 'lucide-solid'
import { LogLevel } from '~/types'
import { LOG_LEVELS } from '~/utils/logLevels'

interface StatusBarProps {
  line: number
  column: number
  totalLines: number
  progress: number
  isStreaming: boolean
  counts: Record<LogLevel, number>
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'text-level-error',
  [LogLevel.WARN]: 'text-level-warn',
  [LogLevel.INFO]: 'text-level-info',
  [LogLevel.DEBUG]: 'text-level-debug',
}

export function StatusBar(props: StatusBarProps) {
  const progressLabel = createMemo(() => {
    if (!props.isStreaming) return null
    return `${props.progress.toFixed(0)}%`
  })

  return (
    <div class="flex-none h-6 border-t border-border bg-surface px-3 flex items-center justify-between text-[11px] text-muted-foreground custom-scrollbar overflow-x-auto select-none">
      <div class="flex items-center gap-3">
        <span class="tabular-nums">
          Ln {props.line.toLocaleString()}, Col {props.column}
        </span>
        <span class="tabular-nums">
          {props.totalLines.toLocaleString()} lines
        </span>
        <Show when={progressLabel()}>
          <span class="tabular-nums text-accent-brand">
            streaming {progressLabel()}
          </span>
        </Show>
      </div>

      <div class="flex items-center gap-3">
        <Show when={props.totalLines > 0}>
          {LOG_LEVELS.map((level) => {
            const count = props.counts[level]
            return (
              <Show when={count > 0}>
                <span
                  class={`flex items-center gap-1 tabular-nums ${LEVEL_COLOR[level]}`}
                >
                  <CircleDot size={9} />
                  {count.toLocaleString()}
                </span>
              </Show>
            )
          })}
        </Show>
      </div>
    </div>
  )
}
