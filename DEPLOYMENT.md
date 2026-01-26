# 本番環境デプロイガイド

## 前提条件

- ✅ GitHubリポジトリ: `https://github.com/bp848/aiassistantz`
- ✅ Vercelプロジェクト: `prj_p2kiH3gdGHu3Rb7Mu4q3A4xUlBIn`
- ✅ 本番ドメイン: `https://assistant.b-p.co.jp`
- ✅ Supabaseプロジェクト: `frbdpmqxgtgnjeccpbub`

## デプロイ手順

### 1. Vercel環境変数の設定

Vercelダッシュボード (https://vercel.com/bp848/aiassistantz/settings/environment-variables) で以下を設定:

#### 必須環境変数

```env
# Supabase
VITE_SUPABASE_URL=https://frbdpmqxgtgnjeccpbub.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYmRwbXF4Z3RnbmplY2NwYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTU3MTksImV4cCI6MjA4MDI5MTcxOX0.jgNGsuA397o8AGvv-BL3cDXHKsLKCmGO_KrEcrdzv1k

# Gemini AI
VITE_GEMINI_API_KEY=AIzaSyBhKft1uPeMy05dOUV0juyvJtVVbV-8BxE

# Google APIs (Optional - for reference)
VITE_GOOGLE_CLIENT_ID=1093393642444-nl87vspgqeb0jbdb6h6tmeddnsnsumsb.apps.googleusercontent.com
```

**重要**: 
- すべて `Production` 環境に設定
- `VITE_GOOGLE_CLIENT_SECRET` は**設定不要** (Supabaseで管理)
- LINE関連は必要に応じて設定

### 2. Supabase本番URL設定

Supabaseダッシュボード (https://supabase.com/dashboard/project/frbdpmqxgtgnjeccpbub/auth/url-configuration):

#### Site URL
```
https://assistant.b-p.co.jp
```

#### Redirect URLs (1行ずつ追加)
```
https://assistant.b-p.co.jp
https://assistant.b-p.co.jp/**
http://localhost:3000
http://localhost:3000/**
```

### 3. Google Cloud Console設定

https://console.cloud.google.com/apis/credentials

OAuth 2.0 クライアント ID `1093393642444-nl87vspgqeb0jbdb6h6tmeddnsnsumsb` を選択:

#### 承認済みのリダイレクト URI
```
https://frbdpmqxgtgnjeccpbub.supabase.co/auth/v1/callback
```

#### 承認済みの JavaScript 生成元
```
https://assistant.b-p.co.jp
http://localhost:3000
```

### 4. ローカルビルドテスト

```powershell
# ビルド
npm run build

# プレビュー
npm run preview
```

### 5. Vercelへデプロイ

#### 方法1: CLIでデプロイ
```powershell
# Vercel CLIインストール (未インストールの場合)
npm install -g vercel

# ログイン
vercel login

# 本番デプロイ
vercel --prod
```

#### 方法2: GitHubプッシュで自動デプロイ
```powershell
git add .
git commit -m "feat: Production deployment ready"
git push origin main
```

Vercelが自動的にビルド・デプロイします。

### 6. デプロイ後の確認

1. **認証テスト**
   - https://assistant.b-p.co.jp にアクセス
   - 「Googleでログイン」をクリック
   - 権限を承認
   - ダッシュボードに到達

2. **API連携テスト**
   - チャットで「今日の予定を教えて」
   - チャットで「最新のメールを見せて」
   - WorkspacePanelにデータが表示される

3. **エラーログ確認**
   - Vercelダッシュボードでログを確認
   - ブラウザのコンソールでエラーを確認

## トラブルシューティング

### 問題: "redirect_uri_mismatch"
**解決策**: Google Cloud ConsoleにSupabaseのコールバックURLを追加
```
https://frbdpmqxgtgnjeccpbub.supabase.co/auth/v1/callback
```

### 問題: "No Google access token found"
**解決策**: Supabaseの追加スコープ設定を確認
```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar
```

### 問題: 環境変数が読み込まれない
**解決策**: 
1. Vercelダッシュボードで環境変数を確認
2. すべて `VITE_` プレフィックスがあるか確認
3. 再デプロイ実行

### 問題: ビルドエラー
**解決策**:
```powershell
# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# 再ビルド
npm run build
```

## セキュリティチェックリスト

- ✅ `.env.local` が `.gitignore` に含まれている
- ✅ Client Secretがフロントエンドコードにない
- ✅ SupabaseのRLSが有効
- ✅ CORS設定が適切
- ✅ HTTPSで通信

## ロールバック手順

問題が発生した場合:

1. Vercelダッシュボードで以前のデプロイメントに戻す
2. または:
```powershell
git revert HEAD
git push origin main
```

## モニタリング

- **Vercel Analytics**: https://vercel.com/bp848/aiassistantz/analytics
- **Supabase Logs**: https://supabase.com/dashboard/project/frbdpmqxgtgnjeccpbub/logs/explorer
- **Google API Console**: https://console.cloud.google.com/apis/dashboard

## サポート情報

- プロジェクトリポジトリ: https://github.com/bp848/aiassistantz
- Vercelプロジェクト: https://vercel.com/bp848/aiassistantz
- Supabaseプロジェクト: https://supabase.com/dashboard/project/frbdpmqxgtgnjeccpbub
