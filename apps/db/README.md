# DynamoDB ローカル環境

このディレクトリには、diary-chat アプリケーション用の DynamoDB ローカル環境とテーブル設定が含まれています。

## 📋 概要

- **DynamoDB Local**: ローカル開発用の DynamoDB コンテナ
- **DynamoDB Admin**: Web UI 管理ツール
- **テーブル設計**: チャット履歴とユーザーセッション管理

## 🚀 クイックスタート

### 1. DynamoDB コンテナの起動

```bash
# dbディレクトリに移動
cd apps/db

# 依存関係をインストール
npm install

# DynamoDBコンテナを起動
npm run start
```

### 2. テーブルの作成とサンプルデータ投入

```bash
# テーブル作成＋サンプルデータ投入
npm run setup:reset
```

### 3. 管理画面にアクセス

- **DynamoDB Admin UI**: http://localhost:8001
- **DynamoDB Local Endpoint**: http://localhost:8000

## 📊 テーブル構造

### ChatHistory テーブル

```
PK: userId (String)          # ユーザーID
SK: sessionId (String)       # セッションID
---
messageId: String            # メッセージID
content: String              # メッセージ内容
sender: String               # 送信者 (user/ai)
timestamp: Number            # Unix timestamp
createdAt: String            # ISO作成日時
updatedAt: String            # ISO更新日時
```

### UserSessions テーブル

```
PK: userId (String)          # ユーザーID
SK: sessionId (String)       # セッションID
---
sessionName: String          # セッション名
isActive: Boolean            # アクティブフラグ
messageCount: Number         # メッセージ数
lastActivity: Number         # 最終アクティビティ
createdAt: String            # ISO作成日時
updatedAt: String            # ISO更新日時
```

## 🛠 利用可能なコマンド

### Docker 操作

```bash
npm run start    # DynamoDBコンテナ起動
npm run stop     # DynamoDBコンテナ停止
npm run logs     # ログ確認
```

### テーブル操作

```bash
npm run setup           # テーブル作成のみ
npm run setup:reset     # 既存テーブル削除→再作成→サンプルデータ投入
npm run setup:clean     # 既存テーブル削除→再作成（サンプルデータなし）
npm run setup:sample    # テーブル作成→サンプルデータ投入
```

### 管理画面

```bash
npm run admin    # Admin UI URLを表示
```

## 🔍 アクセスパターン

### 1. 特定ユーザーの全セッション取得

```javascript
const params = {
  TableName: "UserSessions",
  KeyConditionExpression: "userId = :userId",
  ExpressionAttributeValues: {
    ":userId": "user001",
  },
};
```

### 2. 特定セッションのチャット履歴取得

```javascript
const params = {
  TableName: "ChatHistory",
  KeyConditionExpression: "userId = :userId AND sessionId = :sessionId",
  ExpressionAttributeValues: {
    ":userId": "user001",
    ":sessionId": "session-20240101-001",
  },
};
```

### 3. ユーザーの最新セッション取得

```javascript
const params = {
  TableName: "UserSessions",
  KeyConditionExpression: "userId = :userId",
  ExpressionAttributeValues: {
    ":userId": "user001",
  },
  ScanIndexForward: false,
  Limit: 1,
};
```

## 🌐 接続設定

```javascript
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const client = new DynamoDBClient({
  region: "ap-northeast-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy",
  },
});
```

## 📁 ファイル構成

```
apps/db/
├── docker-compose.yml     # DynamoDB Local コンテナ設定
├── setup-tables.js       # テーブル作成・サンプルデータ投入スクリプト
├── schema.md             # テーブル設計ドキュメント
├── package.json          # Node.js依存関係とスクリプト
├── README.md             # このファイル
└── docker/
    └── dynamodb/         # DynamoDB データ永続化ディレクトリ
```

## 🧹 クリーンアップ

```bash
# コンテナ停止とデータ削除
npm run stop
docker volume prune

# または完全にクリーンアップ
docker-compose down -v
```

## 🚨 トラブルシューティング

### ポート競合

もしポート 8000 や 8001 が使用中の場合、`docker-compose.yml`のポート設定を変更してください。

### テーブル作成エラー

コンテナが完全に起動するまで少し時間がかかります。エラーが出た場合は少し待ってからコマンドを再実行してください。

### データが消える

DynamoDB Local のデータは`./docker/dynamodb`ディレクトリに永続化されます。このディレクトリを削除するとデータは失われます。

