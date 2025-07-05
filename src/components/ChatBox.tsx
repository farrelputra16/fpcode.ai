// ChatBox.tsx
"use client";

import {
  FaRobot,
  FaUser,
  // FaMicrophone, // DIHAPUS: Mikrofon tidak lagi di ChatBox
  FaPlus,
  FaChevronDown,
  FaGlobe,
  FaLightbulb,
  FaImage,
  FaPaperPlane,
  FaTimesCircle,
  FaDownload,
} from "react-icons/fa";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

type Role = "user" | "bot" | "system";
type Mode = "chat" | "image" | "reasoning" | "websearch" | "imagegen";
// type ExtendedMode = Mode | "stream"; // DIHAPUS: "stream" tidak lagi mode di ChatBox
type ExtendedMode = Mode; // Hanya Mode yang tersisa

type Message = {
  role: Role;
  content: string;
  image?: string;
  timestamp: Date;
  senderAddress?: string;
  senderChain?: string;
};

type RequestBody = {
  prompt?: string;
  imageBase64?: string;
  type: ExtendedMode; // Type kini hanya Mode
  // audioBase64?: string; // DIHAPUS: Audio tidak lagi dikirim dari sini
  userAddress?: string;
  userChain?: string;
};

interface ChatBoxProps {
  theme: "light" | "dark";
  userAddress: string | undefined;
  activeChain: string;
  isBackgroundTransparent?: boolean; // Prop untuk mengontrol transparansi
}

export default function ChatBox({ theme, userAddress, activeChain, isBackgroundTransparent = false }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mode, setMode] = useState<ExtendedMode>("chat");
  // const [isRecording, setIsRecording] = useState(false); // DIHAPUS: Tidak ada lagi rekaman di sini
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // const mediaRecorderRef = useRef<MediaRecorder | null>(null); // DIHAPUS
  // const chunksRef = useRef<Blob[]>([]); // DIHAPUS

  const [showTools, setShowTools] = useState(false); 

  // Function to determine message background color based on theme and role
  const getMessageColors = useCallback((role: Role) => {
    if (role === "bot") {
      return theme === "dark"
        ? "bg-gray-800 text-gray-100 shadow-xl"
        : "bg-gray-100 text-gray-800 shadow-lg";
    } else if (role === "system") {
      return theme === "dark"
        ? "bg-gray-700 text-blue-300 shadow-lg"
        : "bg-blue-100 text-blue-700 shadow-lg";
    } else { // user
      return theme === "dark"
        ? "bg-blue-600 text-white shadow-xl"
        : "bg-blue-500 text-white shadow-lg";
    }
  }, [theme]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!userAddress) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "⚠️ Please connect your Solana wallet to send messages. Click 'Connect Wallet' in the header!", timestamp: new Date() },
      ]);
      return;
    }

    if (!input.trim() && !imageBase64) return;

    const userMsg: Message = {
      role: "user",
      content: input || (imageBase64 ? "[Image + prompt]" : "[Pesan kosong]"), // Ubah pesan default
      timestamp: new Date(),
      senderAddress: userAddress,
      senderChain: activeChain,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const currentModeForRequest = imageBase64 ? "image" : mode;

    const body: RequestBody = {
      prompt: input,
      type: currentModeForRequest, // Type kini hanya Mode
      userAddress: userAddress,
      userChain: activeChain,
    };
    if (imageBase64) body.imageBase64 = imageBase64;

    setImagePreviewUrl(null);
    setImageBase64(null);

    try {
      const res = await fetch("/api/groq/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `${getIcon(currentModeForRequest)} ${data.message}`,
          ...(data.imageBase64 && { image: data.imageBase64 }),
          timestamp: new Date(),
        },
      ]);
    } catch (error: unknown) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "❌ Error: Failed to get response.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setImageBase64(base64);
        setImagePreviewUrl(reader.result as string);
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "🖼️ Image ready for your prompt. Type your question and send!", timestamp: new Date() },
        ]);
        setMode("image");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const clearImagePreview = () => {
    setImagePreviewUrl(null);
    setImageBase64(null);
    setMode("chat");
    setMessages((prev) => [
        ...prev,
        { role: "system", content: "🖼️ Image preview removed. Switched to Chat mode.", timestamp: new Date() },
    ]);
  };

  const setToolMode = (tool: Mode) => {
    setMode(tool);
    setShowTools(false);
    setMessages((prev) => [
      ...prev,
      { role: "system", content: `🔧 Switched to mode ${tool.toUpperCase()}.`, timestamp: new Date() },
    ]);
  };

  const getIcon = (type: ExtendedMode) => { // Type kini hanya Mode
    switch (type) {
      case "image":
        return "🖼️";
      case "reasoning":
        return "🧠";
      case "websearch":
        return "🌐";
      case "imagegen":
        return "🎨";
      // case "stream": // DIHAPUS: Mode stream tidak ada lagi di ChatBox
      //   return "🎤";
      default:
        return "🤖";
    }
  };

  // DIHAPUS: Semua fungsi terkait mikrofon/audio dari ChatBox
  /*
  const startRecording = async () => { ... }
  const stopRecording = () => { ... }
  const handleSendAudio = async () => { ... }
  const convertToPCM = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => { ... }
  const bufferToBase64 = (buffer: ArrayBuffer) => { ... }
  const playBase64Audio = (base64: string) => { ... }
  */

  const handleDownloadImage = (base64Image: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Image}`;
    link.download = `generated-image-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, imagePreviewUrl]);

  // Warna tema dinamis
  const transparencyClass = isBackgroundTransparent ? 'bg-opacity-85' : '';
  const bgColor = theme === "dark"
    ? `bg-gray-900/${transparencyClass.replace('bg-opacity-', '')}`
    : `bg-white/${transparencyClass.replace('bg-opacity-', '')}`;

  const borderColor = theme === "dark" ? "border-gray-700" : "border-gray-200";
  const inputBgColor = theme === "dark" ? "bg-gray-800" : "bg-gray-100";
  const inputTextColor = theme === "dark" ? "text-gray-100" : "text-gray-900";
  const placeholderColor = theme === "dark" ? "placeholder-gray-500" : "placeholder-gray-400";
  const buttonBgColor = theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600";
  const buttonTextColor = "text-white";
  const toolButtonBgColor = theme === "dark" ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300";
  const toolButtonTextColor = theme === "dark" ? "text-white" : "text-gray-800";
  const dropdownBgColor = theme === "dark" ? "bg-gray-800" : "bg-white";
  const dropdownHoverBgColor = theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100";
  const dropdownTextColor = theme === "dark" ? "text-white" : "text-gray-800";
  const activeModeBgColor = theme === "dark" ? "bg-blue-700 text-white" : "bg-blue-500 text-white";

  return (
    <div className={`flex flex-col h-full rounded-xl shadow-xl ${bgColor} ${borderColor} border`}>
      {/* Area Tampilan Chat */}
      <div
        ref={chatRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 w-full md:max-w-5xl mx-auto"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-md ${getMessageColors(msg.role)}`}
            >
              <span className="mr-3 text-xl flex-shrink-0">
                {msg.role === "bot" ? (
                  <FaRobot />
                ) : msg.role === "user" ? (
                  <FaUser />
                ) : (
                  <FaLightbulb />
                )}
              </span>
              <div className="flex flex-col flex-grow w-full">
                <span className="whitespace-pre-wrap leading-relaxed text-sm md:text-base break-words">
                  {renderMessageContent(msg.content)}
                </span>
                {msg.role === "user" && msg.senderAddress && (
                  <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    From: {msg.senderAddress.substring(0, 6)}...{msg.senderAddress.substring(msg.senderAddress.length - 4)}
                  </p>
                )}
                {msg.image && (
                  <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden mt-3 border border-gray-400">
                    <Image
                      src={`data:image/jpeg;base64,${msg.image}`}
                      alt="Generated"
                      layout="fill"
                      objectFit="cover"
                      className="rounded-xl"
                    />
                    {msg.role === "bot" && (
                      <button
                        onClick={() => handleDownloadImage(msg.image!)}
                        className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white p-2 rounded-full text-lg hover:bg-opacity-80 transition-opacity"
                        title="Download Image"
                      >
                        <FaDownload />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-start gap-3">
            <div
              className={`flex items-center max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-md ${getMessageColors("bot")}`}
            >
              <span className="mr-3 text-xl flex-shrink-0">
                <FaRobot />
              </span>
              {/* Modern Typing Indicator */}
              <div className="animate-pulse flex space-x-2">
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Area Input */}
      <div className={`p-4 border-t ${borderColor} ${theme === "dark" ? "bg-gray-950" : "bg-gray-50"} flex flex-col items-center`}>
        {imagePreviewUrl && (
          <div className="relative w-32 h-32 mb-4 rounded-xl overflow-hidden border border-gray-400">
            <Image
              src={imagePreviewUrl}
              alt="Pratinjau Gambar"
              layout="fill"
              objectFit="cover"
              className="rounded-xl"
            />
            <button
              onClick={clearImagePreview}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs z-10 shadow-md hover:bg-red-600 transition"
              title="Hapus gambar"
            >
              <FaTimesCircle />
            </button>
          </div>
        )}

        {mode !== "chat" && mode !== "image" && (
          <div className={`mb-3 py-1 px-3 rounded-full text-sm font-semibold flex items-center gap-2 ${activeModeBgColor} self-start`}>
            {getIcon(mode)} Mode {mode.toUpperCase()} Aktif
          </div>
        )}

        <form onSubmit={sendMessage} className="flex flex-col gap-3 w-full md:max-w-5xl">
          {/* Textarea dan Tombol Kirim */}
          <div className="flex items-end gap-3 w-full">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder={`Send message in ${mode.toUpperCase()} mode...`}
              className={`flex-grow resize-none rounded-xl py-3 px-5 ${inputBgColor} ${inputTextColor} ${placeholderColor} text-sm md:text-base focus:outline-none border ${borderColor} focus:ring-2 ${
                theme === "dark" ? "focus:ring-blue-500" : "focus:ring-blue-400"
              } transition-all duration-200`}
              style={{ maxHeight: "200px", overflowY: "auto" }}
            />

            {/* Tombol Kirim */}
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imageBase64)}
              className={`${buttonBgColor} ${buttonTextColor} p-3 rounded-xl text-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
              title="Send Message"
            >
              <FaPaperPlane />
            </button>
          </div>

          {/* Baris bawah tombol (Alat, Unggah Gambar, Mikrofon) */}
          <div className="flex items-center justify-start gap-3 w-full">
            {/* Image Upload Button */}
            <label
              htmlFor="imageUpload"
              className={`${toolButtonBgColor} ${toolButtonTextColor} p-3 rounded-xl cursor-pointer transition-all duration-200 text-xl flex-shrink-0`}
              title="Upload Image"
            >
              <FaImage />
              <input
                type="file"
                accept="image/*"
                id="imageUpload"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {/* Tools Dropdown */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                className={`${toolButtonBgColor} ${toolButtonTextColor} px-4 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 text-sm md:text-base`}
                title="Select Tool"
              >
                Tools <FaChevronDown className="text-xs ml-1" />
              </button>
              {showTools && (
                <div
                  className={`absolute bottom-full mb-2 left-0 right-0 md:w-auto min-w-[160px] ${dropdownBgColor} border ${borderColor} rounded-lg shadow-xl z-50 text-sm ${dropdownTextColor}`}
                >
                  <button
                    type="button"
                    onClick={() => setToolMode("reasoning")}
                    className={`flex items-center w-full gap-2 px-4 py-3 ${dropdownHoverBgColor} rounded-t-lg text-left text-base`}
                  >
                    <FaLightbulb />
                    Reasoning
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode("websearch")}
                    className={`flex items-center w-full gap-2 px-4 py-3 ${dropdownHoverBgColor} text-left text-base`}
                  >
                    <FaGlobe />
                    Web Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolMode("imagegen")}
                    className={`flex items-center w-full gap-2 px-4 py-3 ${dropdownHoverBgColor} rounded-b-lg text-left text-base`}
                  >
                    <FaPlus />
                    Image Generator
                  </button>
                </div>
              )}
            </div>

            {/* Microphone Button (removed from ChatBox) */}
            {/* <button
              type="button"
              title={isRecording ? "Stop Recording" : "Start Voice Input"}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-xl transition-all duration-200 text-xl flex-shrink-0 ${
                isRecording ? "bg-red-600 text-white hover:bg-red-700" : `${toolButtonBgColor} ${toolButtonTextColor}`
              }`}
            >
              <FaMicrophone />
            </button> */}
          </div>
        </form>
      </div>
    </div>
  );
}