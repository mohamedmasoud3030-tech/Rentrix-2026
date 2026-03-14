/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SUPABASE_URL: string;
  readonly VITE_APP_SUPABASE_ANON_KEY: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }): (reloadPage?: boolean) => Promise<void>;
}
