import { ErrorBoundary, Show, batch, createMemo } from 'solid-js'
import {
  CircleArrowDown,
  CircleCheck,
  CircleQuestionMark,
  Eye,
  MousePointer2,
  Settings,
  Terminal,
  X,
} from 'lucide-solid'


export interface AppHeaderProps {
  viewMode: 'browse' | 'follow'
  isStreaming: boolean
  onTogglePause?: () => void
  watchPattern?: string
  setWatchPattern?: (pattern: string) => void
  totalLines: number
  progress: number
  fileName: string | null
  fileSize: number
  onOpenShortcuts: () => void
  onFileSelect: (file: File) => void
  onOpenWatchModal?: () => void
  onOpenSettings: () => void
  onSearchFocus: () => void
}

export function AppHeader(props: AppHeaderProps) {
  let fileInputRef: HTMLInputElement | undefined

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files?.[0]) {
      // Batch file selection with state reset
      batch(() => {
        props.onFileSelect(files[0])
        target.value = ''
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Optimize: Memoize expensive status computation
  const status = createMemo(() => {
    if (!props.isStreaming) {
      return {
        label: 'FINISHED',
        subLabel: '',
        icon: () => <CircleCheck size={14} />,
        color: 'text-gray-400',
        borderColor: 'border-gray-700',
      }
    }

    // Always show as loading since follow mode is removed
    return {
      label: 'LOADING',
      subLabel: '(Loading...)',
      icon: () => <MousePointer2 size={14} />,
      color: 'text-yellow-400',
      borderColor: 'border-yellow-900/50',
    }
  })

  // Optimize: Memoize file size formatting
  const formattedFileSize = createMemo(() => formatBytes(props.fileSize))

  // Optimize: Memoize file metadata display
  const showFileMetadata = createMemo(() => Boolean(props.fileName))

  return (
    <ErrorBoundary
      fallback={(err) => <div>Error in AppHeader, {err.message}</div>}
    >
      <header class="flex-none bg-[#1e1e1e] border-b border-[#333] relative select-none z-20">
        {/* Progress Line */}
        <Show when={props.isStreaming && props.progress < 100}>
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-[#333]">
            <div
              class="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${props.progress}%` }}
            />
          </div>
        </Show>

        <div class="px-4 py-2 flex items-center justify-between">
          {/* Left Side: App Title & Actions */}
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-blue-400 font-bold text-lg mr-2">
              <Terminal size={20} />
              <span>HyperLog</span>
            </div>


            {/* Pause/Resume button during streaming */}
            <Show when={props.isStreaming && props.onTogglePause}>
              <div class="flex items-center gap-2 ml-4 border-l border-[#333] pl-4">
                <button
                  onClick={props.onTogglePause}
                  class="px-2 py-1 text-xs rounded bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 transition-colors"
                >
                  {props.isStreaming ? 'Pause' : 'Resume'}
                </button>
              </div>
            </Show>
          </div>

          {/* Right Side: Consolidated Status & Info */}
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-6 text-xs text-gray-500 border-r border-[#333] pr-4">
              {/* Consolidated Status Indicator */}
              <div
                class={`flex items-center gap-2 font-bold ${status().color} transition-colors`}
              >
                {status().icon()}
                <span>{status().label}</span>
                <span class="font-normal text-gray-500">
                  {status().subLabel}
                </span>
              </div>

              {/* File Metadata */}
              <Show when={showFileMetadata()}>
                <div class="flex flex-col items-end leading-tight border-l border-[#333] pl-6 sm:flex">
                  <span
                    class="text-gray-300 max-w-[200px] truncate"
                    title={props.fileName!}
                  >
                    {props.fileName}
                  </span>
                  <span class="text-[10px] text-gray-600">
                    {formattedFileSize()}
                  </span>
                </div>
              </Show>

              {/* Line Count */}
              <div class="min-w-20 text-right font-mono">
                {props.totalLines.toLocaleString()} lines
              </div>
            </div>

            <button
              onClick={props.onOpenSettings}
              class="text-gray-500 hover:text-gray-300 transition-colors"
              title="Settings & Configuration"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={props.onOpenShortcuts}
              class="text-gray-500 hover:text-gray-300 transition-colors"
              title="Keyboard Shortcuts"
            >
              <CircleQuestionMark size={18} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".log,.txt,.json,.xml,.csv,.tsv,.md,.yaml,.yml,.toml,.ini,.conf,.config,.properties"
          onChange={handleFileChange}
          class="hidden"
        />
      </header>
    </ErrorBoundary>
  )
}

// Utility functions that might be used elsewhere
export { formatBytes } from '~/utils/formatters' // Assuming this exists or we'll create it

// Re-export types for consistency
// export type { ViewMode } from '~/types' // Commented out to avoid conflict with local ViewMode type

// Alternative compact header for different layouts
export function CompactHeader(
  props: Pick<AppHeaderProps, 'onOpenSettings' | 'onOpenShortcuts'>,
) {
  return (
    <header class="flex-none bg-[#1e1e1e] border-b border-[#333] px-4 py-2 flex items-center justify-between">
      <div class="flex items-center gap-2 text-blue-400 font-bold text-lg">
        <Terminal size={20} />
        <span>HyperLog</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          onClick={props.onOpenSettings}
          class="text-gray-500 hover:text-gray-300 transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button
          onClick={props.onOpenShortcuts}
          class="text-gray-500 hover:text-gray-300 transition-colors"
          title="Keyboard Shortcuts"
        >
          <CircleQuestionMark size={18} />
        </button>
      </div>
    </header>
  )
}
