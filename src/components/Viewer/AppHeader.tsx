import { Show } from 'solid-js'
import {
  ArrowDownCircle,
  CheckCircle2,
  Eye,
  HelpCircle,
  MousePointer2,
  Search,
  Settings,
  Terminal,
  Upload,
  X,
} from 'lucide-solid'
import { FileOperationsErrorBoundary } from '~/components/ErrorBoundary'

export type ViewMode = 'follow' | 'browse'

export interface AppHeaderProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isStreaming: boolean
  watchPattern: string
  setWatchPattern: (pattern: string) => void
  totalLines: number
  progress: number
  fileName: string | null
  fileSize: number
  onOpenShortcuts: () => void
  onFileSelect: (file: File) => void
  onOpenWatchModal: () => void
  onOpenSettings: () => void
  onSearchFocus: () => void
}

export function AppHeader(props: AppHeaderProps) {
  let fileInputRef: HTMLInputElement | undefined

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const files = target.files
    if (files?.[0]) {
      props.onFileSelect(files[0])
      target.value = ''
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Determine the consolidated status to display on the right
  const getStatusDisplay = () => {
    if (props.watchPattern) {
      return {
        label: 'WATCHING',
        subLabel: `: ${props.watchPattern}`,
        icon: <Eye size={14} class="animate-pulse" />,
        color: 'text-amber-400',
        borderColor: 'border-amber-900/50',
      }
    }

    if (!props.isStreaming) {
      return {
        label: 'FINISHED',
        subLabel: '',
        icon: <CheckCircle2 size={14} />,
        color: 'text-gray-400',
        borderColor: 'border-gray-700',
      }
    }

    if (props.viewMode === 'follow') {
      return {
        label: 'FOLLOWING',
        subLabel: '(Loading...)',
        icon: <ArrowDownCircle size={14} class="animate-bounce" />,
        color: 'text-green-400',
        borderColor: 'border-green-900/50',
      }
    }

    // Streaming but browsing
    return {
      label: 'BROWSING',
      subLabel: '(Loading...)',
      icon: <MousePointer2 size={14} />,
      color: 'text-yellow-400',
      borderColor: 'border-yellow-900/50',
    }
  }

  const status = () => getStatusDisplay()

  return (
    <FileOperationsErrorBoundary>
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

            {/* File Actions */}
            <div class="flex items-center gap-2">
              <button
                onClick={() => fileInputRef?.click()}
                class="flex items-center gap-1.5 px-3 py-1.5 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e3e] rounded text-sm text-gray-300 hover:text-white transition-colors"
                title="Open Log File"
              >
                <Upload size={14} />
                Open File
              </button>

              <button
                onClick={props.onOpenWatchModal}
                class={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-sm transition-colors ${
                  props.watchPattern
                    ? 'bg-amber-900/30 border-amber-700 text-amber-400 hover:bg-amber-900/50'
                    : 'bg-[#252526] hover:bg-[#2a2d2e] border-[#3e3e3e] text-gray-300 hover:text-white'
                }`}
                title="Watch Mode"
              >
                <Eye size={14} />
                Watch
              </button>

              <button
                onClick={props.onSearchFocus}
                class="flex items-center gap-1.5 px-3 py-1.5 bg-[#252526] hover:bg-[#2a2d2e] border border-[#3e3e3e] rounded text-sm text-gray-300 hover:text-white transition-colors"
                title="Focus Search"
              >
                <Search size={14} />
                Search
              </button>
            </div>

            {/* View Mode Toggle */}
            <Show when={props.isStreaming}>
              <div class="flex items-center gap-2 ml-4 border-l border-[#333] pl-4">
                <span class="text-xs text-gray-500">View:</span>
                <button
                  onClick={() => props.setViewMode('follow')}
                  class={`px-2 py-1 text-xs rounded transition-colors ${
                    props.viewMode === 'follow'
                      ? 'bg-green-900/30 text-green-400 border border-green-700'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]'
                  }`}
                >
                  Follow
                </button>
                <button
                  onClick={() => props.setViewMode('browse')}
                  class={`px-2 py-1 text-xs rounded transition-colors ${
                    props.viewMode === 'browse'
                      ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-[#2a2d2e]'
                  }`}
                >
                  Browse
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
                {status().icon}
                <span>{status().label}</span>
                <span class="font-normal text-gray-500">
                  {status().subLabel}
                </span>

                {/* Quick Action to Stop Watch */}
                <Show when={props.watchPattern}>
                  <button
                    onClick={() => props.setWatchPattern('')}
                    class="ml-2 p-0.5 rounded hover:bg-[#333] text-gray-500 hover:text-white transition-colors"
                    title="Cancel Watch"
                  >
                    <X size={12} />
                  </button>
                </Show>
              </div>

              {/* File Metadata */}
              <Show when={props.fileName}>
                <div class="flex flex-col items-end leading-tight border-l border-[#333] pl-6 sm:flex">
                  <span
                    class="text-gray-300 max-w-[200px] truncate"
                    title={props.fileName!}
                  >
                    {props.fileName}
                  </span>
                  <span class="text-[10px] text-gray-600">
                    {formatBytes(props.fileSize)}
                  </span>
                </div>
              </Show>

              {/* Line Count */}
              <div class="min-w-[80px] text-right font-mono">
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
              <HelpCircle size={18} />
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
    </FileOperationsErrorBoundary>
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
          <HelpCircle size={18} />
        </button>
      </div>
    </header>
  )
}
