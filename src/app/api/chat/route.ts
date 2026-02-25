import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { recordTokenUsage } from "@/lib/metrics";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || "",
});

// Easily toggle providers here
const PROVIDER: 'GEMINI' | 'CLAUDE' = 'GEMINI';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { message, history, systemInstruction, model: modelHint } = await req.json();

    if (PROVIDER === 'GEMINI') {
      // --- GEMINI IMPLEMENTATION ---
      let sanitizedHistory: any[] = [];
      if (Array.isArray(history)) {
        let lastRole: string | null = null;
        for (const msg of history) {
          const currentRole = msg.role === 'user' ? 'user' : 'model';
          if (sanitizedHistory.length === 0 && currentRole !== 'user') continue;
          if (currentRole === lastRole) continue;
          sanitizedHistory.push({
            role: currentRole,
            parts: [{ text: msg.text }]
          });
          lastRole = currentRole;
        }
      }

      console.log("=== AI INPUT DEBUG (GEMINI) ===");
      console.log("SYSTEM:", systemInstruction);
      console.log("MESSAGE:", message);
      console.log("MODEL:", "gemini-3-pro-preview");
      console.log("======================");

      const model = genAI.getGenerativeModel({
        model: "gemini-3-pro-preview",
        systemInstruction: systemInstruction,
      });

      const chat = model.startChat({ history: sanitizedHistory });
      const result = await chat.sendMessageStream(message);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.stream) {
              const chunkText = chunk.text();
              if (chunkText) controller.enqueue(new TextEncoder().encode(chunkText));
            }
            const response = await result.response;
            const usage = response.usageMetadata;
            
            if (systemInstruction?.includes("clinical supervisor")) {
              console.log("\n=== NEW CLINICAL SUMMARY GENERATED ===\n", response.text(), "\n======================================\n");
            }

            if (usage) {
              await recordTokenUsage(userId, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0);
            }
          } catch (error) {
            console.error("Gemini Streaming error:", error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
      return new Response(stream);

    } else {
      // --- CLAUDE IMPLEMENTATION ---
      let sanitizedHistory: any[] = [];
      if (Array.isArray(history)) {
        let lastRole: string | null = null;
        for (const msg of history) {
          const currentRole = msg.role === 'user' ? 'user' : 'assistant';
          if (sanitizedHistory.length === 0 && currentRole !== 'user') continue;
          if (currentRole === lastRole) continue;
          sanitizedHistory.push({ role: currentRole, content: msg.text });
          lastRole = currentRole;
        }
      }

      console.log("=== AI INPUT DEBUG (CLAUDE) ===");
      console.log("MODEL:", "claude-sonnet-4-6");
      console.log("======================");

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemInstruction,
        messages: [...sanitizedHistory, { role: "user", content: message }],
      });

      const webStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                controller.enqueue(new TextEncoder().encode(chunk.delta.text));
              }
            }
            const messageFinal = await stream.finalMessage();
            const usage = messageFinal.usage;
            
            if (systemInstruction?.includes("clinical supervisor")) {
              console.log("\n=== NEW CLINICAL SUMMARY GENERATED ===\n", messageFinal.content[0].type === 'text' ? messageFinal.content[0].text : '', "\n======================================\n");
            }

            if (usage) {
              await recordTokenUsage(userId, usage.input_tokens || 0, usage.output_tokens || 0);
            }
          } catch (error) {
            console.error("Claude Streaming error:", error);
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
      return new Response(webStream);
    }
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
