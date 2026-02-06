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
2. Copy [.env.local.example](.env.local.example) to `.env.local` and set values. **Never commit `.env.local`** (it is in .gitignore).
   - `GEMINI_API_KEY` … Gemini API key
   - `VITE_GOOGLE_CLIENT_ID` … Google OAuth クライアントID（ログイン用）
3. Supabase: Authentication で **Google プロバイダー** を有効化し、**Site URL** にアプリのURL（例: `http://localhost:3000`）を設定
4. Run the app:
   `npm run dev`

## Deploy (Vercel)

本番では `.env.local` は使われません。**Vercel の環境変数**を設定してください。

1. Vercel Dashboard → プロジェクトを選択 → **Settings** → **Environment Variables**
2. 以下を追加（Production / Preview / Development にチェック）:
   - `GEMINI_API_KEY` … Google AI Studio の API キー
   - `VITE_GOOGLE_CLIENT_ID` … Google OAuth クライアントID
   - `REACT_APP_SUPABASE_URL` … Supabase プロジェクト URL（任意）
   - `REACT_APP_SUPABASE_ANON_KEY` … Supabase Anon Key（任意）
   - `VITE_MCP_SERVER_URL` … MCP Server URL（任意）
3. **Save** 後、**Redeploy**（Deployments → ⋮ → Redeploy）で再ビルドする

## セキュリティ

- **API キー・シークレットはリポジトリに含めない。** `.env.local` は .gitignore で除外されている。誤ってコミットした場合はキーを再発行すること。
- 本番ビルドでは環境変数がクライアントバンドルに埋め込まれる。厳密な秘匿が必要な場合はバックエンド経由のプロキイを検討すること。
