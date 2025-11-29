export type DiffType = 'equal' | 'insert' | 'delete'

export interface DiffPart {
  type: DiffType
  value: string
}

/**
 * Character-level diff algorithm using LCS (Longest Common Subsequence)
 * Optimized for comparing log strings/selections
 */
export const diffChars = (text1: string, text2: string): DiffPart[] => {
  if (text1 === text2) return [{ type: 'equal', value: text1 }]
  if (!text1) return [{ type: 'insert', value: text2 }]
  if (!text2) return [{ type: 'delete', value: text1 }]

  // Compute LCS Matrix
  const n = text1.length
  const m = text2.length
  const lcs = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (text1[i - 1] === text2[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  // Backtrack to find the diff path
  const parts: DiffPart[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && text1[i - 1] === text2[j - 1]) {
      parts.unshift({ type: 'equal', value: text1[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      parts.unshift({ type: 'insert', value: text2[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
      parts.unshift({ type: 'delete', value: text1[i - 1] })
      i--
    }
  }

  // Compact adjacent parts of same type
  const compacted: DiffPart[] = []
  if (parts.length > 0) {
    let current = parts[0]
    for (let k = 1; k < parts.length; k++) {
      if (parts[k].type === current.type) {
        current.value += parts[k].value
      } else {
        compacted.push(current)
        current = parts[k]
      }
    }
    compacted.push(current)
  }

  return compacted
}
