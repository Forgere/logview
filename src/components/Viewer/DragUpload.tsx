import {
  Show,
  createSignal,
  onCleanup,
  onMount,
  type JSX,
  type ParentProps
} from 'solid-js';
import { Upload, FileText } from 'lucide-solid';

interface DragUploadProps {
  onFileSelect: (file: File) => void;
  hasFiles?: boolean; // Whether files are currently loaded
  children?: JSX.Element;
}

export const DragUpload = (props: DragUploadProps & ParentProps) => {
  // State for drag and drop
  const [isDragging, setIsDragging] = createSignal(false);
  let dragCounter = 0;

  // Create hidden file input element
  let fileInputRef: HTMLInputElement | undefined;

  // Handle drag enter
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  // Handle drag leave
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;

    // Timeout prevents flickering when moving between children
    setTimeout(() => {
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    }, 50);
  };

  // Handle drag over
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle drop
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter = 0;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      props.onFileSelect(file);
    }
  };

  // Handle file input change
  const handleFileInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      props.onFileSelect(target.files[0]);
    }
  };

  // Click handler to trigger file input
  const handleClick = () => {
    fileInputRef?.click();
  };

  // Setup event listeners on mount
  onMount(() => {
    // Attach listeners to the main document for global drag events
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    // Clean up event listeners on unmount
    onCleanup(() => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    });
  });

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        class="hidden"
        onChange={handleFileInput}
        accept=".log,.txt,.json,.csv,.xml,.html,.css,.js,.ts,.jsx,.tsx"
      />

      {/* Render children if provided */}
      {props.children}

      {/* Empty state when no files are loaded */}
      <Show when={!props.hasFiles}>
        <div
          class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 select-none z-10"
          onClick={handleClick}
        >
          <div class="w-16 h-16 bg-[#252526] rounded-2xl flex items-center justify-center mb-4 border border-[#333] cursor-pointer hover:bg-[#2a2a2a] transition-colors">
            <FileText size={32} class="opacity-50" />
          </div>
          <p class="text-lg font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">No file loaded</p>
          <p class="text-sm opacity-60 mt-2 cursor-pointer hover:text-gray-300 transition-colors">Drag & drop a log file or click to browse</p>
        </div>
      </Show>

      {/* Drag overlay */}
      <Show when={isDragging()}>
        <div class="fixed inset-0 z-50 pointer-events-none">
          <div class="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border-4 border-blue-500 border-dashed m-4 rounded-xl">
            <div class="bg-[#1e1e1e] p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 border border-[#333]">
              <div class="p-4 bg-blue-500/20 rounded-full text-blue-400">
                <Upload size={32} />
              </div>
              <div class="text-xl font-bold text-gray-200">Drop log file here</div>
              <div class="text-sm text-gray-500">Supports .log, .txt, and other text formats</div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};