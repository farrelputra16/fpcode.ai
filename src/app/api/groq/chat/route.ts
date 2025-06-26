import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenAI, Modality } from "@google/genai";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export async function POST(req: Request) {
  const { prompt, type, imageBase64 }: {
    prompt?: string;
    type: "chat" | "image" | "reasoning" | "websearch" | "imagegen";
    imageBase64?: string;
  } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ message: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    // 🖼️ IMAGE ANALYSIS
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

    // 🧠 REASONING
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

    // 🌐 WEBSEARCH
    if (type === "websearch") {
      const result = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: prompt || "" }],
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // 🎨 IMAGE GENERATION (GEMINI)
    if (type === "imagegen") {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ message: "Missing GEMINI_API_KEY" }, { status: 500 });
      }

            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const contents = prompt ?? "A futuristic city";

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents,
        config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE], // ✅ Benar
      }
      });

      const imagePart = response?.candidates?.[0]?.content?.parts?.find(
        (part): part is { inlineData: { mimeType: string; data: string } } =>
          !!part?.inlineData?.mimeType?.startsWith("image")
      );

      const base64Image = imagePart?.inlineData?.data;

      if (!base64Image) {
        return NextResponse.json({ message: "❌ No image was returned from Gemini." }, { status: 500 });
      }

      return NextResponse.json({
        message: "🧑‍🎨 Image generated successfully.",
        imageBase64: base64Image,
      });
    }

    // 🤖 DEFAULT CHAT
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
