# AI英語記事リーダー

英検2級レベルの英語記事を読み、語彙・速読・読解を練習する個人用Webアプリ。
**すべて無料で完結**します（APIキー不要がデフォルト）。

## 無料構成の方針

| 機能 | 無料の実現方法 | 有料案（任意） |
|---|---|---|
| 記事生成・単語解説 | 内蔵モック生成（キー不要・オフライン可） | — |
| より自然な生成 | Ollama（ローカルLLM、無料） | Anthropic API（.envで切替可） |
| DB | Node内蔵SQLite（追加費用ゼロ） | — |
| 音声再生（予定） | ブラウザWeb Speech API（無料） | — |

記事生成の質を上げたい場合のみ、後から無料のOllamaや無料枠のあるOpenAI互換APIに切り替えられます。
コード変更は不要で、`server/.env` の1行変更だけです。

## 必要環境

- Node.js 22以上（Node 24推奨。SQLiteが標準搭載のため）
- npm

## セットアップ

```bash
# 1. 依存関係インストール
npm install --workspaces

# 2. 環境ファイル作成（デフォルトのまま＝完全無料・キー不要で動きます）
copy server\.env.example server\.env

# 3. 開発サーバー起動（フロント :5173 ＋ API :3001）
npm run dev
```

ブラウザで http://localhost:5173 を開きます。
初回起動時にDB（`server/data/app.db`）と初期トピック10件が自動作成されます。

## 使い方（フェーズ1）

1. ホームでトピック（Technology等）を選ぶ
2. 「新しい記事を生成」で記事を作成（数秒で完了、ローディング表示あり）
3. 記事をクリックして読む
4. 「読み終わった」で既読化。未読数・新着バッジが更新される
5. 設定画面で記事の長さ（200/300/400/500語）・難易度・テーマを変更

## スマホから使う（同一Wi-Fi内）

サーバーはフロントも同梱配信するので、スマホは1つのURLでOKです。

```bash
# 1. フロントをビルド（初回・更新時のみ）
npm run build -w client

# 2. サーバー起動（server/.env の HOST=0.0.0.0 でLAN公開）
npm run dev:server
```

スマホのブラウザで `http://<PCのIP>:3001` を開きます（例: `http://192.168.11.3:3001`）。
PCのIPは `ipconfig` の「IPv4 アドレス」（192.168.x.x）で確認できます。

初回接続時にWindowsファイアウォールの許可ダイアログが出たら「許可」してください。
出ない・繋がらない場合は、管理者権限のPowerShellで以下を実行：

```powershell
netsh advfirewall firewall add rule name="AI English Reader" dir=in action=allow protocol=TCP localport=3001
```

## 無料LLMの切り替え（任意）

`server/.env` の `LLM_PROVIDER` を変更するだけです。

```env
# デフォルト（キー不要）
LLM_PROVIDER=mock

# Ollamaを使う場合（事前に https://ollama.com を入れ `ollama pull llama3.1:8b` と `ollama serve`）
LLM_PROVIDER=ollama
OLLAMA_MODEL_ARTICLE=llama3.1:8b

# OpenAI互換APIを使う場合（Groq等の無料枠、LM Studio等）
LLM_PROVIDER=openai-compat
OPENAI_BASE_URL=https://xxx/v1
OPENAI_API_KEY=...
OPENAI_MODEL_ARTICLE=...

# Anthropic（有料・任意）
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

モデル名は用途別（記事生成用 / 単語解説用）に `.env` で変更できます。

## プロジェクト構成

```
client/  React + TS + Vite + Tailwind（:5173、/apiは:3001へproxy）
server/  Hono + TS + Node内蔵SQLite（:3001）
  src/routes/    topics / articles / settings
  src/services/  llm.ts（プロバイダ抽象化）/ article-generator.ts / mock.ts
  src/prompts/   LLMプロンプト4種（.mdで独立管理）
  src/db/        スキーマ・初期データ
shared/  共通型（今後拡充）
logs/    app.log（サーバーログ）
```

## API一覧（フェーズ1）

- `GET /api/health` — 稼働確認＋LLMプロバイダ状態
- `GET /api/topics` — トピック一覧（未読数・最新タイトル付き）
- `POST /api/topics` / `PUT /api/topics/:id` / `DELETE /api/topics/:id`
- `GET /api/articles?topic=X` — 記事一覧
- `GET /api/articles/:id` — 記事詳細
- `POST /api/articles/generate {topic}` — 記事生成＋保存
- `PATCH /api/articles/:id/read {isRead}` — 既読管理
- `GET /api/settings` / `PUT /api/settings` — 設定取得・保存

## ログ

- `logs/app.log` — サーバーの動作・LLMエラー・リトライ記録
- `logs/server-out.log` — 開発サーバーの標準出力（任意）

## 次のフェーズ予定

- フェーズ2: 単語タップ→意味表示（キャッシュ付き）、単語帳
- フェーズ3: 定期自動生成、既読管理強化
- フェーズ4: WPM計測、理解度クイズ、日本語訳
- フェーズ5: 復習モード、CSVエクスポート、バックアップ
