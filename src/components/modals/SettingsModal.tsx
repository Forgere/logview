import { Show } from 'solid-js'
import {
  AlignJustify,
  ArrowLeftToLine,
  ArrowRightToLine,
  CloudLightning,
  MoveVertical,
  RefreshCw,
  Split,
  Type,
} from 'lucide-solid'
import type { ViewSettings } from '~/types'
import { Modal } from '~/components/ui/Modal'
import { DEFAULT_VIEW_SETTINGS } from '~/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  viewSettings: ViewSettings
  setViewSettings: (settings: ViewSettings) => void
  currentExtension: string
}

export function SettingsModal(props: SettingsModalProps) {
  const handleReset = () => {
    props.setViewSettings({ ...DEFAULT_VIEW_SETTINGS })
  }

  const updateNewLineConfig = (
    updates: Partial<ViewSettings['newLineConfig']>,
  ) => {
    props.setViewSettings({
      ...props.viewSettings,
      newLineConfig: {
        ...props.viewSettings.newLineConfig,
        ...updates,
      },
    })
  }

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="View Settings & Configuration"
      class="w-[500px]"
    >
      <div class="flex flex-col gap-6 p-1">
        {/* View Settings Section */}
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Display Options
            </h4>
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-brand/10 border border-accent-brand/20 text-[10px] text-accent-brand">
              <CloudLightning size={10} />
              <span>
                Auto-saved for <b>{props.currentExtension}</b>
              </span>
            </div>
          </div>

          {/* Wrap Lines Toggle */}
          <div class="flex items-center justify-between p-3 bg-surface-2 rounded border border-border">
            <div class="flex items-center gap-3">
              <AlignJustify size={18} class="text-accent-brand" />
              <div>
                <div class="text-sm font-medium text-foreground">
                  Text Wrapping
                </div>
                <div class="text-xs text-muted-foreground">
                  Wrap long lines to fit the window width.
                </div>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={props.viewSettings.wrapLines}
                onChange={(e) =>
                  props.setViewSettings({
                    ...props.viewSettings,
                    wrapLines: e.currentTarget.checked,
                  })
                }
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-brand"></div>
            </label>
          </div>

          {/* Row Height Slider */}
          <div class="p-3 bg-surface-2 rounded border border-border space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <MoveVertical size={16} class="text-accent-brand" />
                <span class="text-sm font-medium text-foreground">
                  Row Height
                </span>
              </div>
              <span class="text-xs font-mono bg-surface-3 px-2 py-0.5 rounded text-surface-foreground">
                {props.viewSettings.rowHeight}px
              </span>
            </div>
            <input
              type="range"
              min="16"
              max="100"
              step="2"
              value={props.viewSettings.rowHeight}
              onInput={(e) =>
                props.setViewSettings({
                  ...props.viewSettings,
                  rowHeight: parseInt(e.currentTarget.value),
                })
              }
              class="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent-brand"
            />
            <p class="text-[10px] text-muted-foreground italic">
              Tip: Increase row height if Text Wrapping is enabled to prevent
              overlap.
            </p>
          </div>

          {/* Font Size Slider */}
          <div class="p-3 bg-surface-2 rounded border border-border space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Type size={16} class="text-accent-brand" />
                <span class="text-sm font-medium text-foreground">
                  Font Size
                </span>
              </div>
              <span class="text-xs font-mono bg-surface-3 px-2 py-0.5 rounded text-surface-foreground">
                {props.viewSettings.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="24"
              step="1"
              value={props.viewSettings.fontSize}
              onInput={(e) =>
                props.setViewSettings({
                  ...props.viewSettings,
                  fontSize: parseInt(e.currentTarget.value),
                })
              }
              class="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent-brand"
            />
          </div>

          {/* New Line On Match Config */}
          <div class="p-3 bg-surface-2 rounded border border-border space-y-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <Split size={16} class="text-accent-brand" />
                <div>
                  <div class="text-sm font-medium text-foreground">
                    Custom Line Breaking
                  </div>
                  <div class="text-[10px] text-muted-foreground">
                    Insert new lines when a character is found.
                  </div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={props.viewSettings.newLineConfig.enabled}
                  onChange={(e) =>
                    updateNewLineConfig({ enabled: e.currentTarget.checked })
                  }
                  class="sr-only peer"
                />
                <div class="w-9 h-5 bg-surface-3 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-brand"></div>
              </label>
            </div>

            <Show when={props.viewSettings.newLineConfig.enabled}>
              <div class="bg-surface p-3 rounded border border-border space-y-3 animate-in fade-in slide-in-from-top-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground w-20">
                    Match Char:
                  </span>
                  <input
                    type="text"
                    value={props.viewSettings.newLineConfig.match}
                    onInput={(e) =>
                      updateNewLineConfig({ match: e.currentTarget.value })
                    }
                    placeholder="e.g. | or ,"
                    class="flex-1 bg-surface-2 border border-border rounded px-2 py-1 text-sm text-foreground font-mono outline-none focus:border-accent-brand"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-muted-foreground w-20">
                    Break Position:
                  </span>
                  <div class="flex flex-1 gap-1 bg-surface-2 p-1 rounded border border-border">
                    <button
                      onClick={() =>
                        updateNewLineConfig({ position: 'before' })
                      }
                      class={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs transition-colors ${props.viewSettings.newLineConfig.position === 'before' ? 'bg-accent-brand text-accent-brand-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3'}`}
                    >
                      <ArrowLeftToLine size={12} /> Before
                    </button>
                    <button
                      onClick={() => updateNewLineConfig({ position: 'after' })}
                      class={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs transition-colors ${props.viewSettings.newLineConfig.position === 'after' ? 'bg-accent-brand text-accent-brand-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3'}`}
                    >
                      <ArrowRightToLine size={12} /> After
                    </button>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>

        <div class="flex justify-between border-t border-border pt-4">
          <button
            onClick={handleReset}
            class="px-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} /> Reset to Defaults
          </button>
          <button
            onClick={props.onClose}
            class="px-6 py-2 bg-surface-3 hover:bg-surface-2 text-foreground rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
