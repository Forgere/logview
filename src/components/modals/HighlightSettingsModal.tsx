import { For, Show, createSignal } from 'solid-js'
import { PaintBucket, Plus, Trash2, Type } from 'lucide-solid'
import type { HighlightRule } from '~/types'
import { Modal } from '~/components/ui/Modal'

interface HighlightSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  rules: Array<HighlightRule>
  setRules: (rules: Array<HighlightRule>) => void
}

const toHex = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, '0')

export function HighlightSettingsModal(props: HighlightSettingsModalProps) {
  const [newPattern, setNewPattern] = createSignal('')
  const [baseBgColor, setBaseBgColor] = createSignal('#3b1111')
  const [bgOpacity, setBgOpacity] = createSignal(100)
  const [textColor, setTextColor] = createSignal('#fca5a5')
  const [isRegex, setIsRegex] = createSignal(false)
  const [isCaseSensitive, setIsCaseSensitive] = createSignal(false)
  const [applyToWholeLine, setApplyToWholeLine] = createSignal(false)

  const getFullBgColor = () => {
    if (bgOpacity() === 100) return baseBgColor()
    const alpha = Math.round((bgOpacity() / 100) * 255)
    return `${baseBgColor()}${toHex(alpha)}`
  }

  const handleAdd = (e: Event) => {
    e.preventDefault()
    if (!newPattern().trim()) return

    const newRule: HighlightRule = {
      id: Date.now().toString(),
      pattern: newPattern(),
      color: getFullBgColor(),
      textColor: textColor(),
      isRegex: isRegex(),
      caseSensitive: isCaseSensitive(),
      applyToWholeLine: applyToWholeLine(),
    }

    props.setRules([...props.rules, newRule])
    setNewPattern('')
  }

  const handleDelete = (id: string) => {
    props.setRules(props.rules.filter((r) => r.id !== id))
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Highlight Settings"
      class="w-[600px] h-[500px]"
    >
      <div class="flex flex-col h-full gap-4">
        {/* Compact Add Interface */}
        <form
          onSubmit={handleAdd}
          class="bg-surface-2 p-3 rounded border border-border flex flex-col gap-3 shadow-md"
        >
          {/* Top Row: Pattern & Toggles */}
          <div class="flex gap-2">
            <input
              type="text"
              value={newPattern()}
              onInput={(e) => setNewPattern(e.currentTarget.value)}
              placeholder="Enter pattern..."
              class="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent-brand font-mono"
              autofocus
            />
            <button
              type="submit"
              disabled={!newPattern().trim()}
              class="bg-accent-brand hover:bg-accent-brand/80 disabled:opacity-50 text-accent-brand-foreground px-4 rounded text-sm font-medium transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>

          <div class="flex items-center gap-4 text-xs text-muted-foreground">
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={isRegex()}
                onChange={(e) => setIsRegex(e.currentTarget.checked)}
                class="rounded border-border bg-surface-3"
              />
              Regex
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={isCaseSensitive()}
                onChange={(e) => setIsCaseSensitive(e.currentTarget.checked)}
                class="rounded border-border bg-surface-3"
              />
              Match Case
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <input
                type="checkbox"
                checked={applyToWholeLine()}
                onChange={(e) => setApplyToWholeLine(e.currentTarget.checked)}
                class="rounded border-border bg-surface-3"
              />
              Whole Line
            </label>
          </div>

          <div class="h-[1px] bg-border w-full" />

          {/* Bottom Row: Compact Color Controls */}
          <div class="flex items-center gap-6">
            {/* Background Control */}
            <div class="flex flex-col gap-1 flex-1">
              <div class="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <PaintBucket size={10} /> Background & Opacity
              </div>
              <div class="flex items-center gap-2 bg-surface p-1.5 rounded border border-border">
                <input
                  type="color"
                  value={baseBgColor()}
                  onInput={(e) => setBaseBgColor(e.currentTarget.value)}
                  class="w-6 h-6 basis-6 shrink-0 rounded cursor-pointer bg-transparent border-none p-0"
                  title="Choose Base Color"
                />
                <div class="flex flex-col flex-1 mx-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgOpacity()}
                    onInput={(e) =>
                      setBgOpacity(parseInt(e.currentTarget.value))
                    }
                    class="h-1.5 w-full bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent-brand"
                    title="Opacity"
                  />
                </div>
                <span class="text-xs font-mono text-muted-foreground w-8 text-right">
                  {bgOpacity()}%
                </span>
              </div>
            </div>

            {/* Text Control */}
            <div class="flex flex-col gap-1 w-[140px]">
              <div class="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <Type size={10} /> Text Color
              </div>
              <div class="flex items-center gap-2 bg-surface p-1.5 rounded border border-border">
                <input
                  type="color"
                  value={textColor()}
                  onInput={(e) => setTextColor(e.currentTarget.value)}
                  class="w-6 h-6 basis-6 shrink-0 rounded cursor-pointer bg-transparent border-none p-0"
                />
                <input
                  type="text"
                  value={textColor()}
                  onInput={(e) => setTextColor(e.currentTarget.value)}
                  class="flex-1 bg-transparent border-none text-xs text-surface-foreground font-mono outline-none"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div class="flex flex-col gap-1 w-[120px]">
              <div class="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-center">
                Preview
              </div>
              <div
                class="h-[34px] rounded border border-border flex items-center justify-center text-xs px-2 truncate"
                style={{
                  'background-color': getFullBgColor(),
                  color: textColor(),
                }}
              >
                abc...
              </div>
            </div>
          </div>
        </form>

        {/* Rules List */}
        <div class="flex-1 flex flex-col min-h-0 bg-surface border border-border rounded">
          <div class="px-3 py-2 bg-surface-2 border-b border-border text-xs font-semibold text-muted-foreground">
            Active Rules ({props.rules.length})
          </div>
          <div class="overflow-auto custom-scrollbar p-1 space-y-1">
            <Show
              when={props.rules.length > 0}
              fallback={
                <div class="text-center text-muted-foreground py-10 italic text-sm">
                  No highlight rules active
                </div>
              }
            >
              <For each={props.rules}>
                {(rule) => (
                  <div class="flex items-center gap-3 p-2 hover:bg-surface-2 rounded group transition-colors">
                    {/* Preview Swatch */}
                    <div
                      class="w-6 h-6 rounded border border-border flex items-center justify-center text-[10px] font-bold shadow-sm"
                      style={{
                        'background-color': rule.color,
                        color: rule.textColor,
                      }}
                    >
                      Ag
                    </div>

                    {/* Info */}
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                      <div class="text-sm font-mono text-foreground truncate">
                        {rule.pattern}
                      </div>
                      <div class="flex gap-2 text-[10px] text-muted-foreground">
                        <Show when={rule.isRegex}>
                          <span>Regex</span>
                        </Show>
                        <Show when={rule.caseSensitive}>
                          <span>Case</span>
                        </Show>
                        <Show when={rule.applyToWholeLine}>
                          <span>Line</span>
                        </Show>
                        <Show
                          when={
                            !rule.isRegex &&
                            !rule.caseSensitive &&
                            !rule.applyToWholeLine
                          }
                        >
                          <span>Simple</span>
                        </Show>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(rule.id)}
                      class="text-muted-foreground hover:text-level-error p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </Modal>
  )
}
