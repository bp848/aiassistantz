# 完成・リリースのためのタスクと必要情報一覧

## 1. 必要情報一覧（リリース前に用意するもの）

### 1.1 必須（アプリ動作に必要）

| 項目 | 説明 | 取得・設定場所 | コード上の参照 |
|------|------|----------------|----------------|
| **Gemini API キー** | AI チャット・音声・画像生成に使用 | [Google AI Studio](https://ai.google.dev/) で取得 | `.env.local` の `GEMINI_API_KEY` → Vite で `process.env.API_KEY` に注入 |
| **Supabase URL** | バックエンド（DB・Storage）の URL | [Supabase](https://supabase.com/) プロジェクトの Settings → API | `REACT_APP_SUPABASE_URL`（未設定時はコード内フォールバックあり） |
| **Supabase Anon Key** | 匿名アクセス用キー（公開可・RLS で保護） | 同上 | `REACT_APP_SUPABASE_ANON_KEY`（未設定時はフォールバックあり） |
| **Google OAuth クライアント ID** | Gmail・Calendar 連携用 | [Google Cloud Console](https://console.cloud.google.com/) → APIとサービス → 認証情報 → OAuth 2.0 クライアント ID | `IntegrationSetup.tsx` の `CLIENT_ID`（**要書き換え**） |
| **MCP ブリッジ URL** | Google Workspace 実機操作用 MCP サーバの SSE エンドポイント | 自前で MCP ブリッジをデプロイした URL | `mcpService.ts` の `serverUrl`（デフォルト: `https://mcp-bridge.local/sse`） |

### 1.2 推奨（本番運用・セキュリティ）

| 項目 | 説明 |
|------|------|
| **本番用 Supabase プロジェクト** | 開発用のハードコード URL/キーは本番では使わず、別プロジェクト＋環境変数で管理 |
| **承認済みリダイレクト URI** | Google OAuth に「本番ドメイン」を追加（例: `https://your-app.com`） |
| **CORS / ドメイン制限** | MCP ブリッジ・Supabase の許可オリジンに本番ドメインを追加 |

---

## 2. 環境変数まとめ

リリース時に設定する環境変数（ビルド時や実行環境に応じて設定）。

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `GEMINI_API_KEY` | ✅ | Gemini API キー | `AIza...` |
| `REACT_APP_SUPABASE_URL` | ⚠️ 推奨 | Supabase プロジェクト URL | `https://xxxx.supabase.co` |
| `REACT_APP_SUPABASE_ANON_KEY` | ⚠️ 推奨 | Supabase 匿名キー | `eyJ...` |

- ローカル開発: プロジェクトルートに `.env.local` を作成し、上記を記載（`.gitignore` で `*.local` が除外されているためコミットされない）。
- Vite は `.env.local` を読み、`vite.config.ts` の `define` で `process.env.API_KEY` に `GEMINI_API_KEY` を注入している。

---

## 3. コード内で「書き換え・設定」が必要な箇所

| ファイル | 箇所 | 内容 |
|----------|------|------|
| `services/mcpService.ts` | `serverUrl` | 本番の MCP ブリッジの SSE URL に変更（例: `https://mcp.your-domain.com/sse`）。環境変数化を推奨。 |
| `components/IntegrationSetup.tsx` | `CLIENT_ID` | Google Cloud で発行した OAuth 2.0 クライアント ID に置き換え。本番・開発で別クライアントにする場合は環境変数化を推奨。 |
| `services/supabaseClient.ts` | フォールバック URL/キー | 本番ではフォールバックを使わず、必ず `REACT_APP_SUPABASE_*` を設定すること。 |

---

## 4. インフラ・バックエンド準備（Supabase）

### DB がなくても動くか？

**はい、テーブルがなくてもアプリは動作します。**

- **ユーザー・秘書プロフィール** … まず `localStorage` を参照し、なければ Supabase を参照。テーブルがなくても `localStorage` で保存・取得するため問題なし。Supabase の保存・取得が失敗しても警告ログのみで落ちない。
- **資料アップロード（documents）** … Supabase Storage のバケットがなくても、エラー時に「ローカルモック」（メタデータのみ）や `localStorage` にフォールバックするため動作する。

本番で「複数端末で同じプロフィール」「資料をクラウドに永続化」したい場合は、以下でテーブル・バケットを作成するとよい。

### 4.1 テーブル

スキーマ定義は `supabase/schema.sql` を参照。Supabase Dashboard の SQL Editor で実行するか、`supabase db push` で適用する。

- **user_settings** … ユーザー・秘書プロフィール（Supabase Auth 連携）
  - `user_id` (uuid, PK, FK → auth.users(id))
  - `profile` (jsonb), `secretary_profile` (jsonb), `settings` (jsonb), `updated_at`
  - アプリは `supabase.auth.getSession()` で取得した `user.id` を `user_id` として使用。セッションがないときは localStorage のみ。
- **line_messages** … LINE メッセージ用（将来の LINE 連携）
- **line_users** … LINE ユーザー用（将来の LINE 連携）

### 4.2 ストレージ

- **バケット名:** `documents`
- 資料アップロード用。公開 URL で参照するため、必要に応じて RLS や公開ポリシーを設定。

### 4.3 推奨作業

1. Supabase ダッシュボードで上記テーブル・バケットを作成。
2. RLS（Row Level Security）を有効化し、認証ユーザー向けポリシーのみ許可する設計を検討。
3. 本番用プロジェクトでは、開発用のフォールバック URL/キーを使わないようにする。

---

## 5. 認証・本番化タスク（モックの置き換え）

| # | タスク | 優先度 | 現状 | 対応内容 |
|---|--------|--------|------|----------|
| 1 | **認証の実装** | 高 | `AuthScreen.tsx` で Google/LINE/メールがモック（setTimeout で固定ユーザーで完了） | Supabase Auth または Firebase Auth 等で実際のログイン・セッション管理を実装 |
| 2 | **Google OAuth 本番設定** | 高 | `CLIENT_ID` がプレースホルダー | Google Cloud で OAuth クライアントを作成し、本番リダイレクト URI を登録。`CLIENT_ID` を差し替え（または環境変数化） |
| 3 | **MCP ブリッジのデプロイ** | 高 | `serverUrl` がローカル想定 | Gmail/Calendar 用 MCP サーバを本番ホストにデプロイし、`serverUrl` を本番 URL に変更（または環境変数化） |
| 4 | **OAuth トークンの受け渡し** | 中 | IntegrationSetup でハッシュから `access_token` 取得 → MCP に渡す流れは実装済み | リフレッシュトークン・有効期限の扱いと、トークン失効時の再認証フローを整備 |

---

## 6. 環境・ビルド・デプロイタスク

| # | タスク | 優先度 | 内容 |
|---|--------|--------|------|
| 1 | **環境変数の本番用整理** | 高 | 本番では `GEMINI_API_KEY` および Supabase を必ず環境変数で渡す。Vite の `define` はビルド時に埋め込むため、CI/デプロイ先で変数を設定すること。 |
| 2 | **MCP serverUrl の環境変数化** | 推奨 | `mcpService.ts` の `serverUrl` を `import.meta.env.VITE_MCP_SERVER_URL` 等で読み込むようにし、環境ごとに切り替え可能にする。 |
| 3 | **OAuth CLIENT_ID の環境変数化** | 推奨 | `VITE_GOOGLE_CLIENT_ID` 等で渡し、開発/本番で異なるクライアント ID を使えるようにする。 |
| 4 | **ビルド確認** | 高 | `npm run build` が成功すること、`npm run preview` で動作確認すること。 |
| 5 | **デプロイ先の選定と設定** | 高 | Vercel / Netlify / 自前サーバなど。SPA のためフォールバックで `index.html` を返す設定が必要。 |
| 6 | **Docker / CI の整備** | 任意 | 現状なし。必要なら Dockerfile や GitHub Actions でビルド・デプロイを自動化。 |

---

## 7. セキュリティ・品質チェック

| # | 項目 | 確認内容 |
|---|------|----------|
| 1 | **API キーの扱い** | `GEMINI_API_KEY` はサーバー側またはビルド時のみ使用。クライアントに露出しない設計（現状は Vite でビルド時に埋め込まれるため、ソースマップや公開バンドルに含まれないよう注意）。 |
| 2 | **Supabase Anon Key** | 公開前提のキー。RLS で権限を制限し、敏感な操作はサービスロールやバックエンド API に任せる設計を推奨。 |
| 3 | **OAuth トークン** | フロントのみで保持する場合、XSS 対策を徹底。必要に応じてバックエンドでトークンを保持し、MCP 呼び出しはプロキシ経由にする検討。 |
| 4 | **.gitignore** | `.env.local` および `*.local` が除外されていることを確認済み。本番用の `.env.production` 等もリポジトリに含めないこと。 |

---

## 8. ドキュメント・運用

| # | タスク | 内容 |
|---|--------|------|
| 1 | **README の更新** | 本番デプロイ手順、必要な環境変数一覧、Supabase テーブル/ストレージの作成手順を追記。 |
| 2 | **.env の例の統一** | `.env.local.example` に `REACT_APP_SUPABASE_URL` / `REACT_APP_SUPABASE_ANON_KEY` を追記。README の `GEMINI_API_KEY` と合わせて「必要情報」を一覧化。 |
| 3 | **利用規約・プライバシーポリシー** | 本番公開前に、Google OAuth 同意画面やサービス利用に必要なページを用意する。 |

---

## 9. タスク実施の優先順位（サマリ）

1. **必須情報の準備** … Gemini API キー、Supabase（本番用推奨）、Google OAuth クライアント ID、MCP ブリッジ URL。
2. **Supabase の準備** … `user_settings` テーブルと `documents` バケットの作成。
3. **コードの書き換え** … `CLIENT_ID`・`serverUrl` の本番値（または環境変数化）。
4. **認証の本番化** … モック認証を実認証に置き換え。
5. **ビルド・デプロイ** … `npm run build` とデプロイ先の設定。
6. **セキュリティ・ドキュメント** … 上記チェックと README 等の更新。

---

## 10. 参照ファイル一覧

- 環境変数・ビルド: `vite.config.ts`, `.env.local.example`
- 認証 UI: `components/AuthScreen.tsx`, `components/IntegrationSetup.tsx`
- MCP: `services/mcpService.ts`
- Supabase: `services/supabaseClient.ts`, `services/userService.ts`, `services/documentStore.ts`
- Gemini: `services/geminiService.ts`, `services/liveService.ts`
