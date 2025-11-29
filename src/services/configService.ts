import type {
  FileExtensionConfig,
  HighlightRule,
  ViewSettings,
} from '~/types'
import { DEFAULT_VIEW_SETTINGS } from '~/types'

const STORAGE_PREFIX = 'hyperlog_config_'

export const getExtension = (fileName: string): string => {
  const parts = fileName.split('.')
  if (parts.length > 1) {
    return '.' + parts[parts.length - 1].toLowerCase()
  }
  return 'default'
}

export const saveConfigForExtension = (
  extension: string,
  viewSettings: ViewSettings,
  highlightRules: HighlightRule[],
) => {
  const config: FileExtensionConfig = {
    extension,
    viewSettings,
    highlightRules,
  }
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${extension}`, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save config to local storage', e)
  }
}

export const loadConfigForExtension = (
  extension: string,
): FileExtensionConfig | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${extension}`)
    if (raw) {
      const parsed = JSON.parse(raw) as FileExtensionConfig
      // Merge with defaults to ensure new fields exist
      return {
        ...parsed,
        viewSettings: {
          ...DEFAULT_VIEW_SETTINGS,
          ...parsed.viewSettings,
          newLineConfig: {
            ...DEFAULT_VIEW_SETTINGS.newLineConfig,
            ...(parsed.viewSettings.newLineConfig || {}),
          },
        },
      }
    }
  } catch (e) {
    console.error('Failed to load config from local storage', e)
  }
  return null
}

export const clearConfigForExtension = (extension: string) => {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${extension}`)
  } catch (e) {
    console.error('Failed to clear config from local storage', e)
  }
}
