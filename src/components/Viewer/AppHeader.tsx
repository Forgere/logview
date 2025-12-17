import { ErrorBoundary, Show, batch, createMemo } from 'solid-js'
import {
  CircleArrowDown,
  CircleCheck,
  CircleQuestionMark,
  Eye,
  EyeOff,
  MousePointer2,
  Pause,
  Play,
  Settings,
  Terminal,
} from 'lucide-solid'


export interface AppHeaderProps {
  viewMode: 'browse' | 'follow'
  isStreaming: boolean
  onTogglePause?: () => void
  onToggleViewMode?: () => void
  watchPattern?: string
  watchActive?: boolean
  totalLines: number
  progress: number
  fileName: string | null
  fileSize: number
  onOpenShortcuts: () => void
  onFileSelect: (file: File) => void
  onOpenWatchModal?: () => void
  onStopWatch?: () => void
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
    // Watch mode active
    if (props.watchActive && props.watchPattern) {
      return {
        label: 'WATCHING',
        subLabel: `"${props.watchPattern}"`,
        icon: () => <Eye size={14} class="animate-pulse" />,
        color: 'text-amber-400',
        borderColor: 'border-amber-900/50',
      }
    }

    if (!props.isStreaming) {
      return {
        label: 'FINISHED',
        subLabel: '',
        icon: () => <CircleCheck size={14} />,
        color: 'text-gray-400',
        borderColor: 'border-gray-700',
      }
    }

    // Follow vs Browse mode during streaming
    if (props.viewMode === 'follow') {
      return {
        label: 'FOLLOWING',
        subLabel: '(Live)',
        icon: () => <CircleArrowDown size={14} class="animate-bounce" />,
        color: 'text-green-400',
        borderColor: 'border-green-900/50',
      }
    }

    return {
      label: 'BROWSING',
      subLabel: '(Paused view)',
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

            {/* View Mode Toggle - show during streaming or when file is loaded */}
            <Show when={props.fileName}>
              <div class="flex items-center gap-2 border-l border-[#333] pl-4">
                {/* Follow/Browse Toggle */}
                <Show when={props.isStreaming}>
                  <button
                    onClick={props.onToggleViewMode}
                    class={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
                      props.viewMode === 'follow'
                        ? 'bg-green-900/30 text-green-400 border-green-700 hover:bg-green-900/50'
                        : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'
                    }`}
                    title={props.viewMode === 'follow' ? 'Switch to Browse mode' : 'Switch to Follow mode'}
                  >
                    {props.viewMode === 'follow' ? <Eye size={12} /> : <EyeOff size={12} />}
                    {props.viewMode === 'follow' ? 'Following' : 'Browse'}
                  </button>
                </Show>

                {/* Pause/Resume button during streaming */}
                <Show when={props.isStreaming && props.onTogglePause}>
                  <button
                    onClick={props.onTogglePause}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 transition-colors"
                  >
                    <Pause size={12} />
                    Pause
                  </button>
                </Show>

                {/* Resume button when paused */}
                <Show when={!props.isStreaming && props.progress < 100 && props.onTogglePause}>
                  <button
                    onClick={props.onTogglePause}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 transition-colors"
                  >
                    <Play size={12} />
                    Resume
                  </button>
                </Show>

                {/* Watch indicator and stop button */}
                <Show when={props.watchActive && props.watchPattern}>
                  <button
                    onClick={props.onStopWatch}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-amber-900/30 text-amber-400 border border-amber-700 hover:bg-amber-900/50 transition-colors"
                    title="Stop watching"
                  >
                    <Eye size={12} class="animate-pulse" />
                    <span class="max-w-[100px] truncate">"{props.watchPattern}"</span>
                    <span class="text-amber-600">×</span>
                  </button>
                </Show>
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
