import clientPromise from "./db";

export async function recordTokenUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number
) {
  try {
    const client = await clientPromise;
    const db = client.db("therapyapp");

    await db.collection("user_metrics").updateOne(
      { userId },
      {
        $inc: {
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
          totalRequests: 1,
        },
        $set: {
          lastInputTokens: inputTokens,
          lastOutputTokens: outputTokens,
          lastUpdated: new Date(),
        },
        $setOnInsert: {
          firstInteractionAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to record token usage:", error);
  }
}
