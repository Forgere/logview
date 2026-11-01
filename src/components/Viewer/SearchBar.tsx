import { Show, createMemo, onMount } from 'solid-js'
import { ArrowDown, ArrowUp, Highlighter, Search } from 'lucide-solid'
import { SearchErrorBoundary } from '~/components/ErrorBoundary'

// Icons - Styled to match VS Code
const RegexIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    {/* Asterisk */}
    <path d="M12.5 7L19.5 11" />
    <path d="M19.5 7L12.5 11" />
    <path d="M16 5V13" />
    {/* Dot */}
    <circle cx="7" cy="14" r="2.5" fill="currentColor" stroke="none" />
  </svg>
)

const CaseIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    {/* A */}
    <path d="M3 16l4-10l4 10" />
    <path d="M4.5 12h5" />
    {/* a */}
    <circle cx="17" cy="13" r="3" />
    <path d="M20 10v6" />
  </svg>
)

const WholeWordIcon = (props: { class?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    {/* Underline */}
    <path d="M2 19h20" />
    {/* a */}
    <circle cx="7" cy="12" r="2.5" />
    <path d="M9.5 9.5v5" />
    {/* b */}
    <circle cx="16" cy="12" r="2.5" />
    <path d="M13.5 7v8" />
  </svg>
)

interface SearchBarProps {
  query: string
  setQuery: (q: string) => void
  regexMode: boolean
  setRegexMode: (v: boolean) => void
  caseSensitive: boolean
  setCaseSensitive: (v: boolean) => void
  wholeWord: boolean
  setWholeWord: (v: boolean) => void
  resultsCount: number
  currentResultIndex: number
  onNext: () => void
  onPrev: () => void
  onOpenHighlights: () => void
  inputRef?: HTMLInputElement | null
}

export function SearchBar(props: SearchBarProps) {
  let inputRef: HTMLInputElement | undefined

  // Optimize: Use reactive computation for search result display
  const searchResultText = createMemo(() => {
    const count = props.resultsCount
    const index = props.currentResultIndex
    return count === 0 ? '0/0' : `${index + 1}/${count}`
  })

  // Optimize: Memoize button states to prevent unnecessary re-renders
  const navigationDisabled = createMemo(() => props.resultsCount === 0)

  // Optimize: Create derived signal for search state
  const hasSearchQuery = createMemo(() => Boolean(props.query))

  // Focus input when component mounts
  onMount(() => {
    if (props.inputRef) {
      inputRef = props.inputRef
    } else {
      inputRef?.focus()
    }
  })

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? props.onPrev() : props.onNext()
    }
  }

  // Sync search options with Monaco when they change
  const handleRegexToggle = () => {
    const newValue = !props.regexMode
    props.setRegexMode(newValue)
    // Trigger search update with new regex setting
    if (props.query) {
      setTimeout(() => {
        props.onNext()
      }, 50)
    }
  }

  const handleCaseToggle = () => {
    const newValue = !props.caseSensitive
    props.setCaseSensitive(newValue)
    // Trigger search update with new case setting
    if (props.query) {
      setTimeout(() => {
        props.onNext()
      }, 50)
    }
  }

  const handleWholeWordToggle = () => {
    const newValue = !props.wholeWord
    props.setWholeWord(newValue)
    // Trigger search update with new whole word setting
    if (props.query) {
      setTimeout(() => {
        props.onNext()
      }, 50)
    }
  }

  return (
    <SearchErrorBoundary>
      <div class="flex-none bg-surface-2 border-b border-border px-4 py-2 flex items-center gap-3 shadow-sm">
        <div class="relative flex-1 max-w-2xl flex items-center">
          <div class="absolute left-2 text-muted-foreground">
            <Search size={14} />
          </div>
          <input
            ref={props.inputRef || inputRef}
            type="text"
            value={props.query}
            onInput={(e) => props.setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search logs (Ctrl+F)..."
            class="w-full h-8 bg-surface border border-border rounded pl-8 pr-[160px] text-sm focus:border-accent-brand focus:ring-1 focus:ring-accent-brand outline-none text-foreground placeholder-muted-foreground transition-colors"
          />
          <div class="absolute right-1 flex items-center gap-0.5 my-1 mr-1">
            <button
              onClick={props.onOpenHighlights}
              class="p-1 rounded hover:bg-surface-3 text-muted-foreground hover:text-warning transition-colors"
              title="Highlight Settings"
            >
              <Highlighter class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-border mx-1" />

            <button
              onClick={handleCaseToggle}
              class={`p-1 rounded hover:bg-surface-3 transition-colors ${props.caseSensitive ? 'text-accent-brand bg-surface-3' : 'text-muted-foreground'}`}
              title="Match Case (Alt+C)"
            >
              <CaseIcon class="w-4 h-4" />
            </button>
            <button
              onClick={handleWholeWordToggle}
              class={`p-1 rounded hover:bg-surface-3 transition-colors ${props.wholeWord ? 'text-accent-brand bg-surface-3' : 'text-muted-foreground'}`}
              title="Match Whole Word (Alt+W)"
            >
              <WholeWordIcon class="w-4 h-4" />
            </button>
            <button
              onClick={handleRegexToggle}
              class={`p-1 rounded hover:bg-surface-3 transition-colors ${props.regexMode ? 'text-accent-brand bg-surface-3' : 'text-muted-foreground'}`}
              title="Use Regular Expression (Alt+R)"
            >
              <RegexIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <Show when={hasSearchQuery()}>
          <div class="flex items-center gap-2 text-sm animate-in fade-in duration-200">
            <span class="text-muted-foreground min-w-[60px] text-center font-mono text-xs">
              {searchResultText()}
            </span>
            <div class="flex bg-surface-3 rounded border border-border">
              <button
                onClick={props.onPrev}
                disabled={navigationDisabled()}
                class="p-1 hover:bg-surface-2 text-surface-foreground disabled:opacity-30 transition-colors"
              >
                <ArrowUp size={16} />
              </button>
              <div class="w-[1px] bg-border" />
              <button
                onClick={props.onNext}
                disabled={navigationDisabled()}
                class="p-1 hover:bg-surface-2 text-surface-foreground disabled:opacity-30 transition-colors"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        </Show>
      </div>
    </SearchErrorBoundary>
  )
}

// Alternative export for better tree shaking
export { RegexIcon, CaseIcon, WholeWordIcon }
