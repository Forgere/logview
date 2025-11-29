import { Link } from '@tanstack/solid-router'
import { createSignal } from 'solid-js'
import { FileText, Menu, Settings, X } from 'lucide-solid'

export default function Header() {
  const [isOpen, setIsOpen] = createSignal(false)

  return (
    <>
      <header class="flex items-center bg-[#1e1e1e] border-b border-[#333] text-white px-4 py-2">
        <button
          onClick={() => setIsOpen(true)}
          class="p-2 hover:bg-[#333] rounded transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/viewer" class="ml-3 flex items-center gap-2">
          <FileText size={20} class="text-blue-400" />
          <span class="text-lg font-semibold">HyperLog</span>
        </Link>
      </header>

      <aside
        class={`fixed top-0 left-0 h-full w-72 bg-[#252526] text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen() ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div class="flex items-center justify-between p-4 border-b border-[#333]">
          <h2 class="text-lg font-semibold">HyperLog</h2>
          <button
            onClick={() => setIsOpen(false)}
            class="p-2 hover:bg-[#333] rounded transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav class="flex-1 p-4 overflow-y-auto">
          <Link
            to="/viewer"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded hover:bg-[#333] transition-colors mb-2"
            activeProps={{
              class:
                'flex items-center gap-3 p-3 rounded bg-blue-600 hover:bg-blue-700 transition-colors mb-2',
            }}
          >
            <FileText size={18} />
            <span>Log Viewer</span>
          </Link>

          <Link
            to="/viewer"
            onClick={() => setIsOpen(false)}
            class="flex items-center gap-3 p-3 rounded hover:bg-[#333] transition-colors mb-2"
          >
            <Settings size={18} />
            <span>Settings</span>
          </Link>
        </nav>

        <div class="p-4 border-t border-[#333] text-sm text-gray-400">
          <p>Drop a log file to view</p>
        </div>
      </aside>

      {/* Overlay */}
      <div
        class={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          isOpen() ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />
    </>
  )
}
