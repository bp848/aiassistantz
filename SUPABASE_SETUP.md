# Supabase OAuth設定ガイド

このアプリケーションは、SupabaseのOAuth機能を使用してGoogle認証を行います。以下の設定が必要です。

## 必要な設定

### 1. Supabase Authentication設定

1. Supabaseダッシュボード (https://supabase.com/dashboard) にログイン
2. プロジェクトを選択: `frbdpmqxgtgnjeccpbub`
3. **Authentication** → **Providers** に移動

### 2. Google Provider設定

1. **Google** プロバイダーを有効化
2. 以下の情報を入力:
   - **Client ID**: `1093393642444-nl87vspgqeb0jbdb6h6tmeddnsnsumsb.apps.googleusercontent.com`
   - **Client Secret**: `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`

3. **Scopes** (追加スコープ):
   ```
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   https://www.googleapis.com/auth/gmail.modify
   https://www.googleapis.com/auth/calendar
   ```

### 3. Redirect URLs設定

**Authentication** → **URL Configuration** で以下のURLを追加:

#### 本番環境
- Site URL: `https://assistant.b-p.co.jp`
- Redirect URLs:
  - `https://assistant.b-p.co.jp`
  - `https://assistant.b-p.co.jp/**`

#### 開発環境
- `http://localhost:3000`
- `http://localhost:3000/**`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3000/**`

### 4. Google Cloud Console設定

Google Cloud Console (https://console.cloud.google.com) で以下を設定:

1. **APIs & Services** → **Credentials**
2. OAuth 2.0 クライアントIDを選択
3. **承認済みのリダイレクト URI** に以下を追加:
   ```
   https://frbdpmqxgtgnjeccpbub.supabase.co/auth/v1/callback
   ```

### 5. API有効化

Google Cloud Consoleで以下のAPIを有効化:
- ✅ Google Calendar API
- ✅ Gmail API
- ✅ Google People API

## 環境変数

`.env.local` に以下の変数が必要:

```env
VITE_SUPABASE_URL=https://frbdpmqxgtgnjeccpbub.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSyBhKft1uPeMy05dOUV0juyvJtVVbV-8BxE
```

## トラブルシューティング

### エラー: "redirect_uri_mismatch"
- Google Cloud ConsoleのリダイレクトURIにSupabaseのコールバックURLが追加されているか確認
- 正しいURL: `https://frbdpmqxgtgnjeccpbub.supabase.co/auth/v1/callback`

### エラー: "No Google access token found"
- Supabaseの設定で追加スコープ (Gmail, Calendar) が正しく設定されているか確認
- Google OAuthの同意画面で全てのスコープを承認したか確認

### エラー: "Supabase is not configured"
- `.env.local` ファイルが存在し、正しい環境変数が設定されているか確認
- `VITE_` プレフィックスがあるか確認

## セキュリティ上の注意

1. **Client Secret**: フロントエンドには含まれません。Supabaseサーバー側で管理されます。
2. **Access Token**: SupabaseのセッションストレージでSecureに管理されます。
3. **CORS**: Supabaseが適切なCORS設定を自動的に管理します。

## 動作確認

設定が正しく完了すると:
1. ログイン画面で「Googleでログイン」をクリック
2. Google OAuth同意画面が表示される
3. メール、カレンダー、Gmailの権限を承認
4. ダッシュボードにリダイレクトされる
5. チャットでカレンダーとGmailが使用可能になる

## 参考リンク

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
