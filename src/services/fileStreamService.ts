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

    // Batching configuration to reduce function calls
    let lineBuffer: Array<string> = []
    const BATCH_SIZE = 5000

    try {
      const stream = file.stream()
      const textStream = stream.pipeThrough(new TextDecoderStream())
      const reader = textStream.getReader()

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        if (signal.aborted) {
          reader.cancel()
          break
        }

        while (this.isPaused) {
          await new Promise((r) => setTimeout(r, 100))
          if (signal.aborted) break
        }

        const { value, done } = await reader.read()

        if (done) {
          if (leftover) {
            lineBuffer.push(leftover)
          }
          if (lineBuffer.length > 0) {
            options.onChunk(lineBuffer)
          }
          options.onProgress(totalBytes, totalBytes)
          options.onComplete()
          break
        }

        bytesRead += value.length
        options.onProgress(Math.min(bytesRead, totalBytes), totalBytes)

        const chunk = leftover + value
        const lastNewlineIndex = chunk.lastIndexOf('\n')

        if (lastNewlineIndex !== -1) {
          const completeLines = chunk.substring(0, lastNewlineIndex)
          leftover = chunk.substring(lastNewlineIndex + 1)

          const newLines = completeLines.split('\n')

          for (const rawLine of newLines) {
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
            lineBuffer.push(line)

            if (lineBuffer.length >= BATCH_SIZE) {
              options.onChunk(lineBuffer)
              lineBuffer = []
              await new Promise((r) => setTimeout(r, 0))
            }
          }
        } else {
          leftover = chunk
        }
      }
    } catch (error) {
      if (!signal.aborted) {
        options.onError(error as Error)
      }
    }
  }

  public pause() {
    this.isPaused = true
  }

  public resume() {
    this.isPaused = false
  }

  public cancel() {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.isPaused = false
  }

  public get paused() {
    return this.isPaused
  }
}
