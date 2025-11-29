import { Terminal } from 'lucide-solid'

export const ViewerHeader = () => {
  return (
    <header class="flex-none bg-[#1e1e1e] border-b border-[#333] relative select-none z-20">
      <div class="px-4 py-2 flex items-center justify-between">
        {/* Left Side: App Title & Actions */}
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-blue-400 font-bold text-lg mr-2">
            <Terminal size={20} />
            <span>HyperLog</span>
          </div>
        </div>

        {/* Right Side: Consolidated Status & Info */}
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-6 text-xs text-gray-500 border-r border-[#333] pr-4">
            {/* Consolidated Status Indicator */}
            {/* <div class={`flex items-center gap-2 font-bold ${status.color} transition-colors`}>
                {status.icon}
                <span>{status.label}</span>
                <span class="font-normal text-gray-500">{status.subLabel}</span>
                
                {/* Quick Action to Stop Watch */}
            {/* {watchPattern && (
                    <button 
                        onClick={() => setWatchPattern('')} 
                        class="ml-2 p-0.5 rounded hover:bg-[#333] text-gray-500 hover:text-white transition-colors"
                        title="Cancel Watch"
                    >
                        <X size={12} />
                    </button>
                )}
             </div>  */}

            {/* File Metadata */}
            {/* {fileName && (
              <div class="flex flex-col items-end leading-tight border-l border-[#333] pl-6 hidden sm:flex">
                <span class="text-gray-300 max-w-[200px] truncate" title={fileName}>{fileName}</span>
                <span class="text-[10px] text-gray-600">{formatBytes(fileSize)}</span>
              </div>
            )} */}

            {/* Line Count */}
            {/* <div class="min-w-[80px] text-right font-mono">{totalLines.toLocaleString()} lines</div> */}
          </div>

          {/* <button onClick={onOpenSettings} class="text-gray-500 hover:text-gray-300 transition-colors" title="Settings & Configuration">
             <Settings size={18} />
          </button>
          <button onClick={onOpenShortcuts} class="text-gray-500 hover:text-gray-300 transition-colors" title="Keyboard Shortcuts">
            <HelpCircle size={18} />
          </button> */}
        </div>
      </div>
    </header>
  )
}
