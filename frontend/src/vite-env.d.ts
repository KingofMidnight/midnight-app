/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_API_URL?: string
  readonly VITE_ADSENSE_CLIENT: string
  readonly VITE_ADSENSE_MANGA_MOBILE_BOTTOM?: string
  readonly VITE_ADSENSE_MANGA_LEFT?: string
  readonly VITE_ADSENSE_MANGA_RIGHT?: string
  readonly VITE_ADSENSE_NOVEL_MOBILE_BOTTOM?: string
  readonly VITE_ADSENSE_NOVEL_LEFT?: string
  readonly VITE_ADSENSE_NOVEL_RIGHT?: string
  readonly VITE_ADSENSE_TEST_MODE?: string
  readonly VITE_ADSENSE_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
