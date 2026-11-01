import { LogLevel } from '~/types'

const LEVEL_RE: Array<[LogLevel, RegExp]> = [
  [LogLevel.ERROR, /\b(?:ERROR|FATAL|CRITICAL)\b/i],
  [LogLevel.WARN, /\b(?:WARN|WARNING)\b/i],
  [LogLevel.DEBUG, /\b(?:DEBUG|TRACE)\b/i],
  [LogLevel.INFO, /\b(?:INFO)\b/i],
]

/** Detect the most significant log level present in a line. */
export function detectLevel(line: string): LogLevel {
  for (const [level, re] of LEVEL_RE) {
    if (re.test(line)) return level
  }
  return LogLevel.INFO
}

export const LOG_LEVELS: Array<LogLevel> = [
  LogLevel.ERROR,
  LogLevel.WARN,
  LogLevel.INFO,
  LogLevel.DEBUG,
]

export function isLevelToken(token: string): token is LogLevel {
  return (LOG_LEVELS as Array<string>).includes(token)
}
