import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { recordTokenUsage } from "@/lib/metrics";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message, history, systemInstruction, model: modelHint } = await req.json();

    // Sanitize history: must start with 'user' and alternate roles
    let sanitizedHistory: any[] = [];
    if (Array.isArray(history)) {
      let lastRole: string | null = null;
      for (const msg of history) {
        const currentRole = msg.role === 'user' ? 'user' : 'model';
        
        // Skip until we find the first user message
        if (sanitizedHistory.length === 0 && currentRole !== 'user') continue;
        
        // Skip if role is the same as the last one (ensure alternating)
        if (currentRole === lastRole) continue;
        
        sanitizedHistory.push({
          role: currentRole,
          parts: [{ text: msg.text }]
        });
        lastRole = currentRole;
      }
    }

    // Format history for debug logs
    const formattedHistory = sanitizedHistory
      .map((m: any) => `${m.role.toUpperCase()}: ${m.parts[0].text}`)
      .join('\n\n');

    console.log("=== AI INPUT DEBUG ===");
    console.log("SYSTEM:", systemInstruction);
    console.log("HISTORY:\n", formattedHistory);
    console.log("MESSAGE:", message);
    console.log("MODEL:", modelHint || "gemini-3-pro-preview");
    console.log("======================");

    const model = genAI.getGenerativeModel({
      model: modelHint || "gemini-3-pro-preview",
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: sanitizedHistory,
    });

    const result = await chat.sendMessageStream(message);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }

          // Capture token usage after stream is complete
          const response = await result.response;
          const usage = response.usageMetadata;
          
          if (systemInstruction && systemInstruction.includes("clinical supervisor")) {
            console.log("\n=== NEW CLINICAL SUMMARY GENERATED ===");
            console.log(response.text());
            console.log("======================================\n");
          }

          if (usage) {
            await recordTokenUsage(
              userId,
              usage.promptTokenCount || 0,
              usage.candidatesTokenCount || 0
            );
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream);
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
