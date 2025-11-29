import { Show, onMount } from 'solid-js'
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

  return (
    <SearchErrorBoundary>
      <div class="flex-none bg-[#252526] border-b border-[#333] px-4 py-2 flex items-center gap-3 shadow-sm">
        <div class="relative flex-1 max-w-2xl flex items-center">
          <div class="absolute left-2 text-gray-500">
            <Search size={14} />
          </div>
          <input
            ref={props.inputRef || inputRef}
            type="text"
            value={props.query}
            onInput={(e) => props.setQuery(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search logs (Cmd+F)..."
            class="w-full h-8 bg-[#1e1e1e] border border-[#3e3e3e] rounded pl-8 pr-[160px] text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-gray-200 placeholder-gray-500 transition-colors"
          />
          <div class="absolute right-1 flex items-center gap-0.5 my-1 mr-1">
            <button
              onClick={props.onOpenHighlights}
              class="p-1 rounded hover:bg-[#333] text-gray-500 hover:text-yellow-400 transition-colors"
              title="Highlight Settings"
            >
              <Highlighter class="w-4 h-4" />
            </button>

            <div class="w-[1px] h-4 bg-[#333] mx-1" />

            <button
              onClick={() => props.setCaseSensitive(!props.caseSensitive)}
              class={`p-1 rounded hover:bg-[#333] transition-colors ${props.caseSensitive ? 'text-blue-400 bg-[#3a3a3a]' : 'text-gray-500'}`}
              title="Match Case (Alt+C)"
            >
              <CaseIcon class="w-4 h-4" />
            </button>
            <button
              onClick={() => props.setWholeWord(!props.wholeWord)}
              class={`p-1 rounded hover:bg-[#333] transition-colors ${props.wholeWord ? 'text-blue-400 bg-[#3a3a3a]' : 'text-gray-500'}`}
              title="Match Whole Word (Alt+W)"
            >
              <WholeWordIcon class="w-4 h-4" />
            </button>
            <button
              onClick={() => props.setRegexMode(!props.regexMode)}
              class={`p-1 rounded hover:bg-[#333] transition-colors ${props.regexMode ? 'text-blue-400 bg-[#3a3a3a]' : 'text-gray-500'}`}
              title="Use Regular Expression (Alt+R)"
            >
              <RegexIcon class="w-4 h-4" />
            </button>
          </div>
        </div>

        <Show when={props.query}>
          <div class="flex items-center gap-2 text-sm animate-in fade-in duration-200">
            <span class="text-gray-400 min-w-[60px] text-center font-mono text-xs">
              {props.resultsCount === 0
                ? '0/0'
                : `${props.currentResultIndex + 1}/${props.resultsCount}`}
            </span>
            <div class="flex bg-[#333] rounded border border-[#444]">
              <button
                onClick={props.onPrev}
                disabled={props.resultsCount === 0}
                class="p-1 hover:bg-[#444] text-gray-300 disabled:opacity-30 transition-colors"
              >
                <ArrowUp size={16} />
              </button>
              <div class="w-[1px] bg-[#444]" />
              <button
                onClick={props.onNext}
                disabled={props.resultsCount === 0}
                class="p-1 hover:bg-[#444] text-gray-300 disabled:opacity-30 transition-colors"
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
