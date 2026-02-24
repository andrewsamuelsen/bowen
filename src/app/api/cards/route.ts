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
    
    const doc = await db.collection("cards").findOne({ userId });

    return NextResponse.json({ sessions: doc?.sessions || [] });
  } catch (error: any) {
    console.error("Failed to fetch card sessions:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { sessions } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("therapyapp");

    await db.collection("cards").updateOne(
      { userId },
      { 
        $set: { 
          userId, 
          sessions, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save card sessions:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}