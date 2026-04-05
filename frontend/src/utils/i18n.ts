// Util Imports
import { ensurePrefix } from '@/utils/string'

// Locale system is removed from URLs; keep helper signature for compatibility.
export const getLocalizedUrl = (url: string, languageCode?: string): string => {
  if (!url) {
    throw new Error("URL can't be empty")
  }

  void languageCode

  return ensurePrefix(url, '/')
}

export const isUrlMissingLocale = () => true
