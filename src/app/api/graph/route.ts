import clientPromise from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const client = await clientPromise;
    const db = client.db("therapyapp");
    const graph = await db.collection("graphs").findOne({ userId });

    return NextResponse.json(graph?.data || { nodes: [], edges: [] });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const data = await req.json();
    const client = await clientPromise;
    const db = client.db("therapyapp");

    await db.collection("graphs").updateOne(
      { userId },
      { $set: { userId, data, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return new NextResponse(error.message, { status: 500 });
  }
}
