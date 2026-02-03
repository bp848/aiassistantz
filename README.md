<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/11YfeiAFYMJtyb_4ipEC8tlzJw6nxMBUV

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set environment variables in [.env.local](.env.local):
   - `GEMINI_API_KEY` … Gemini API key
   - `VITE_GOOGLE_CLIENT_ID` … Google OAuth クライアントID（ログイン用）
3. Supabase: Authentication で **Google プロバイダー** を有効化し、**Site URL** にアプリのURL（例: `http://localhost:3000`）を設定
4. Run the app:
   `npm run dev`
