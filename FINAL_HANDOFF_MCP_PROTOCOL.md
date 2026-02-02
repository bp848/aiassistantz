# クラウド社長室Z：MCP実機統合・最終技術仕様書

## 1. 開発ミッション
現在の「シミュレーションモード」を廃止し、Google Workspace MCPサーバを介した「実機稼働モード」へ完全移行せよ。

## 2. 実装コア要件

### A. MCPクライアントの実装 (`services/mcpService.ts`)
- **プロトコル**: MCP (Model Context Protocol) v1.0。
- **通信方式**: 外部MCPサーバ（Google Workspace等）とのSSE (Server-Sent Events) または WebSocket 接続。
- **認証**: Google OAuth 2.0 アクセストークンを `Authorization: Bearer` ヘッダに付与してMCPサーバへリクエストする。
- **メソッド実装**:
  - `listTools()`: サーバから利用可能なツール（gmail_search, calendar_create等）を取得。
  - `callTool(name, args)`: 指定されたツールを実行し、生データを返却。

### B. Gemini Tool Use 連携 (`services/geminiService.ts`)
- **優先順位**: `handleToolCall` 内で `mcp.callTool` を最優先で実行すること。
- **データ変換**: MCPサーバからのレスポンスを、UI側の `:::email` や `:::draft` 等のカスタムタグが期待するJSON形式に正規化してGeminiに返却せよ。
- **思考モデル**: `gemini-3-flash-preview`（通常）および `gemini-3-pro-preview`（高度相談）を使い分けること。

### C. 承認フローの厳守
- **書き込み権限**: `gmail_send` や `calendar_create` などの破壊的変更を伴うツールは、Geminiが直接完了させてはならない。
- **プロトコル**: 
  1. AIがドラフト作成ツールを呼ぶ。
  2. 結果を `:::draft { "to": "...", "subject": "...", "body": "..." } :::` タグで出力。
  3. UI上の「送信ボタン」をユーザーが押した際、初めて `submitMessage` 経由で実送信ツールを実行する。

## 3. UIタグ・プロトコル
UI側（`ChatMessage.tsx`）が処理可能な以下のタグ形式を維持せよ。
- `:::email { ... } :::` : リスト表示
- `:::draft { ... } :::` : 承認インターフェース
- `:::ticket { ... } :::` : 完了通知

## 4. セキュリティ
- APIキーは `process.env.API_KEY` を使用し、毎回 `new GoogleGenAI` でインスタンスを生成すること。
- ユーザーのアクセストークンはメモリ内でのみ保持し、永続化しないこと。

## 5. 接続テスト合格基準
1. 会話開始時にAIが「今日の予定」を自動でMCPから取得し、挨拶に反映すること。
2. 社長が「昨日の重要メールをまとめて」と言った際、実際のGmailから検索結果を取得すること。
3. メールの送信指示に対し、UI上に「送信ボタン」が表示され、クリックで実際にメールが届くこと。
