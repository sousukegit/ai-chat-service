# DynamoDB テーブル設計

## ChatHistory テーブル

### 概要

ユーザーのチャット履歴を保存するためのテーブル

### テーブル構造

| 項目          | 型          | 説明                   |
| ------------- | ----------- | ---------------------- |
| **userId**    | String (PK) | ユーザー ID            |
| **sessionId** | String (SK) | セッション ID          |
| messageId     | String      | メッセージの一意識別子 |
| content       | String      | メッセージ内容         |
| sender        | String      | 送信者 (user/ai)       |
| timestamp     | Number      | Unix timestamp         |
| createdAt     | String      | ISO 形式の作成日時     |
| updatedAt     | String      | ISO 形式の更新日時     |

### キー設計

- **パーティションキー (PK)**: `userId`
  - ユーザーごとにデータを分散
- **ソートキー (SK)**: `sessionId`
  - 同一ユーザー内でセッション別にソート

### アクセスパターン

1. **特定ユーザーの全セッション取得**

   - `userId = "user123"`

2. **特定セッションのチャット履歴取得**

   - `userId = "user123" AND sessionId = "session-20240101-001"`

3. **ユーザーの最新セッション取得**
   - `userId = "user123"` + Query with ScanIndexForward=false & Limit=1

### インデックス

- **基本テーブル**: userId (PK) + sessionId (SK)
- **GSI1**: timestamp (PK) + userId (SK) ※時系列でのクエリ用（将来拡張）

### サンプルデータ構造

```json
{
  "userId": "user123",
  "sessionId": "session-20240101-001",
  "messageId": "msg-001",
  "content": "こんにちは！",
  "sender": "user",
  "timestamp": 1704067200,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## UserSessions テーブル

### 概要

ユーザーのセッション管理用テーブル

### テーブル構造

| 項目          | 型          | 説明                       |
| ------------- | ----------- | -------------------------- |
| **userId**    | String (PK) | ユーザー ID                |
| **sessionId** | String (SK) | セッション ID              |
| sessionName   | String      | セッション名               |
| isActive      | Boolean     | アクティブセッションフラグ |
| messageCount  | Number      | メッセージ数               |
| lastActivity  | Number      | 最終アクティビティ時刻     |
| createdAt     | String      | ISO 形式の作成日時         |
| updatedAt     | String      | ISO 形式の更新日時         |

