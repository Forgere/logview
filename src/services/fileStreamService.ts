export interface StreamOptions {
  onChunk: (lines: string[]) => void
  onProgress: (bytesRead: number, totalBytes: number) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export class FileStreamer {
  private abortController: AbortController | null = null
  private isPaused = false

  public async streamFile(file: File, options: StreamOptions) {
    this.abortController = new AbortController()
    const signal = this.abortController.signal

    const totalBytes = file.size
    let bytesRead = 0
    let leftover = ''

    let lineBuffer: string[] = []
    const MAX_BATCH = 500 // 每次 flush 的行数

    try {
      const stream = file.stream()
      const textStream = stream.pipeThrough(new TextDecoderStream())
      const reader = textStream.getReader()

      while (true) {
        if (signal.aborted) { reader.cancel(); break }

        while (this.isPaused) { await new Promise(r => setTimeout(r, 100)); if (signal.aborted) break }

        const { value, done } = await reader.read()

        if (done) {
          if (leftover) lineBuffer.push(leftover)
          if (lineBuffer.length > 0) options.onChunk(lineBuffer)
          options.onProgress(totalBytes, totalBytes)
          options.onComplete()
          break
        }

        bytesRead += value.length
        options.onProgress(Math.min(bytesRead, totalBytes), totalBytes)

        const chunk = leftover + value
        const lastNewline = chunk.lastIndexOf('\n')

        if (lastNewline !== -1) {
          const complete = chunk.substring(0, lastNewline)
          leftover = chunk.substring(lastNewline + 1)
          const lines = complete.split('\n').map(l => l.replace(/\r$/, ''))
          lineBuffer.push(...lines)

          while (lineBuffer.length >= MAX_BATCH) {
            const batch = lineBuffer.splice(0, MAX_BATCH)
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window && window.requestIdleCallback) {
              window.requestIdleCallback(() => options.onChunk(batch))
            } else if (typeof window !== 'undefined' && 'requestAnimationFrame' in window && window.requestAnimationFrame) {
              window.requestAnimationFrame(() => options.onChunk(batch))
            } else {
              // Fallback for SSR or environments without these APIs
              options.onChunk(batch)
            }
          }
        } else {
          leftover = chunk
        }
      }
    } catch (err) {
      if (!signal.aborted) options.onError(err as Error)
    }
  }

  pause() { this.isPaused = true }
  resume() { this.isPaused = false }
  cancel() { this.abortController?.abort(); this.isPaused = false }
  get paused() { return this.isPaused }
}
