import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message, history, systemInstruction } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: history.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
    });

    const result = await chat.sendMessageStream(message);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            controller.enqueue(new TextEncoder().encode(chunkText));
          }
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
