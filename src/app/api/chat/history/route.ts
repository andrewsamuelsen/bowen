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
    
    const chatDoc = await db.collection("chats").findOne({ userId });

    return NextResponse.json({ messages: chatDoc?.messages || [] });
  } catch (error: any) {
    console.error("Failed to fetch chat history:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { messages } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("therapyapp");

    await db.collection("chats").updateOne(
      { userId },
      { 
        $set: { 
          userId, 
          messages, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save chat history:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
