# AI English Article Reader - プロジェクト構成

## ディレクトリ構成

```
english-reader/
├── client/                    # フロントエンド (React + TypeScript + Vite + Tailwind)
│   ├── public/
│   ├── src/
│   │   ├── components/        # 共通コンポーネント
│   │   │   ├── ui/            # 基本UIコンポーネント
│   │   │   ├── article/       # 記事関連コンポーネント
│   │   │   ├── vocabulary/    # 単語帳関連コンポーネント
│   │   │   └── settings/      # 設定関連コンポーネント
│   │   ├── pages/             # ページコンポーネント
│   │   │   ├── Home.tsx
│   │   │   ├── ArticleList.tsx
│   │   │   ├── ArticleView.tsx
│   │   │   ├── Vocabulary.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/             # カスタムフック
│   │   ├── services/          # API通信
│   │   ├── stores/            # 状態管理 (Zustand等)
│   │   ├── types/             # 型定義
│   │   ├── utils/             # ユーティリティ
│   │   ├── styles/            # グローバルスタイル
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/                    # バックエンド (Node.js + Hono + TypeScript)
│   ├── src/
│   │   ├── routes/            # APIルート
│   │   │   ├── topics.ts
│   │   │   ├── articles.ts
│   │   │   ├── vocabulary.ts
│   │   │   ├── word-lookup.ts
│   │   │   ├── reading.ts
│   │   │   ├── quiz.ts
│   │   │   └── settings.ts
│   │   ├── services/          # ビジネスロジック
│   │   │   ├── llm.ts         # LLM呼び出し共通
│   │   │   ├── article-generator.ts
│   │   │   ├── word-explainer.ts
│   │   │   ├── translator.ts
│   │   │   ├── quiz-generator.ts
│   │   │   └── cron.ts        # 定期実行
│   │   ├── db/                # データベース
│   │   │   ├── schema.ts      # テーブル定義
│   │   │   ├── migrations/    # マイグレーション
│   │   │   └── index.ts       # DB接続・初期化
│   │   ├── prompts/           # LLMプロンプト
│   │   │   ├── article-generation.md
│   │   │   ├── word-explanation.md
│   │   │   ├── translation.md
│   │   │   └── quiz-generation.md
│   │   ├── utils/             # ユーティリティ
│   │   ├── types/             # 型定義
│   │   └── index.ts           # エントリーポイント
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── shared/                    # 共通型定義
│   └── types.ts
│
├── logs/                      # ログファイル
│
├── package.json               # ルート package.json (workspaces)
├── README.md
└── .gitignore
```

---

## フェーズ1 実装計画

### 目標
- プロジェクト構成の構築
- DBスキーマ作成・初期化
- トピック一覧の表示・管理
- 記事のオンデマンド生成と保存
- 記事閲覧（基本表示のみ）

### タスク一覧

#### 1. プロジェクト初期化
- [ ] ルート package.json (workspaces設定)
- [ ] client: Vite + React + TypeScript + Tailwind セットアップ
- [ ] server: Hono + TypeScript + better-sqlite3 セットアップ
- [ ] 共通型定義 (shared/types.ts)
- [ ] ESLint/Prettier 設定

#### 2. データベース設計・実装
- [ ] better-sqlite3 での DB 接続・初期化
- [ ] テーブル作成: topics, articles, word_lookups, vocabulary, reading_sessions, quizzes, settings
- [ ] 初期トピックデータの投入
- [ ] マイグレーション機能

#### 3. バックエンド API 実装
- [ ] トピック CRUD API (GET, POST, PUT, DELETE, 再順序)
- [ ] 記事 API (一覧取得, 詳細取得, 生成, 既読更新)
- [ ] LLM 呼び出し共通モジュール (Anthropic API, リトライ, エラーハンドリング)
- [ ] 記事生成サービス (プロンプト適用, JSONパース, リトライ)
- [ ] 設定 API (取得, 更新)

#### 4. LLM プロンプト作成
- [ ] article-generation.md (記事生成プロンプト)
- [ ] word-explanation.md (単語解説プロンプト) - フェーズ2で使用
- [ ] translation.md (翻訳プロンプト) - フェーズ4で使用
- [ ] quiz-generation.md (クイズ生成プロンプト) - フェーズ4で使用

#### 5. フロントエンド実装
- [ ] レイアウト・ナビゲーション
- [ ] ホーム画面: トピックカード一覧
- [ ] 記事一覧画面: トピックごとの記事表示
- [ ] 記事閲覧画面: 基本表示 (タイトル, 本文, メタ情報)
- [ ] 設定画面: 基本構造 (タブ切り替え等)
- [ ] API クライアント (fetch ラッパー, エラーハンドリング)
- [ ] 状態管理 (Zustand でトピック、記事、設定を管理)

#### 6. 記事生成フロー統合
- [ ] 「新しい記事を生成」ボタン → ローディング表示 → 生成完了後リダイレクト
- [ ] 生成中の進捗表示
- [ ] エラー時のユーザー通知

#### 7. 基本スタイル・レスポンシブ対応
- [ ] Tailwind 設定 (カラーパレット, フォントサイズ, ダークモード)
- [ ] 読みやすい記事表示スタイル
- [ ] モバイルファーストのレスポンシブ対応

---

## 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (フロント + バックエンド同時)
npm run dev

# フロントエンドのみ
npm run dev:client

# バックエンドのみ
npm run dev:server

# ビルド
npm run build

# 型チェック
npm run typecheck

# リント
npm run lint

# DB初期化
npm run db:init
```

---

## 環境変数 (.env)

```env
# サーバー
PORT=3001
NODE_ENV=development

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL_ARTICLE=claude-3-haiku-20240307
ANTHROPIC_MODEL_WORD=claude-3-haiku-20240307

# データベース
DB_PATH=./data/app.db

# フロントエンド
VITE_API_URL=http://localhost:3001
```