// src/app/api/groq/chat/route.ts
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenAI, Modality } from "@google/genai";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export async function POST(req: Request) {
  const { prompt, type, imageBase64, audioBase64, userAddress, userChain }: {
    prompt?: string;
    type: "chat" | "image" | "reasoning" | "websearch" | "imagegen" | "stream";
    imageBase64?: string;
    audioBase64?: string;
    userAddress?: string; // Alamat dompet Solana
    userChain?: string; // Akan selalu "Solana" atau nama jaringan Solana
  } = await req.json();

  // Validasi kehadiran userAddress (alamat dompet Solana)
  if (!userAddress) {
    return NextResponse.json({ message: "Alamat dompet Solana pengguna diperlukan." }, { status: 400 });
  }
  // userChain akan selalu menjadi Solana, jadi validasi ini bisa disederhanakan
  // atau digunakan untuk logging saja.
  if (!userChain || !userChain.includes("Solana")) { // Memastikan ini adalah rantai Solana
    console.warn(`Peringatan: userChain tidak menunjukkan Solana: ${userChain}`);
  }


  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ message: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  try {
    // Anda dapat menggunakan userAddress dan userChain untuk logging di sini,
    // mis., console.log(`Permintaan dari ${userAddress} di ${userChain} untuk tipe: ${type}`);

    // 🖼️ ANALISIS GAMBAR
    if (type === "image") {
      if (!imageBase64 || !prompt) {
        return NextResponse.json({ message: "Gambar atau prompt tidak ada" }, { status: 400 });
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

    // 🧠 PENALARAN
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

    // 🌐 PENCARIAN WEB
    if (type === "websearch") {
      const result = await groq.chat.completions.create({
        model: "compound-beta",
        messages: [{ role: "user", content: prompt || "" }],
      });

      return NextResponse.json({ message: result.choices[0].message.content });
    }

    // 🎨 PEMBUATAN GAMBAR (GEMINI)
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
        }
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
          !!part.inlineData?.mimeType &&
          part.inlineData.mimeType.startsWith("image")
      );

      const base64Image = imagePart?.inlineData?.data;

      if (!base64Image) {
        return NextResponse.json({ message: "❌ Tidak ada gambar yang dikembalikan dari Gemini." }, { status: 500 });
      }

      return NextResponse.json({
        message: "🧑‍🎨 Gambar berhasil dibuat.",
        imageBase64: base64Image,
      });
    }

    // 🎤 STREAM AUDIO (Speech-to-Text & Text-to-Speech)
    if (type === "stream") {
      if (!audioBase64) {
        return NextResponse.json({ message: "Data audio tidak ada untuk tipe stream" }, { status: 400 });
      }
      // Anda perlu mengimplementasikan logika STT (Speech-to-Text) dan TTS (Text-to-Speech) Anda di sini.
      // Contoh:
      // 1. Kirim audioBase64 ke layanan STT (misalnya, speech-to-text Groq, Whisper OpenAI, Google Cloud Speech-to-Text).
      //    Ini akan mengubah audio menjadi teks.
      // 2. Ambil teks yang ditranskripsi dan kirimkan ke model chat Anda (misalnya, llama-3.3-70b-versatile Groq).
      // 3. Ambil respons tekstual AI dan kirimkan ke layanan TTS (misalnya, Google Cloud Text-to-Speech, ElevenLabs, atau TTS eksperimental Groq).
      //    Ini akan mengubah respons teks menjadi audio.
      // 4. Kembalikan audioBase64.

      // Placeholder untuk logika STT dan TTS
      const transcribedText = "Ini adalah placeholder untuk audio yang Anda transkripsi."; // Ganti dengan STT aktual
      const aiResponse = `Saya mendengar Anda berkata: "${transcribedText}". Saya merespons dari ${userChain}.`; // Ganti dengan respons chat AI aktual
      const responseAudioBase64 = "YOUR_TTS_AUDIO_BASE64_HERE"; // Ganti dengan output TTS aktual

      return NextResponse.json({
        message: aiResponse,
        audioBase64: responseAudioBase64,
      });
    }

    // 🤖 CHAT DEFAULT
    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "Anda adalah asisten yang membantu." },
        { role: "user", content: prompt || "" },
      ],
    });

    return NextResponse.json({ message: chat.choices[0].message.content });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Kesalahan tidak dikenal";
    console.error("Kesalahan API:", err); // Log kesalahan lengkap untuk debugging
    return NextResponse.json({ message: `❌ Kesalahan: ${errorMessage}` }, { status: 500 });
  }
}