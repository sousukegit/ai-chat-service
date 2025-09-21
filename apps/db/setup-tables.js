#!/usr/bin/env node

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  CreateTableCommand,
  PutCommand,
  ListTablesCommand,
  DeleteTableCommand,
} = require("@aws-sdk/lib-dynamodb");

// DynamoDB ローカル接続設定
const client = new DynamoDBClient({
  region: "ap-northeast-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy",
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// ChatHistory テーブル定義
const chatHistoryTableParams = {
  TableName: "ChatHistory",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" }, // Partition Key
    { AttributeName: "sessionId", KeyType: "RANGE" }, // Sort Key
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "sessionId", AttributeType: "S" },
    { AttributeName: "timestamp", AttributeType: "N" },
  ],
  BillingMode: "PAY_PER_REQUEST",
  GlobalSecondaryIndexes: [
    {
      IndexName: "TimestampIndex",
      KeySchema: [
        { AttributeName: "timestamp", KeyType: "HASH" },
        { AttributeName: "userId", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    },
  ],
};

// UserSessions テーブル定義
const userSessionsTableParams = {
  TableName: "UserSessions",
  KeySchema: [
    { AttributeName: "userId", KeyType: "HASH" }, // Partition Key
    { AttributeName: "sessionId", KeyType: "RANGE" }, // Sort Key
  ],
  AttributeDefinitions: [
    { AttributeName: "userId", AttributeType: "S" },
    { AttributeName: "sessionId", AttributeType: "S" },
    { AttributeName: "lastActivity", AttributeType: "N" },
  ],
  BillingMode: "PAY_PER_REQUEST",
  GlobalSecondaryIndexes: [
    {
      IndexName: "LastActivityIndex",
      KeySchema: [
        { AttributeName: "lastActivity", KeyType: "HASH" },
        { AttributeName: "userId", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    },
  ],
};

// テーブル作成関数
async function createTable(tableParams) {
  try {
    const command = new CreateTableCommand(tableParams);
    const result = await docClient.send(command);
    console.log(`✅ テーブル "${tableParams.TableName}" を作成しました`);
    return result;
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log(`⚠️ テーブル "${tableParams.TableName}" は既に存在します`);
    } else {
      console.error(
        `❌ テーブル "${tableParams.TableName}" の作成に失敗しました:`,
        error
      );
      throw error;
    }
  }
}

// テーブル削除関数
async function deleteTable(tableName) {
  try {
    const command = new DeleteTableCommand({ TableName: tableName });
    await docClient.send(command);
    console.log(`🗑️ テーブル "${tableName}" を削除しました`);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️ テーブル "${tableName}" は存在しません`);
    } else {
      console.error(`❌ テーブル "${tableName}" の削除に失敗しました:`, error);
    }
  }
}

// テーブル一覧取得
async function listTables() {
  try {
    const command = new ListTablesCommand({});
    const result = await docClient.send(command);
    console.log("📋 既存のテーブル:", result.TableNames);
    return result.TableNames;
  } catch (error) {
    console.error("❌ テーブル一覧の取得に失敗しました:", error);
    throw error;
  }
}

// サンプルデータ投入
async function insertSampleData() {
  const now = Date.now();
  const isoNow = new Date().toISOString();

  // サンプルチャット履歴
  const sampleChatHistory = [
    {
      userId: "user001",
      sessionId: "session-20240101-001",
      messageId: "msg-001",
      content: "こんにちは！AIチャットボットですね。",
      sender: "user",
      timestamp: now - 3600000, // 1時間前
      createdAt: new Date(now - 3600000).toISOString(),
      updatedAt: new Date(now - 3600000).toISOString(),
    },
    {
      userId: "user001",
      sessionId: "session-20240101-001",
      messageId: "msg-002",
      content: "はい！何かお手伝いできることはありますか？",
      sender: "ai",
      timestamp: now - 3580000, // 59分40秒前
      createdAt: new Date(now - 3580000).toISOString(),
      updatedAt: new Date(now - 3580000).toISOString(),
    },
    {
      userId: "user001",
      sessionId: "session-20240101-001",
      messageId: "msg-003",
      content: "TypeScriptについて教えてください。",
      sender: "user",
      timestamp: now - 3500000, // 58分20秒前
      createdAt: new Date(now - 3500000).toISOString(),
      updatedAt: new Date(now - 3500000).toISOString(),
    },
    {
      userId: "user001",
      sessionId: "session-20240101-002",
      messageId: "msg-004",
      content: "新しいセッションです。React Hooksについて質問があります。",
      sender: "user",
      timestamp: now - 1800000, // 30分前
      createdAt: new Date(now - 1800000).toISOString(),
      updatedAt: new Date(now - 1800000).toISOString(),
    },
  ];

  // サンプルユーザーセッション
  const sampleUserSessions = [
    {
      userId: "user001",
      sessionId: "session-20240101-001",
      sessionName: "TypeScript学習",
      isActive: false,
      messageCount: 3,
      lastActivity: now - 3500000,
      createdAt: new Date(now - 3600000).toISOString(),
      updatedAt: new Date(now - 3500000).toISOString(),
    },
    {
      userId: "user001",
      sessionId: "session-20240101-002",
      sessionName: "React Hooks相談",
      isActive: true,
      messageCount: 1,
      lastActivity: now - 1800000,
      createdAt: new Date(now - 1800000).toISOString(),
      updatedAt: new Date(now - 1800000).toISOString(),
    },
  ];

  // ChatHistory データ投入
  console.log("📥 ChatHistory サンプルデータを投入中...");
  for (const item of sampleChatHistory) {
    try {
      const command = new PutCommand({
        TableName: "ChatHistory",
        Item: item,
      });
      await docClient.send(command);
      console.log(`✅ メッセージ ${item.messageId} を投入しました`);
    } catch (error) {
      console.error(
        `❌ メッセージ ${item.messageId} の投入に失敗しました:`,
        error
      );
    }
  }

  // UserSessions データ投入
  console.log("📥 UserSessions サンプルデータを投入中...");
  for (const item of sampleUserSessions) {
    try {
      const command = new PutCommand({
        TableName: "UserSessions",
        Item: item,
      });
      await docClient.send(command);
      console.log(`✅ セッション ${item.sessionId} を投入しました`);
    } catch (error) {
      console.error(
        `❌ セッション ${item.sessionId} の投入に失敗しました:`,
        error
      );
    }
  }
}

// メイン実行関数
async function main() {
  console.log("🚀 DynamoDB テーブルセットアップを開始します...\n");

  try {
    // 既存テーブル確認
    await listTables();
    console.log("");

    // コマンドライン引数をチェック
    const args = process.argv.slice(2);
    const shouldReset = args.includes("--reset");

    if (shouldReset) {
      console.log("🔄 既存テーブルを削除します...");
      await deleteTable("ChatHistory");
      await deleteTable("UserSessions");
      console.log("");

      // 少し待つ（テーブル削除の完了を待つ）
      console.log("⏳ テーブル削除の完了を待機中...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // テーブル作成
    console.log("📋 テーブルを作成します...");
    await createTable(chatHistoryTableParams);
    await createTable(userSessionsTableParams);
    console.log("");

    // 少し待つ（テーブル作成の完了を待つ）
    console.log("⏳ テーブル作成の完了を待機中...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // サンプルデータ投入
    if (args.includes("--with-sample-data")) {
      await insertSampleData();
      console.log("");
    }

    // 最終確認
    console.log("📋 最終状態:");
    await listTables();

    console.log("\n✅ セットアップが完了しました！");
    console.log("🌐 DynamoDB Admin UI: http://localhost:8001");
  } catch (error) {
    console.error("❌ セットアップに失敗しました:", error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}
