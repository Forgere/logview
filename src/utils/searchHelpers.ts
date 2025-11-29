import type { SearchOptions } from '~/types'

/**
 * Build a regex from search options
 */
export const buildSearchRegex = (options: SearchOptions): RegExp | null => {
  if (!options.query) return null

  try {
    let pattern = options.query

    if (!options.isRegex) {
      // Escape special regex characters
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`
    }

    const flags = options.caseSensitive ? 'g' : 'gi'
    return new RegExp(pattern, flags)
  } catch {
    return null
  }
}

/**
 * Find all matches in a line
 */
export const findMatchesInLine = (
  line: string,
  regex: RegExp,
): Array<{ start: number; end: number }> => {
  const matches: Array<{ start: number; end: number }> = []

  // Reset lastIndex for global regex
  regex.lastIndex = 0

  let match
  while ((match = regex.exec(line)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
    })

    // Prevent infinite loop for zero-length matches
    if (match[0].length === 0) {
      regex.lastIndex++
    }
  }

  return matches
}
