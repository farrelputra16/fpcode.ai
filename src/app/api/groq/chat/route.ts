import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export async function POST(req: Request) {
  const { prompt, type, imageBase64 }: {
    prompt?: string;
    type: "chat" | "image" | "reasoning" | "websearch";
    imageBase64?: string;
  } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ message: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    if (type === "image") {
      if (!imageBase64 || !prompt) {
        return NextResponse.json({ message: "Missing image or prompt" }, { status: 400 });
      }

      const result = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        temperature: 1,
        max_completion_tokens: 1024,
        top_p: 1,
        stream: false,
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    if (type === "reasoning") {
      const result = await groq.chat.completions.create({
        model: "deepseek-r1-distill-llama-70b",
        messages: [{ role: "user", content: prompt || "" }],
        temperature: 0.6,
        max_completion_tokens: 1024,
        top_p: 0.95,
        stream: false,
        reasoning_format: "raw",
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    if (type === "websearch") {
      const result = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: prompt || "" }],
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // Default: Chat Completion
    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt || "" },
      ],
    });

    return NextResponse.json({ message: chat.choices[0].message.content });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message: `❌ Error: ${errorMessage}` }, { status: 500 });
  }
}
