# デプロイ手順・本番設定

## 本番URL

- **本番アプリ**: https://aiassistantz-wheat.vercel.app
- **Vercel ダッシュボード**: https://vercel.com/bp848s-projects/aiassistantz

## 環境変数（Vercel に設定済み）

次の環境変数は Vercel の Production に設定済みです。

| 変数名 | 用途 |
|--------|------|
| `GEMINI_API_KEY` | Gemini API（必須） |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth（Workspace 連携） |
| `REACT_APP_SUPABASE_URL` | Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase |

変更する場合は Vercel → Project → Settings → Environment Variables で編集し、**Redeploy** してください。

## 本番で「使える」ために必要な1ステップ

**Google OAuth のリダイレクト URI に本番URLを追加してください。**

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 対象プロジェクト → **APIとサービス** → **認証情報**
3. 使用している **OAuth 2.0 クライアント ID**（ウェブアプリ）を開く
4. **承認済みのリダイレクト URI** に以下を追加:
   - `https://aiassistantz-wheat.vercel.app`
   - `https://aiassistantz-wheat.vercel.app/`
5. **保存**

これで本番から Google ログイン・Workspace 連携が利用できます。

## MCP（Google Workspace 実機連携）

本番では同一オリジンで `/api/mcp-sse` に接続するため、追加の `VITE_MCP_SERVER_URL` は不要です。  
必要に応じて Vercel の環境変数で `MCP_UPSTREAM_URL` を設定すると、API ルート経由で別の MCP アップストリームを指定できます。

## 再デプロイ

```bash
npm run build
npx vercel --prod --yes
```

または GitHub に push すると Vercel が自動でビルド・デプロイします。
