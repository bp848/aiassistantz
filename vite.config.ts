import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // ビルド時（Vercel 等）は process.env に注入されるため明示的にフォールバック。VITE_ も許容。
    const geminiKey = env.GEMINI_API_KEY ?? env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY ?? '';
    const supabaseUrl = env.REACT_APP_SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
    const supabaseAnon = env.REACT_APP_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? process.env.REACT_APP_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
