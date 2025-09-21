#!/usr/bin/env node

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
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

/**
 * 1. 特定ユーザーの全セッション取得
 */
async function getUserSessions(userId) {
  console.log(`📋 ユーザー ${userId} の全セッションを取得中...`);

  try {
    const command = new QueryCommand({
      TableName: "UserSessions",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ScanIndexForward: false, // 最新順
    });

    const result = await docClient.send(command);
    console.log(`✅ ${result.Items.length} 件のセッションが見つかりました:`);
    result.Items.forEach((item) => {
      console.log(
        `  - ${item.sessionId}: ${item.sessionName} (${item.messageCount}件のメッセージ)`
      );
    });

    return result.Items;
  } catch (error) {
    console.error("❌ セッション取得に失敗しました:", error);
    throw error;
  }
}

/**
 * 2. 特定セッションのチャット履歴取得
 */
async function getChatHistory(userId, sessionId) {
  console.log(`💬 セッション ${sessionId} のチャット履歴を取得中...`);

  try {
    const command = new QueryCommand({
      TableName: "ChatHistory",
      KeyConditionExpression: "userId = :userId AND sessionId = :sessionId",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":sessionId": sessionId,
      },
    });

    const result = await docClient.send(command);
    console.log(`✅ ${result.Items.length} 件のメッセージが見つかりました:`);
    result.Items.forEach((item) => {
      const time = new Date(item.timestamp).toLocaleTimeString("ja-JP");
      console.log(`  [${time}] ${item.sender}: ${item.content}`);
    });

    return result.Items;
  } catch (error) {
    console.error("❌ チャット履歴取得に失敗しました:", error);
    throw error;
  }
}

/**
 * 3. 新しいメッセージの追加
 */
async function addMessage(userId, sessionId, content, sender) {
  console.log(`📝 新しいメッセージを追加中...`);

  const now = Date.now();
  const messageId = `msg-${now}`;

  try {
    // ChatHistoryにメッセージ追加
    const chatCommand = new PutCommand({
      TableName: "ChatHistory",
      Item: {
        userId,
        sessionId,
        messageId,
        content,
        sender,
        timestamp: now,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
    });

    await docClient.send(chatCommand);

    // UserSessionsのメッセージ数と最終アクティビティを更新
    const updateCommand = new UpdateCommand({
      TableName: "UserSessions",
      Key: { userId, sessionId },
      UpdateExpression:
        "ADD messageCount :inc SET lastActivity = :lastActivity, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":lastActivity": now,
        ":updatedAt": new Date(now).toISOString(),
      },
    });

    await docClient.send(updateCommand);

    console.log(`✅ メッセージ "${content}" を追加しました`);
    return messageId;
  } catch (error) {
    console.error("❌ メッセージ追加に失敗しました:", error);
    throw error;
  }
}

/**
 * 4. 新しいセッションの作成
 */
async function createSession(userId, sessionName) {
  console.log(`🆕 新しいセッション "${sessionName}" を作成中...`);

  const now = Date.now();
  const sessionId = `session-${
    new Date().toISOString().split("T")[0]
  }-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // 既存のアクティブセッションを非アクティブに
    await deactivateUserSessions(userId);

    // 新しいセッションを作成
    const command = new PutCommand({
      TableName: "UserSessions",
      Item: {
        userId,
        sessionId,
        sessionName,
        isActive: true,
        messageCount: 0,
        lastActivity: now,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
      },
    });

    await docClient.send(command);

    console.log(`✅ セッション ${sessionId} を作成しました`);
    return sessionId;
  } catch (error) {
    console.error("❌ セッション作成に失敗しました:", error);
    throw error;
  }
}

/**
 * 5. ユーザーの全セッションを非アクティブに
 */
async function deactivateUserSessions(userId) {
  try {
    const sessions = await getUserSessions(userId);

    for (const session of sessions) {
      if (session.isActive) {
        const command = new UpdateCommand({
          TableName: "UserSessions",
          Key: { userId, sessionId: session.sessionId },
          UpdateExpression: "SET isActive = :isActive, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":isActive": false,
            ":updatedAt": new Date().toISOString(),
          },
        });

        await docClient.send(command);
      }
    }
  } catch (error) {
    console.error("❌ セッション非アクティブ化に失敗しました:", error);
  }
}

/**
 * 6. アクティブセッションの取得
 */
async function getActiveSession(userId) {
  console.log(`🔍 ユーザー ${userId} のアクティブセッションを取得中...`);

  try {
    const command = new QueryCommand({
      TableName: "UserSessions",
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "isActive = :isActive",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":isActive": true,
      },
      Limit: 1,
    });

    const result = await docClient.send(command);

    if (result.Items.length > 0) {
      console.log(`✅ アクティブセッション: ${result.Items[0].sessionId}`);
      return result.Items[0];
    } else {
      console.log("ℹ️ アクティブセッションが見つかりません");
      return null;
    }
  } catch (error) {
    console.error("❌ アクティブセッション取得に失敗しました:", error);
    throw error;
  }
}

/**
 * デモ実行
 */
async function demo() {
  console.log("🚀 DynamoDB クエリサンプルのデモを開始します...\n");

  try {
    const userId = "user001";

    // 1. 既存セッション確認
    await getUserSessions(userId);
    console.log("");

    // 2. アクティブセッション確認
    let activeSession = await getActiveSession(userId);
    console.log("");

    // 3. アクティブセッションがない場合は新規作成
    if (!activeSession) {
      const sessionId = await createSession(userId, "デモセッション");
      activeSession = { sessionId };
      console.log("");
    }

    // 4. メッセージ追加
    await addMessage(
      userId,
      activeSession.sessionId,
      "こんにちは！新しいメッセージです。",
      "user"
    );
    await addMessage(
      userId,
      activeSession.sessionId,
      "こんにちは！お答えします。",
      "ai"
    );
    console.log("");

    // 5. チャット履歴確認
    await getChatHistory(userId, activeSession.sessionId);
    console.log("");

    // 6. 最終状態確認
    await getUserSessions(userId);

    console.log("\n✅ デモが完了しました！");
  } catch (error) {
    console.error("❌ デモ実行に失敗しました:", error);
  }
}

// エクスポート（他のファイルから使用可能）
module.exports = {
  getUserSessions,
  getChatHistory,
  addMessage,
  createSession,
  getActiveSession,
  deactivateUserSessions,
};

// スクリプト直接実行時にデモを実行
if (require.main === module) {
  demo();
}

