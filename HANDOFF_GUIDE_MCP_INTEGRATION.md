# クラウド社長室Z：技術設計・MCP連携ハンドオフ資料

## 1. アプリケーション概要
本アプリは、Google Gemini APIを中核に据えた「社長専属秘書エージェント」のプロトタイプです。
現在は**「シミュレーションモード」**で動作しており、カレンダーやメールの操作は `geminiService.ts` 内の固定データを用いた擬似的なものです。

## 2. システム構造とファイル構成
- `App.tsx`: メインエントリ。状態管理、セッション制御、UIモードの切り替えを統括。
- `services/geminiService.ts`: AIエンジンの心臓部。Function Calling、システムプロンプト、ストリーミング処理を定義。
- `components/ChatMessage.tsx`: AIの応答をパースし、特殊UI（メール、チケット、ドラフト）をレンダリングするプロトコル処理層。
- `components/WorkspacePanel.tsx`: 画面右側の「社長室」パネル。カレンダーやメールリストの表示、AIの思考プロセスの可視化。
- `services/liveService.ts`: Gemini Live API (Native Audio) を用いたリアルタイム音声対話の実装。

## 3. 重要：セキュリティ・APIキー管理
- **APIキー**: `process.env.API_KEY` から取得することを厳守。
- **インスタンス生成**: APIキーの最新状態を反映するため、APIコール直前に `new GoogleGenAI({ apiKey: process.env.API_KEY })` を実行する設計。
- **制約**: コード内にAPIキーをハードコードしない。UI上でAPIキーを入力させるフォームを作成しない。

## 4. UI通信プロトコル（カスタムタグ）
AIは特定のUIを表示するために、テキスト応答内に以下のカスタムタグを含めます。`ChatMessage.tsx` がこれを正規表現でキャッチします。
- `:::email {JSON} :::`: メール受信リストを表示
- `:::draft {JSON} :::`: メールの返信案（送信承認ボタン付き）を表示
- `:::ticket {JSON} :::`: 手配完了カードを表示

## 5. Function Calling（現在のモック関数）
現在、以下の2つの関数が定義されていますが、これらは実通信を行わない「ハリボテ」です。
- `manage_calendar`: `action: 'list' | 'create'`
- `manage_gmail`: `action: 'search' | 'get_detail' | 'send'`

## 6. MCP接続時のミッション
実機接続（MCPサーバ経由）を行う際は、以下の変更を順次実施してください。

### ① インターフェースの置換
`geminiService.ts` 内の `handleToolCall` 関数を、実際のMCPツール呼び出し（Google SDKやMCPクライアント経由）に置き換える。
### ② コンテキストの能動的注入
ユーザーの「おはよう」等の発話に対し、MCP経由で「カレンダーの最新3件」と「緊急未読メール」を自動取得し、システムプロンプトまたは会話履歴の直前コンテキストとして注入する。
### ③ 承認フローの維持
`write` 操作（メール送信、予定作成）は、AIが直接完結させず、必ず `:::draft` タグを用いてUI上のユーザー承認を介在させること。
### ④ モードの切り替え
`App.tsx` の警告バッジ（シミュレーションモード表示）を削除し、`initializeUserContext` を通じて実データに基づくパーソナライゼーションを有効化する。

## 7. 推奨モデル
- 通常タスク: `gemini-3-flash-preview`
- 高度相談タスク: `gemini-3-pro-preview`
- 音声対話: `gemini-2.5-flash-native-audio-preview-12-2025`

---
このドキュメントを読み込んだエージェントは、既存の `:::タグ` プロトコルを破壊せずに、背後のロジックを実接続へとリプレースすることを最優先してください。