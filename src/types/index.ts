// Log levels for syntax highlighting and filtering
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

// Individual log line (used for parsed logs)
export interface LogLine {
  id: number
  content: string
  level: LogLevel
}

// Search match location
export interface SearchMatch {
  lineIndex: number
  matchIndex: number
}

// Monaco editor range for markers
export interface MarkerRange {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

// Bookmarked/marked line or selection
export interface LogMarker {
  id: string
  range: MarkerRange
  selectedText: string
  contextLine: string
  timestamp: string
  note?: string
}

// Custom highlight rule
export interface HighlightRule {
  id: string
  pattern: string
  color: string // Hex code for background
  textColor?: string // Hex code for text
  isRegex: boolean
  caseSensitive: boolean
  applyToWholeLine?: boolean
}

// Watch mode behavior
export type WatchMode = 'PAUSE_ALL' | 'MARK_ONLY'

// View settings for the log viewer
export interface ViewSettings {
  wrapLines: boolean
  rowHeight: number
  fontSize: number
  newLineConfig: {
    enabled: boolean
    match: string
    position: 'before' | 'after'
  }
}

// Settings persisted per file extension
export interface FileExtensionConfig {
  extension: string
  viewSettings: ViewSettings
  highlightRules: HighlightRule[]
}

// View mode: following new lines vs browsing
export type ViewMode = 'browse' | 'follow'

// Streaming status
export type StreamStatus = 'idle' | 'streaming' | 'paused' | 'finished'

// Panel types for grid layout
export type SplitDirection = 'horizontal' | 'vertical'

export interface PanelNode {
  id: string
  type: 'panel' | 'split'
  direction?: SplitDirection
  children?: PanelNode[]
  size?: number // flex ratio
  viewerId?: string // links to a viewer instance
}

// File info for display
export interface FileInfo {
  name: string
  size: number
  lastModified: number
  extension: string
}

// Search options
export interface SearchOptions {
  query: string
  isRegex: boolean
  caseSensitive: boolean
  wholeWord: boolean
}

// Default view settings
export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  wrapLines: false,
  rowHeight: 20,
  fontSize: 13,
  newLineConfig: {
    enabled: false,
    match: '',
    position: 'before',
  },
}

// Default highlight rules (common log patterns)
export const DEFAULT_HIGHLIGHT_RULES: HighlightRule[] = [
  {
    id: 'error-default',
    pattern: 'ERROR|FATAL|CRITICAL',
    color: '#ff6b6b33',
    textColor: '#ff6b6b',
    isRegex: true,
    caseSensitive: false,
    applyToWholeLine: true,
  },
  {
    id: 'warn-default',
    pattern: 'WARN|WARNING',
    color: '#facc1533',
    textColor: '#facc15',
    isRegex: true,
    caseSensitive: false,
    applyToWholeLine: true,
  },
]
