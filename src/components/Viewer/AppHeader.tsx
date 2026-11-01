import { ErrorBoundary, Show, batch, createMemo } from 'solid-js'
import {
  CircleArrowDown,
  CircleCheck,
  CircleQuestionMark,
  Eye,
  EyeOff,
  Github,
  MousePointer2,
  Pause,
  Play,
  Settings,
  Sparkles,
  Terminal,
} from 'lucide-solid'
import { GITHUB_URL } from '~/lib/constants'
import { APP_VERSION } from '~/lib/version'
import { formatBytes } from '~/utils/formatters'

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
  onOpenUpgradeGuide?: () => void
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

  // Optimize: Memoize expensive status computation
  const status = createMemo(() => {
    // Watch mode active
    if (props.watchActive && props.watchPattern) {
      return {
        label: 'WATCHING',
        subLabel: `"${props.watchPattern}"`,
        icon: () => <Eye size={14} class="animate-pulse" />,
        color: 'text-warning',
      }
    }

    if (!props.isStreaming) {
      return {
        label: 'FINISHED',
        subLabel: '',
        icon: () => <CircleCheck size={14} />,
        color: 'text-muted-foreground',
      }
    }

    // Follow vs Browse mode during streaming
    if (props.viewMode === 'follow') {
      return {
        label: 'FOLLOWING',
        subLabel: '(Live)',
        icon: () => <CircleArrowDown size={14} class="animate-bounce" />,
        color: 'text-success',
      }
    }

    return {
      label: 'BROWSING',
      subLabel: '(Paused view)',
      icon: () => <MousePointer2 size={14} />,
      color: 'text-warning',
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
      <header class="flex-none bg-surface border-b border-border relative select-none z-20">
        {/* Progress Line */}
        <Show when={props.isStreaming && props.progress < 100}>
          <div class="absolute top-0 left-0 right-0 h-0.5 bg-surface-3">
            <div
              class="h-full bg-accent-brand transition-all duration-300 ease-out"
              style={{ width: `${props.progress}%` }}
            />
          </div>
        </Show>

        <div class="px-4 py-2 flex items-center justify-between">
          {/* Left Side: App Title & Actions */}
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-accent-brand font-bold text-lg mr-2">
              <Terminal size={20} />
              <span>HyperLog</span>
            </div>

            {/* View Mode Toggle - show during streaming or when file is loaded */}
            <Show when={props.fileName}>
              <div class="flex items-center gap-2 border-l border-border pl-4">
                {/* Follow/Browse Toggle */}
                <Show when={props.isStreaming}>
                  <button
                    onClick={props.onToggleViewMode}
                    class={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
                      props.viewMode === 'follow'
                        ? 'bg-success/10 text-success border-success/40 hover:bg-success/20'
                        : 'bg-surface-3 text-muted-foreground border-border hover:bg-surface-2'
                    }`}
                    title={
                      props.viewMode === 'follow'
                        ? 'Switch to Browse mode'
                        : 'Switch to Follow mode'
                    }
                  >
                    {props.viewMode === 'follow' ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                    {props.viewMode === 'follow' ? 'Following' : 'Browse'}
                  </button>
                </Show>

                {/* Pause/Resume button during streaming */}
                <Show when={props.isStreaming && props.onTogglePause}>
                  <button
                    onClick={props.onTogglePause}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-level-error/10 text-level-error border border-level-error/40 hover:bg-level-error/20 transition-colors"
                  >
                    <Pause size={12} />
                    Pause
                  </button>
                </Show>

                {/* Resume button when paused */}
                <Show
                  when={
                    !props.isStreaming &&
                    props.progress < 100 &&
                    props.onTogglePause
                  }
                >
                  <button
                    onClick={props.onTogglePause}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-success/10 text-success border border-success/40 hover:bg-success/20 transition-colors"
                  >
                    <Play size={12} />
                    Resume
                  </button>
                </Show>

                {/* Watch indicator and stop button */}
                <Show when={props.watchActive && props.watchPattern}>
                  <button
                    onClick={props.onStopWatch}
                    class="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-warning/10 text-warning border border-warning/40 hover:bg-warning/20 transition-colors"
                    title="Stop watching"
                  >
                    <Eye size={12} class="animate-pulse" />
                    <span class="max-w-[100px] truncate">
                      "{props.watchPattern}"
                    </span>
                    <span class="text-warning/70">×</span>
                  </button>
                </Show>
              </div>
            </Show>
          </div>

          {/* Right Side: Consolidated Status & Info */}
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-6 text-xs text-muted-foreground border-r border-border pr-4">
              {/* Consolidated Status Indicator */}
              <div
                class={`flex items-center gap-2 font-bold ${status().color} transition-colors`}
              >
                {status().icon()}
                <span>{status().label}</span>
                <span class="font-normal text-muted-foreground">
                  {status().subLabel}
                </span>
              </div>

              {/* File Metadata */}
              <Show when={showFileMetadata()}>
                <div class="flex flex-col items-end leading-tight border-l border-border pl-6 sm:flex">
                  <span
                    class="text-surface-foreground max-w-[200px] truncate"
                    title={props.fileName!}
                  >
                    {props.fileName}
                  </span>
                  <span class="text-[10px] text-muted-foreground">
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
              class="text-muted-foreground hover:text-foreground transition-colors"
              title="Settings & Configuration"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={props.onOpenShortcuts}
              class="text-muted-foreground hover:text-foreground transition-colors"
              title="Keyboard Shortcuts"
            >
              <CircleQuestionMark size={18} />
            </button>
            <Show when={props.onOpenUpgradeGuide}>
              <button
                onClick={props.onOpenUpgradeGuide}
                class="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                title={`What's new in ${APP_VERSION}`}
              >
                <Sparkles size={18} />
                <span class="font-mono text-[10px]">{APP_VERSION}</span>
              </button>
            </Show>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              class="text-muted-foreground hover:text-foreground transition-colors"
              title="View source on GitHub"
            >
              <Github size={18} />
            </a>
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
