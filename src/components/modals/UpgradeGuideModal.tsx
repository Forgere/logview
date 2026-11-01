import { For, Show } from 'solid-js'
import { Download, ExternalLink, Sparkles } from 'lucide-solid'
import type { ReleaseNote } from '~/data/releaseNotes'
import { RELEASE_NOTES } from '~/data/releaseNotes'
import { APP_VERSION } from '~/lib/version'
import { GITHUB_URL } from '~/lib/constants'
import { usePwaInstall } from '~/lib/pwa'
import { Modal } from '~/components/ui/Modal'

const TYPE_STYLES: Record<ReleaseNote['changes'][number]['type'], string> = {
  Added: 'bg-success/15 text-success border-success/30',
  Changed: 'bg-info/15 text-info border-info/30',
  Fixed: 'bg-warning/15 text-warning border-warning/30',
  Removed: 'bg-destructive/15 text-destructive border-destructive/30',
}

interface UpgradeGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Release notes for the running version, shown once per version and reachable
 * from the header. Renders newest first.
 */
export function UpgradeGuideModal(props: UpgradeGuideModalProps) {
  const install = usePwaInstall()

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="What's New"
      class="w-[560px] max-w-[92vw]"
    >
      <div class="space-y-5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles size={14} class="text-accent-brand" />
            <span>
              HyperLog{' '}
              <span class="font-mono text-foreground">{APP_VERSION}</span>
            </span>
          </div>
          <Show when={install.isInstallable()}>
            <button
              onClick={() => {
                void install.promptInstall()
              }}
              class="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs text-foreground hover:bg-surface-2 transition-colors"
            >
              <Download size={12} />
              Install app
            </button>
          </Show>
        </div>

        <For each={RELEASE_NOTES}>
          {(release) => (
            <section class="space-y-2">
              <div class="flex items-baseline gap-2">
                <h4 class="font-semibold text-foreground">
                  v{release.version}
                </h4>
                <span class="text-xs text-muted-foreground">
                  {release.date}
                </span>
              </div>
              <p class="text-sm text-muted-foreground">{release.summary}</p>
              <ul class="space-y-1.5">
                <For each={release.changes}>
                  {(change) => (
                    <li class="flex items-start gap-2 text-sm">
                      <span
                        class={`mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] font-medium uppercase ${TYPE_STYLES[change.type]}`}
                      >
                        {change.type}
                      </span>
                      <span class="text-foreground">{change.text}</span>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          )}
        </For>

        <div class="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
          <p>
            Bookmarks are not stored between sessions — use Export in the marker
            panel to keep them. See UPGRADE.md for the full upgrade notes.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-1 text-accent-brand hover:underline"
          >
            <ExternalLink size={11} />
            Changelog & releases on GitHub
          </a>
        </div>
      </div>
    </Modal>
  )
}
