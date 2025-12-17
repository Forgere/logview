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
            <h4 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Display Options
            </h4>
            <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400">
              <CloudLightning size={10} />
              <span>
                Auto-saved for <b>{props.currentExtension}</b>
              </span>
            </div>
          </div>

          {/* Wrap Lines Toggle */}
          <div class="flex items-center justify-between p-3 bg-[#252526] rounded border border-[#333]">
            <div class="flex items-center gap-3">
              <AlignJustify size={18} class="text-blue-400" />
              <div>
                <div class="text-sm font-medium text-gray-200">
                  Text Wrapping
                </div>
                <div class="text-xs text-gray-500">
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
              <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Row Height Slider */}
          <div class="p-3 bg-[#252526] rounded border border-[#333] space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <MoveVertical size={16} class="text-blue-400" />
                <span class="text-sm font-medium text-gray-200">
                  Row Height
                </span>
              </div>
              <span class="text-xs font-mono bg-[#333] px-2 py-0.5 rounded text-gray-300">
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
              class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p class="text-[10px] text-gray-500 italic">
              Tip: Increase row height if Text Wrapping is enabled to prevent
              overlap.
            </p>
          </div>

          {/* Font Size Slider */}
          <div class="p-3 bg-[#252526] rounded border border-[#333] space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Type size={16} class="text-blue-400" />
                <span class="text-sm font-medium text-gray-200">Font Size</span>
              </div>
              <span class="text-xs font-mono bg-[#333] px-2 py-0.5 rounded text-gray-300">
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
              class="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* New Line On Match Config */}
          <div class="p-3 bg-[#252526] rounded border border-[#333] space-y-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <Split size={16} class="text-blue-400" />
                <div>
                  <div class="text-sm font-medium text-gray-200">
                    Custom Line Breaking
                  </div>
                  <div class="text-[10px] text-gray-500">
                    Insert new lines when a character is found.
                  </div>
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={props.viewSettings.newLineConfig?.enabled ?? false}
                  onChange={(e) =>
                    updateNewLineConfig({ enabled: e.currentTarget.checked })
                  }
                  class="sr-only peer"
                />
                <div class="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <Show when={props.viewSettings.newLineConfig?.enabled}>
              <div class="bg-[#1e1e1e] p-3 rounded border border-[#333] space-y-3 animate-in fade-in slide-in-from-top-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 w-20">Match Char:</span>
                  <input
                    type="text"
                    value={props.viewSettings.newLineConfig?.match || ''}
                    onInput={(e) =>
                      updateNewLineConfig({ match: e.currentTarget.value })
                    }
                    placeholder="e.g. | or ,"
                    class="flex-1 bg-[#252526] border border-[#444] rounded px-2 py-1 text-sm text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 w-20">
                    Break Position:
                  </span>
                  <div class="flex flex-1 gap-1 bg-[#252526] p-1 rounded border border-[#444]">
                    <button
                      onClick={() =>
                        updateNewLineConfig({ position: 'before' })
                      }
                      class={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs transition-colors ${props.viewSettings.newLineConfig?.position === 'before' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                    >
                      <ArrowLeftToLine size={12} /> Before
                    </button>
                    <button
                      onClick={() => updateNewLineConfig({ position: 'after' })}
                      class={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs transition-colors ${props.viewSettings.newLineConfig?.position === 'after' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
                    >
                      <ArrowRightToLine size={12} /> After
                    </button>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>

        <div class="flex justify-between border-t border-[#333] pt-4">
          <button
            onClick={handleReset}
            class="px-3 py-2 text-xs text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} /> Reset to Defaults
          </button>
          <button
            onClick={props.onClose}
            class="px-6 py-2 bg-[#333] hover:bg-[#444] text-white rounded text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
