# My Diary App (Monorepo)

フロントエンド (Next.js) と IaC (AWS CDK) を同じリポジトリで管理するモノレポ構成です。  
日記データを検索・分析する RAG チャットアプリを構築することを目標としています。

## 構成

```
my-diary-app/
├─ apps/
│   └─ front/    # Next.js (チャットUI)
├─ infra/
│   └─ cdk/         # AWS CDK (S3, OpenSearch, Bedrock KBなど)
└─ package.json     # npm workspaces 設定
```

- **apps/frontend**: Next.js でフロントエンドを実装
- **infra/cdk**: AWS CDK(TypeScript) でインフラを定義

## セットアップ

```bash
# 初回セットアップ
npm install
```

### フロントエンド (Next.js)

```bash
npm run dev
```

http://localhost:3000 で開発サーバーが起動します。

### インフラ (CDK)

```bash
# TypeScriptビルド
npm run build:infra

# CloudFormationテンプレートを確認
npm --workspace infra/cdk run cdk synth

# デプロイ
npm run deploy:infra

# 削除（課金止め）
npm --workspace infra/cdk run cdk destroy
```

## npm scripts

ルートの `package.json` から以下のショートカットを使えます:

- `npm run dev:front` : Next.js 開発サーバー
- `npm run build:infra` : CDK ビルド
- `npm run deploy:infra` : CDK デプロイ

## 開発メモ

- モノレポ管理は **npm workspaces** を利用
- インフラとフロントで共通の設定値（S3 バケット名など）は将来的に `packages/config/` に切り出す予定
- デプロイはなるべく `cdk destroy` で片付けて、OpenSearch の課金を抑える
