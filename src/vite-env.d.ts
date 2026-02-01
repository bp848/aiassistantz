/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE: string;
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_PROXY_URL: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_CLIENT_SECRET: string;
  readonly VITE_ADMIN_EMAILS: string;
  readonly VITE_CALENDAR_API_ENABLED: string;
  readonly VITE_GMAIL_API_ENABLED: string;
  readonly VITE_GOOGLE_CALENDAR_API_KEY: string;
  readonly VITE_GOOGLE_GMAIL_API_KEY: string;
  readonly VITE_GOOGLE_SCOPES: string;
  readonly VITE_LINE_CHANNEL_ACCESS_TOKEN: string;
  readonly VITE_LINE_CHANNEL_ID: string;
  readonly VITE_LINE_CHANNEL_SECRET: string;
  readonly VITE_LINE_REDIRECT_URI: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
