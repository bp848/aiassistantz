# Cursor に送る用まとめ（そのまま貼り付け可）

---

## Google OAuth 設定（完了）

* **クライアントID**
  `1093393642444-9355fa81d5kru210offsv2dg7dkfuro6.apps.googleusercontent.com`
* **クライアントシークレット**
  `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`
* **状態**：有効
* **制限**：OAuth 同意画面が公開・確認されるまで **組織内ユーザー限定**

---

## 環境変数（フロント想定）

```env
VITE_GOOGLE_CLIENT_ID=1093393642444-9355fa81d5kru210offsv2dg7dkfuro6.apps.googleusercontent.com
```

※ **クライアントシークレットはフロントに置かない**（サーバー/MCP側のみで使用）

---

## Supabase（参考）

* **URL**
  `https://frbdpmqxgtgnjeccpbub.supabase.co`
* **Anon Key**
  取得済み
* **MCP Server URL**
  `https://mcp.supabase.com/mcp?project_ref=frbdpmqxgtgnjeccpbub`

---

以上。
