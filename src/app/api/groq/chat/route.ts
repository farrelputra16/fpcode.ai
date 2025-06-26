// Jalankan di runtime Node.js (bukan Edge)
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import {
  GoogleGenAI,
  Modality,
  MediaResolution,
  LiveServerMessage,
} from "@google/genai";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export async function POST(req: Request) {
  const {
    prompt,
    type,
    imageBase64,
    audioBase64,
  }: {
    prompt?: string;
    type: "chat" | "image" | "reasoning" | "websearch" | "imagegen" | "stream";
    imageBase64?: string;
    audioBase64?: string;
  } = await req.json();

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

    // 🌐 WEB SEARCH
    if (type === "websearch") {
      const result = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: prompt || "" }],
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // 🎨 IMAGE GENERATION
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
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
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

    // 🔊 STREAM VOICE CHAT
    if (type === "stream") {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ message: "Missing GEMINI_API_KEY" }, { status: 500 });
      }

      if (!audioBase64) {
        return NextResponse.json({ message: "Missing audioBase64" }, { status: 400 });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // We'll manage the session directly within the promise scope
      return new Promise(async (resolve) => {
        let liveSession: Awaited<ReturnType<typeof ai.live.connect>> | undefined; // Use undefined for initial state

        try {
          liveSession = await ai.live.connect({
            model: "models/gemini-2.5-flash-preview-native-audio-dialog",
            config: {
              responseModalities: [Modality.AUDIO],
              mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Callirrhoe" },
                },
              },
            },
            callbacks: {
              onopen: async () => {
                console.log("🟢 Stream connected.");
                // At this point, liveSession should definitely be assigned if `await` completed.
                // If it's still undefined, it means the connection process itself had an issue
                // or `onopen` fired prematurely relative to the `await`.
                if (liveSession) { // Double-check as a safeguard
                  await liveSession.sendClientContent({
                    turns: [
                      {
                        parts: [
                          {
                            inlineData: {
                              data: audioBase64,
                              mimeType: "audio/pcm;rate=16000",
                            },
                          },
                        ],
                      },
                    ],
                  });
                } else {
                  console.error("❌ Critical: liveSession was undefined in onopen!");
                  // Attempt to close gracefully if we somehow get here without a session
                  // This is a recovery step, the main issue is session not being assigned.
                  resolve(NextResponse.json({ message: "Stream connection failed unexpectedly. No session initialized." }, { status: 500 }));
                }
              },
              onmessage: async (msg: LiveServerMessage) => {
                const part = msg?.serverContent?.modelTurn?.parts?.[0];
                if (part?.inlineData?.data && part.inlineData.mimeType?.startsWith("audio")) {
                  if (liveSession) {
                    await liveSession.close();
                  }
                  return resolve(
                    NextResponse.json({ audioBase64: part.inlineData.data })
                  );
                }
              },
              onerror: (e: ErrorEvent) => {
                console.error("❌ Gemini stream error:", e.message);
                // Ensure to close session on error to prevent resource leaks
                if (liveSession) {
                  liveSession.close();
                }
                return resolve(
                  NextResponse.json({ message: `Stream error: ${e.message}` }, { status: 500 })
                );
              },
              onclose: () => {
                console.log("🔴 Stream closed.");
              },
            },
          });

          // Important: If you reach this line, it means ai.live.connect() resolved.
          // If the onopen callback above still reported liveSession as null,
          // then there's a highly unusual timing or internal library issue.
          // We've already sent the initial content in onopen, so no action here.

        } catch (connectError: unknown) {
          // This catch block handles errors that occur directly during the ai.live.connect() call
          const errorMessage = connectError instanceof Error ? connectError.message : "Unknown error during live connection";
          console.error("❌ Error establishing Gemini live stream connection:", errorMessage);
          resolve(NextResponse.json({ message: `Failed to establish live stream connection: ${errorMessage}` }, { status: 500 }));
        }
      });
    }

    // 🤖 DEFAULT TEXT CHAT
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