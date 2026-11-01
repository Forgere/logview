import { For, Show, createMemo } from 'solid-js'
import { Filter, ListFilter } from 'lucide-solid'
import { LogLevel } from '~/types'
import { LOG_LEVELS } from '~/utils/logLevels'

interface FilterBarProps {
  counts: Record<LogLevel, number>
  excluded: Set<LogLevel>
  onToggleLevel: (level: LogLevel) => void
  searchOnly: boolean
  onToggleSearchOnly: () => void
  matchCount: number
  hasQuery: boolean
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'Error',
  [LogLevel.WARN]: 'Warn',
  [LogLevel.INFO]: 'Info',
  [LogLevel.DEBUG]: 'Debug',
}

const LEVEL_DOT: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'bg-level-error',
  [LogLevel.WARN]: 'bg-level-warn',
  [LogLevel.INFO]: 'bg-level-info',
  [LogLevel.DEBUG]: 'bg-level-debug',
}

export function FilterBar(props: FilterBarProps) {
  const total = createMemo(() =>
    LOG_LEVELS.reduce((sum, l) => sum + props.counts[l], 0),
  )

  const allActive = createMemo(() => props.excluded.size === 0)

  const clearFilters = () => {
    LOG_LEVELS.forEach((l) => {
      if (props.excluded.has(l)) props.onToggleLevel(l)
    })
  }

  return (
    <div class="flex-none border-b border-border bg-surface px-4 py-1.5 flex items-center gap-3 text-xs custom-scrollbar overflow-x-auto">
      <div class="flex items-center gap-1.5 text-muted-foreground shrink-0">
        <Filter size={13} />
        <span class="font-medium">Levels</span>
      </div>

      <For each={LOG_LEVELS}>
        {(level) => {
          const active = () => !props.excluded.has(level)
          const count = () => props.counts[level]
          return (
            <button
              onClick={() => props.onToggleLevel(level)}
              title={`${LEVEL_LABEL[level]} (${count().toLocaleString()})`}
              class={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors ${
                active()
                  ? 'border-border bg-surface-2 text-foreground'
                  : 'border-transparent bg-surface-3/50 text-muted-foreground line-through opacity-60'
              }`}
            >
              <span class={`w-2 h-2 rounded-full ${LEVEL_DOT[level]}`} />
              <span class="font-medium">{LEVEL_LABEL[level]}</span>
              <span class="tabular-nums text-muted-foreground">
                {count().toLocaleString()}
              </span>
            </button>
          )
        }}
      </For>

      <Show when={!allActive()}>
        <button
          onClick={clearFilters}
          class="shrink-0 px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          Clear
        </button>
      </Show>

      <div class="w-px h-4 bg-border mx-1 shrink-0" />

      <button
        onClick={props.onToggleSearchOnly}
        disabled={!props.hasQuery}
        class={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          props.searchOnly
            ? 'border-accent-brand bg-accent-brand/20 text-accent-brand'
            : 'border-border text-muted-foreground hover:bg-surface-2'
        }`}
        title="Show only lines matching the current search"
      >
        <ListFilter size={13} />
        <span class="font-medium">Matches only</span>
        <Show when={props.hasQuery}>
          <span class="tabular-nums">{props.matchCount.toLocaleString()}</span>
        </Show>
      </button>

      <Show when={total() > 0}>
        <span class="shrink-0 text-muted-foreground tabular-nums ml-auto">
          {total().toLocaleString()} lines
        </span>
      </Show>
    </div>
  )
}
