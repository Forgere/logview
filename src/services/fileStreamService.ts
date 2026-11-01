export interface StreamOptions {
  onChunk: (lines: Array<string>) => void
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

    const lineBuffer: Array<string> = []
    const MAX_BATCH = 500 // 每次 flush 的行数

    try {
      const stream = file.stream()
      const textStream = stream.pipeThrough(new TextDecoderStream())
      const reader = textStream.getReader()

      const isAborted = () => signal.aborted
      while (!isAborted()) {
        while (this.isPaused && !isAborted()) {
          await new Promise((r) => setTimeout(r, 100))
        }
        if (isAborted()) break

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
          const lines = complete.split('\n').map((l) => l.replace(/\r$/, ''))
          lineBuffer.push(...lines)

          while (lineBuffer.length >= MAX_BATCH) {
            const batch = lineBuffer.splice(0, MAX_BATCH)
            if (typeof window.requestIdleCallback === 'function') {
              window.requestIdleCallback(() => options.onChunk(batch))
            } else if (typeof window.requestAnimationFrame === 'function') {
              window.requestAnimationFrame(() => options.onChunk(batch))
            } else {
              // Fallback for environments without these APIs
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

  pause() {
    this.isPaused = true
  }
  resume() {
    this.isPaused = false
  }
  cancel() {
    this.abortController?.abort()
    this.isPaused = false
  }
  get paused() {
    return this.isPaused
  }
}
