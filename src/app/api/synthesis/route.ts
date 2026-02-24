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
    
    const doc = await db.collection("analyses").findOne({ userId });

    return NextResponse.json({ analyses: doc?.analyses || {} });
  } catch (error: any) {
    console.error("Failed to fetch synthesis history:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { analyses } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("therapyapp");

    await db.collection("analyses").updateOne(
      { userId },
      { 
        $set: { 
          userId, 
          analyses, 
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save synthesis history:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
