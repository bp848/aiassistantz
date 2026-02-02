# クラウド社長室Z：技術仕様および残機能実装引き継ぎ書

## 1. 現状のステータス (Status Quo)
- **UI/UX**: 社長秘書エージェントとしてのフロントエンドUI（React/Tailwind）は完成済み。
- **AIエンジン**: Google Gemini API (Gemini 3 Flash/Pro) との通信、ストリーミング、Function Callingの基盤は構築済み。
- **データ連携**: 現在は `geminiService.ts` 内のモック関数が「擬似的なカレンダー/メールデータ」を返している状態（シミュレーションモード）。

## 2. 未実装機能（残タスク）と実装ガイドライン

### A. MCP (Model Context Protocol) の実接続
- **目標ファイル**: `services/mcpService.ts`
- **実装内容**: 
  - `MCP v1.0` 仕様に基づき、Google Workspace MCPサーバへの接続クライアントを実装せよ。
  - 通信方式は `SSE (Server-Sent Events)` または `PostMessage/WebSocket` を想定。
  - `JSON-RPC 2.0` プロトコルによる `tools/call` メソッドの実装。
- **エンドポイント**: 実機サーバのURL（例: `https://mcp.your-domain.com/sse`）への接続。

### B. Google OAuth2 認証の統合
- **目標ファイル**: `components/IntegrationSetup.tsx`
- **実装内容**: 
  - `google-auth-library` 等を使用し、ユーザーのアクセストークンを取得。
  - 取得したトークンを `mcp.setAuth(token)` に渡し、MCPサーバへのリクエストヘッダ（`Authorization: Bearer`）に自動付与する仕組み。

### C. Gemini Tool Mapping の正規化
- **目標ファイル**: `services/geminiService.ts`
- **実装内容**: 
  - MCPサーバから返される「生データ」を、UIが理解できる `:::email` や `:::draft` タグに変換するアダプターの実装。
  - `manage_calendar` と `manage_gmail` の関数定義を、実際のMCPツール名（例: `google_calendar_list_events`）と完全に同期させること。

## 3. UI通信プロトコル (Tagging Protocol)
UI側（`ChatMessage.tsx`）は以下のカスタムタグをパースして特殊コンポーネントを表示する。
1. `:::email { "id": "...", "subject": "...", "from": "...", "unread": boolean } :::`
   - メールリストを表示し、代理返信ボタンを生成。
2. `:::draft { "to": "...", "subject": "...", "body": "..." } :::`
   - メールの承認・送信UIを表示。ユーザーが「送信」を押すと実ツールが発火する設計。
3. `:::ticket { "type": "...", "confirmationCode": "..." } :::`
   - 予約等の手配完了カードを表示。

## 4. セキュリティ要件
- **API Key**: 常に `process.env.API_KEY` を参照すること。
- **Data Privacy**: ユーザーのメール本文やカレンダー情報をアプリ側で永続化しない（オンメモリ処理）。
- **Safety Settings**: Gemini APIの安全設定を「BLOCK_ONLY_HIGH」に設定し、ビジネス利用に耐えうる自由度を確保すること。

## 5. 開発環境の準備
- `npm install @modelcontextprotocol/sdk` (MCP公式SDKの導入を推奨)
- Google Cloud Console での OAuth 2.0 クライアントIDの作成。
