# クラウド社長室Z AI秘書 - 内部構造説明書（フロントエンド）

このリポジトリは **Vercel 上で動くクライアント（React + Vite）** です。Gemini API は **本番では Vercel Serverless Function（`api/gemini-proxy.cjs`）経由**で呼び出し、API キーをクライアントに露出させない構成を推奨しています。

## 1. 全体構成（実装ベース）

```
Browser (Vercel)
  ├─ React UI (App.tsx / components/*)
  ├─ Supabase Auth (services/supabaseClient.ts)
  │    └─ Google OAuth セッション (provider_token)
  ├─ Gemini (services/geminiService.ts)
  │    └─ Vercel Function /api/gemini-proxy → Google Generative Language API
  └─ Google APIs (services/googleApi.ts)
       ├─ Gmail API (users/me/messages, send 等)
       └─ Calendar API (calendars/primary/events 等)

Supabase (backend)
  ├─ Auth: Google OAuth
  └─ Database: user profile/settings (services/userService.ts が参照)
```

重要:
- 本番運用では **`GEMINI_API_KEY` をサーバー環境変数として設定**し、`/api/gemini-proxy` 経由で呼び出します（API キーをクライアントに置かない）。
- Gmail/Calendar は **Supabase の OAuth セッションに含まれる `provider_token`** を Bearer として呼び出します。

## 2. 主要ファイル

### エントリ/画面
- `App.tsx` : 認証状態、セットアップ導線、チャット送信、全体 state 管理
- `components/AuthScreen.tsx` : Supabase OAuth（Google/LINE/Email）
- `components/IntegrationSetup.tsx` : Google 連携（トークンが無い場合の誘導）
- `components/WorkspacePanel.tsx` : ダッシュボード（予定/メール）。Google 未接続時は警告表示

### サービス層
- `services/supabaseClient.ts` : Supabase クライアント初期化
- `services/userService.ts` : ユーザー/秘書プロフィールの保存・取得
- `services/geminiService.ts` : Gemini へのストリーミング問い合わせ、（任意で）ツール呼び出し
- `services/googleApi.ts` : Gmail/Calendar の REST 呼び出し、scope チェック、エラーメッセージ整形

## 3. 認証フロー（Google）

1) `AuthScreen` / `IntegrationSetup` から `supabase.auth.signInWithOAuth({ provider: 'google', options: { scopes } })`
2) Supabase が OAuth コールバックを処理し、`session` をブラウザに永続化
3) `services/googleApi.ts` が `supabase.auth.getSession()` から `session.provider_token` を取得して Google API を呼ぶ

注意:
- `provider_token` が無い場合（Google でログインしていない / 権限未付与 / 旧セッション等）は Gmail/Calendar が使えません。
- scope 不足時は `googleApi.ts` が tokeninfo でスコープを検査し、「再接続して許可して」と明示します。

## 4. Gemini フロー（現状）

1) UI から送信 → `streamGeminiResponse()` 呼び出し
2) `@google/genai` の `chat.sendMessageStream()` でストリーミング受信
3) （モードによって）`tools` を指定

ツール設定の注意:
- Gemini API の制限で、**カスタム function calling と built-in tool（googleSearch/googleMaps）を同じリクエストで混在させると 400 になる場合**があります。
- 現実装では `RESEARCHER` は `googleSearch` のみ、`CONCIERGE` は `googleMaps` のみに切替えています。

## 5. 環境変数（クライアント）

Vite で参照されるため、クライアントで使うものは `VITE_` 接頭辞が必要です。

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_SCOPES`（`,` 区切り。UI 側で space 区切りに変換して Supabase OAuth に渡す）
- `VITE_GEMINI_API_KEY`
- `VITE_DEMO_MODE`（`true` で外部連携を抑制）

## 6. セキュリティ/運用メモ（重要）

- `.env.*` や `*.apikey*.txt` を **リポジトリにコミットしない**（このリポジトリでは `.gitignore` で除外）。
- 既に公開/共有された可能性があるキーは **必ずローテーション**してください。
- Gemini を本番で使うなら、クライアント直呼びではなく **サーバー/Edge 関数経由**で API キーを秘匿する構成を推奨します。
