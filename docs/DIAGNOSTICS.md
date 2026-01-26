# Diagnostics (Gemini / Gmail)

## 1) Gemini API 呼び出しテスト（ローカル/CI）

前提:
- `VITE_GEMINI_API_KEY` が設定されていること（`.env.local` もしくは実行環境の env）

実行:
- `node scripts/verify-gemini.mjs`

期待結果:
- `OK` が表示される（HTTP 200 相当）
- 失敗時はエラー内容（無効キー/権限/モデル名など）が表示される

## 2) Gmail API 有効化の反映確認

Gmail API が未有効の場合やスコープ不足の場合、Gmail API は 403 を返します。

実行（アクセストークンが必要）:
- `GOOGLE_ACCESS_TOKEN="<token>" node scripts/verify-gmail.mjs`

トークン取得例:
- ブラウザで Google ログイン後、`supabase.auth.getSession()` の `provider_token` を DevTools で確認して使用

期待結果:
- `OK` が表示される（`users/me/profile` が 200）
- 403 の場合、メッセージに `insufficientPermissions` / `accessNotConfigured` などのヒントが出る

