// src/app/api/groq/chat/route.ts
import { GoogleGenAI, Modality } from '@google/genai';
import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set in environment variables. Gemini Live features will not work.");
}

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY for token generation." }, { status: 500 });
  }

  try {
    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const newSessionExpireTime = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    const expireTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // The result of create() is the AuthToken object itself
    const authTokenResult = await aiClient.authTokens.create({
      config: {
        uses: 1,
        expireTime: expireTime.toISOString(),
        newSessionExpireTime: newSessionExpireTime.toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    // FIX: Access the 'name' property directly from authTokenResult (which is the AuthToken)
    // Validate that authTokenResult exists and has a 'name' property which is a string.
    if (!authTokenResult || typeof authTokenResult.name !== 'string') {
        console.error("Unexpected token response structure:", JSON.stringify(authTokenResult, null, 2));
        throw new Error('Invalid token response structure from GoogleGenAI. Expected "name" property on AuthToken.');
    }

    // Return the actual token string from authTokenResult.name
    return NextResponse.json({ token: authTokenResult.name });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating ephemeral token:', errorMessage);
    return NextResponse.json({
        error: `Failed to generate ephemeral token: ${errorMessage}. Please verify your GEMINI_API_KEY, and ensure @google/genai SDK is up-to-date and correctly installed.`
    }, { status: 500 });
  }
}

/**
 * POST method: Menangani berbagai interaksi AI berbasis teks (dan gambar) menggunakan GROQ.
 */
export async function POST(req: Request) {
  const { prompt, type, imageBase64, userAddress, userChain }: {
    prompt?: string;
    type: "chat" | "image" | "reasoning" | "websearch" | "imagegen" | "stream";
    imageBase64?: string;
    userAddress?: string;
    userChain?: string;
  } = await req.json();

  if (!userAddress) {
    return NextResponse.json({ message: "User wallet address is required." }, { status: 400 });
  }
  if (!userChain || !userChain.includes("Solana")) {
    console.warn(`Warning: userChain does not indicate Solana: ${userChain}`);
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ message: "Missing GROQ_API_KEY for Groq features." }, { status: 500 });
  }

  try {
    // --- Logika untuk berbagai tipe request (menggunakan Groq) ---

    // 🖼️ ANALISIS GAMBAR (GROQ)
    if (type === "image") {
      if (!imageBase64 || !prompt) {
        return NextResponse.json({ message: "Image or prompt is missing for image analysis." }, { status: 400 });
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

    // 🧠 PENALARAN (GROQ)
    if (type === "reasoning") {
      const result = await groq.chat.completions.create({
        model: "deepseek-r1-distill-llama-70b",
        messages: [{ role: "user", content: prompt || "" }],
        temperature: 0.6,
        max_completion_tokens: 1024,
        top_p: 0.95,
        stream: false,
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // 🌐 PENCARIAN WEB (GROQ)
    if (type === "websearch") {
      const result = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: prompt || "" }],
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // 🎨 PEMBUATAN GAMBAR (GEMINI - menggunakan API Key biasa, bukan Live API)
    if (type === "imagegen") {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json({ message: "Missing GEMINI_API_KEY for image generation." }, { status: 500 });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // FIX: Menambahkan 'config' dengan 'responseModalities' seperti contoh Anda
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: [{ role: "user", parts: [{ text: prompt ?? "A futuristic city" }] }],
        config: { // Tambahkan bagian konfigurasi ini
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      type ImagePart = {
        inlineData: {
          mimeType: string;
          data: string;
        };
      };

      const imagePart = response?.candidates?.[0]?.content?.parts?.find(
        (part): part is ImagePart =>
          typeof part === "object" &&
          'inlineData' in part &&
          typeof part.inlineData === 'object' &&
          !!part.inlineData.mimeType &&
          part.inlineData.mimeType.startsWith("image")
      );

      const base64Image = imagePart?.inlineData?.data;

      if (!base64Image) {
        return NextResponse.json({ message: "❌ No image returned from Gemini." }, { status: 500 });
      }

      return NextResponse.json({
        message: "🧑‍🎨 Image successfully generated.",
        imageBase64: base64Image,
      });
  
    }
    if (type === "stream") {
      return NextResponse.json({ error: "Voice stream processing is now handled directly by Gemini Live API from the frontend. This endpoint is not used for that purpose." }, { status: 400 });
    }

    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt || "" },
      ],
    });

    return NextResponse.json({ message: chat.choices[0].message.content });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("API error in POST /api/groq/chat:", errorMessage);
    return NextResponse.json({ message: `❌ Error: ${errorMessage}` }, { status: 500 });
  }
}