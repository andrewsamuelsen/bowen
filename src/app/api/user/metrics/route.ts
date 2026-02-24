import clientPromise from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("therapyapp");
    
    const metrics = await db.collection("user_metrics").findOne({ userId });

    return NextResponse.json(metrics || {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      lastUpdated: null
    });
  } catch (error: any) {
    console.error("Failed to fetch user metrics:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
