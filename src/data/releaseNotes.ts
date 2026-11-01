/**
 * Release notes shown in the "What's New" dialog.
 *
 * The list is ordered newest-first. Each entry's `version` is compared with
 * the last version the user has seen (stored preference) to decide whether
 * the dialog should open.
 */

export interface ReleaseNote {
  version: string
  date: string
  summary: string
  changes: Array<{
    type: 'Added' | 'Changed' | 'Fixed' | 'Removed'
    text: string
  }>
}

export const RELEASE_NOTES: Array<ReleaseNote> = [
  {
    version: '1.1.0',
    date: '2026-11-01',
    summary:
      'Installable app with offline support, preferences that survive a refresh, level filtering, and a round of polish on markers and theming.',
    changes: [
      {
        type: 'Added',
        text: 'Install HyperLog as a desktop or mobile app, and open it again with no network: after one online visit the app shell and editor are cached locally.',
      },
      {
        type: 'Added',
        text: 'Your preferences now survive a refresh — search options (regex, case, whole word), browse/follow view mode, watch mode, level filters, "matches only", and the marker panel size and open state.',
      },
      {
        type: 'Added',
        text: 'Filter the view by log level. Each level chip shows its count and can be switched off, and a Clear button brings every level back at once.',
      },
      {
        type: 'Added',
        text: 'A status bar shows the cursor line and column, the total line count, live streaming progress, and a per-level tally of the loaded file.',
      },
      {
        type: 'Added',
        text: 'Markers can carry a note. Click the note field in the marker panel to add or edit one inline, and use Export to save every marker as a JSON file.',
      },
      {
        type: 'Added',
        text: 'New shortcuts: F2 and Shift+F2 jump to the next and previous marker, Ctrl+M toggles "matches only", and Shift+? opens the shortcut reference.',
      },
      {
        type: 'Added',
        text: 'A "What\'s New" dialog greets you after an upgrade, reachable any time from the header, and links to the project on GitHub.',
      },
      {
        type: 'Changed',
        text: 'The interface is driven by a single set of design tokens, so panels, dialogs and the editor share one consistent dark palette instead of hand-picked colors.',
      },
      {
        type: 'Changed',
        text: 'Confirmations and notifications are in-app toasts and dialogs instead of browser pop-ups that interrupt streaming.',
      },
      {
        type: 'Fixed',
        text: '"Mark Selection" no longer reports an error when creating a marker, and the text selection clears afterwards as expected.',
      },
    ],
  },
]
