import { createContext, useContext } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { ParentProps } from "solid-js";
import type { FileInfo, ViewMode, ViewSettings, WatchMode } from "~/types";
import { FileStreamer } from "~/services/fileStreamService";

interface LogState {
  file: FileInfo | null;

  // IMPORTANT: rawLines must exist (you used it in reprocessLines)
  rawLines: Array<string>;

  lines: Array<string>;
  lastNewLineConfig: ViewSettings["newLineConfig"] | null;

  isStreaming: boolean;
  progress: number;

  viewMode: ViewMode;

  watchPattern: string;
  watchMode: WatchMode;
  watchMatchIndex: number | null;

  pendingWatchMatches: Array<number>;

  lastScrollRequest: number;
}

interface LogActions {
  loadFile: (file: File, cfg: ViewSettings["newLineConfig"]) => void;
  reset: () => void;
  setViewMode: (mode: ViewMode) => void;
  setWatchPattern: (pattern: string) => void;
  setWatchMode: (mode: WatchMode) => void;
  setWatchMatchIndex: (index: number | null) => void;
  clearPendingWatchMatches: () => void;
  togglePause: () => void;
  resumeFollowing: () => void;
  reprocessLines: (cfg: ViewSettings["newLineConfig"]) => void;
}

type LogStore = [LogState, LogActions];

const LogContext = createContext<LogStore>();

/** --------------------------------------
 *  Chunk Processor
 * -------------------------------------*/
const processChunk = (
  chunk: Array<string>,
  config: ViewSettings["newLineConfig"]
): Array<string> => {
  if (!config.enabled || !config.match) return chunk;

  const { match, position } = config;
  const result: Array<string> = [];

  for (const line of chunk) {
    if (line.indexOf(match) === -1) {
      result.push(line);
      continue;
    }

    const parts = line.split(match);
    if (parts.length === 1) {
      result.push(parts[0]);
      continue;
    }

    if (position === "after") {
      const len = parts.length;
      for (let j = 0; j < len - 1; j++) {
        result.push(parts[j] + match);
      }
      result.push(parts[len - 1]);
    } else {
      result.push(parts[0]);
      for (let j = 1; j < parts.length; j++) {
        result.push(match + parts[j]);
      }
    }
  }
  return result;
};

/** =======================================================================
 *
 *                           LogProvider
 *
 * =======================================================================*/

export function LogProvider(props: ParentProps) {
  let streamer: FileStreamer | null = null;
  let uiUpdateTimer: number | null = null;
  let pendingBuffer: Array<string> = [];

  const [state, setState] = createStore<LogState>({
    file: null,
    rawLines: [],          // <-- FIX: this was missing
    lines: [],
    lastNewLineConfig: null,
    isStreaming: false,
    progress: 0,
    viewMode: "follow",
    watchPattern: "",
    watchMode: "PAUSE_ALL",
    watchMatchIndex: null,
    pendingWatchMatches: [],
    lastScrollRequest: 0,
  });

  /** ---------------------------------
   *            FLUSH BUFFER
   * --------------------------------*/
  const flushBuffer = () => {
    if (pendingBuffer.length === 0) return;

    const chunkToAppend = [...pendingBuffer];
    pendingBuffer = [];

    setState(
      produce((s) => {
        const startIndex = s.lines.length;

        // WATCH MATCHING
        if (s.watchPattern) {
          const lowerPattern = s.watchPattern.toLowerCase();

          const matches: number[] = [];
          for (let i = 0; i < chunkToAppend.length; i++) {
            if (chunkToAppend[i].toLowerCase().includes(lowerPattern)) {
              matches.push(startIndex + i);
            }
          }

          if (matches.length > 0) {
            if (s.watchMode === "MARK_ONLY") {
              // FIX: use setState outside produce
              // → mark to another array first
              s.pendingWatchMatches = [...s.pendingWatchMatches, ...matches];
            } else {
              if (s.watchMatchIndex == null) {
                s.watchMatchIndex = matches[0];
                s.viewMode = "browse";
              }
            }
          }
        }

        /** IMPORTANT：
         *  You cannot push directly – but in produce, it's allowed,
         *  still better to assign for safety.
         */
        s.lines = [...s.lines, ...chunkToAppend];

        if (s.viewMode === "follow") {
          s.lastScrollRequest = Date.now();
        }
      })
    );
  };

  /** ---------------------------------
   *              ACTIONS
   * --------------------------------*/
  const actions: LogActions = {
    loadFile: (file, newLineConfig) => {
      actions.reset();

      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      setState({
        file: {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          extension: ext ? `.${ext}` : "default",
        },
        lastNewLineConfig: newLineConfig,
        isStreaming: true,
        viewMode: "follow",
        watchMatchIndex: null,
        pendingWatchMatches: [],
      });

      streamer = new FileStreamer();
      uiUpdateTimer = window.setInterval(flushBuffer, 200);

      streamer.streamFile(file, {
        onChunk: (chunkLines) => {
          // FIX: store raw lines
          setState("rawLines", (prev) => [...prev, ...chunkLines]);

          const processed = processChunk(chunkLines, newLineConfig);
          pendingBuffer.push(...processed);
        },

        onProgress: (bytesRead, totalBytes) => {
          setState("progress", (bytesRead / totalBytes) * 100);
        },

        onComplete: () => {
          flushBuffer();
          setState("isStreaming", false);
          if (uiUpdateTimer) {
            clearInterval(uiUpdateTimer);
            uiUpdateTimer = null;
          }
          if (state.viewMode === "follow") {
            setState("lastScrollRequest", Date.now());
          }
        },

        onError: (err) => {
          console.error("Stream error", err);
          setState("isStreaming", false);
          alert("Error reading file: " + err.message);
        },
      });
    },

    reset: () => {
      streamer?.cancel();
      streamer = null;

      if (uiUpdateTimer) {
        clearInterval(uiUpdateTimer);
        uiUpdateTimer = null;
      }

      pendingBuffer = [];

      setState({
        file: null,
        rawLines: [],
        lines: [],
        lastNewLineConfig: null,
        isStreaming: false,
        progress: 0,
        viewMode: "follow",
        watchMatchIndex: null,
        pendingWatchMatches: [],
        lastScrollRequest: 0,
      });
    },

    setViewMode: (mode) => setState("viewMode", mode),

    setWatchPattern: (pattern) => {
      setState({
        watchPattern: pattern,
        watchMatchIndex: null,
      });
    },

    setWatchMode: (mode) => setState("watchMode", mode),

    setWatchMatchIndex: (idx) => setState("watchMatchIndex", idx),

    clearPendingWatchMatches: () => setState("pendingWatchMatches", []),

    togglePause: () => {
      if (state.isStreaming) {
        streamer?.pause();
        setState("isStreaming", false);
      } else if (state.progress < 100 && state.file) {
        streamer?.resume();
        setState("isStreaming", true);

        if (!uiUpdateTimer) {
          uiUpdateTimer = window.setInterval(flushBuffer, 200);
        }

        setState("watchMatchIndex", null);
      }
    },

    resumeFollowing: () => {
      setState({
        viewMode: "follow",
        watchMatchIndex: null,
      });
    },

    reprocessLines: (newLineConfig) => {
      if (state.rawLines.length === 0) return;

      const processed = processChunk(state.rawLines, newLineConfig);

      setState({
        lines: processed,
        watchMatchIndex: null,
        pendingWatchMatches: [],
      });
    },
  };

  return (
    <LogContext.Provider value={[state, actions]}>
      {props.children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const ctx = useContext(LogContext);
  if (!ctx) throw new Error("useLog must be used within a LogProvider");
  return ctx;
}
