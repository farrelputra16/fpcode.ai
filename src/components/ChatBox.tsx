// ChatBox.tsx
"use client";

import {
  FaRobot,
  FaUser,
  FaMicrophone,
  FaPlus,
  FaChevronDown,
  FaGlobe,
  FaLightbulb,
  FaImage,
  FaPaperPlane,
  FaTimesCircle,
  FaDownload, // Added for download icon
} from "react-icons/fa";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

type Role = "user" | "bot" | "system";
type Mode = "chat" | "image" | "reasoning" | "websearch" | "imagegen";
type ExtendedMode = Mode | "stream";

type Message = {
  role: Role;
  content: string;
  image?: string;
  timestamp: Date;
};

type RequestBody = {
  prompt?: string;
  imageBase64?: string;
  type: ExtendedMode;
  audioBase64?: string;
};

interface ChatBoxProps {
  theme: "light" | "dark";
}

export default function ChatBox({ theme }: ChatBoxProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [showTools, setShowTools] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mode, setMode] = useState<ExtendedMode>("chat");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Function to determine message background color based on theme and role
  const getMessageColors = useCallback((role: Role) => {
    if (role === "bot") {
      return theme === "dark"
        ? "bg-gray-700 text-white"
        : "bg-gray-200 text-gray-800";
    } else if (role === "system") {
      return theme === "dark"
        ? "bg-purple-800 text-white"
        : "bg-purple-200 text-purple-900";
    } else { // user
      return theme === "dark"
        ? "bg-blue-600 text-white"
        : "bg-blue-200 text-gray-800";
    }
  }, [theme]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imageBase64) return;

    const userMsg: Message = {
      role: "user",
      content: input || (imageBase64 ? "[Image + prompt]" : "[Voice message]"),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const currentModeForRequest = imageBase64 ? "image" : mode;

    const body: RequestBody = {
      prompt: input,
      type: currentModeForRequest,
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
        { role: "system", content: "🖼️ Image preview cleared. Switched to Chat mode.", timestamp: new Date() },
    ]);
  };

  const setToolMode = (tool: Mode) => {
    setMode(tool);
    setShowTools(false);
    setMessages((prev) => [
      ...prev,
      { role: "system", content: `🔧 Switched to ${tool.toUpperCase()} mode.`, timestamp: new Date() },
    ]);
  };

  const getIcon = (type: ExtendedMode) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "reasoning":
        return "🧠";
      case "websearch":
        return "🌐";
      case "imagegen":
        return "🎨";
      case "stream":
        return "🎤";
      default:
        return "🤖";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = handleSendAudio;
      mediaRecorder.start();
      setIsRecording(true);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "🎤 Recording started...", timestamp: new Date() },
      ]);
    } catch (error: unknown) {
      console.error("Error starting recording:", error);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "❌ Failed to start recording. Please allow microphone access.", timestamp: new Date() },
      ]);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setMessages((prev) => [
      ...prev,
      { role: "system", content: "🎤 Recording stopped. Processing audio...", timestamp: new Date() },
    ]);
  };

  const handleSendAudio = async () => {
    setLoading(true);
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const arrayBuffer = await blob.arrayBuffer();
    const pcmBuffer = await convertToPCM(arrayBuffer);
    const audioBase64 = bufferToBase64(pcmBuffer);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: "🎤 [Voice message sent]", timestamp: new Date() },
    ]);

    try {
      const res = await fetch("/api/groq/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "stream", audioBase64 }),
      });

      const json = await res.json();
      if (json.audioBase64) {
        playBase64Audio(json.audioBase64);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: "🎧 [Audio reply playing...]", timestamp: new Date() },
        ]);
      } else if (json.message) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: `${getIcon("stream")} ${json.message}`, timestamp: new Date() },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "❌ No response received from audio stream.", timestamp: new Date() },
        ]);
      }
    } catch (error: unknown) {
      console.error("Error streaming audio:", error);
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "❌ Failed to stream audio.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const convertToPCM = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
    if (typeof window === 'undefined') {
      console.warn("convertToPCM called on server, returning empty buffer.");
      return new ArrayBuffer(0);
    }

    const AudioContext = (window as typeof globalThis & { AudioContext: new (contextOptions?: AudioContextOptions) => AudioContext }).AudioContext ||
                         // @ts-expect-error error
                         (window as typeof globalThis & { webkitAudioContext: new (contextOptions?: AudioContextOptions) => AudioContext }).webkitAudioContext;
    const OfflineAudioContext = (window as typeof globalThis & { OfflineAudioContext: new (numberOfChannels: number, length: number, sampleRate: number) => OfflineAudioContext }).OfflineAudioContext ||
                                // @ts-expect-error error
                                (window as typeof globalThis & { webkitOfflineAudioContext: new (numberOfChannels: number, length: number, sampleRate: number) => OfflineAudioContext }).webkitOfflineAudioContext;

    if (!AudioContext || !OfflineAudioContext) {
      console.error("Web Audio API is not supported in this browser.");
      return new ArrayBuffer(0);
    }

    const ctx = new OfflineAudioContext(1, 16000 * 3, 16000);
    const decoded = await new AudioContext().decodeAudioData(buffer);
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start();
    const rendered = await ctx.startRendering();
    const float32 = rendered.getChannelData(0);

    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      int16[i] = Math.max(-1, Math.min(1, float32[i])) * 32767;
    }
    return int16.buffer;
  };

  const bufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playBase64Audio = (base64: string) => {
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    audio.play();
  };

  const handleDownloadImage = (base64Image: string) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Image}`;
    link.download = `generated-image-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to render message content with clickable links
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
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, imagePreviewUrl]);

  // Dynamic theme colors
  const bgColor = theme === "dark" ? "bg-gray-800" : "bg-white";
  const borderColor = theme === "dark" ? "border-gray-700" : "border-gray-300";
  const inputBgColor = theme === "dark" ? "bg-gray-700" : "bg-gray-100";
  const inputTextColor = theme === "dark" ? "text-white" : "text-gray-800";
  const placeholderColor = theme === "dark" ? "placeholder-gray-400" : "placeholder-gray-500";
  const buttonBgColor = theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600";
  const buttonTextColor = "text-white";
  const toolButtonBgColor = theme === "dark" ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-300 hover:bg-gray-400";
  const toolButtonTextColor = theme === "dark" ? "text-white" : "text-gray-800";
  const dropdownBgColor = theme === "dark" ? "bg-gray-700" : "bg-white";
  const dropdownHoverBgColor = theme === "dark" ? "hover:bg-gray-600" : "hover:bg-gray-100";
  const dropdownTextColor = theme === "dark" ? "text-white" : "text-gray-800";
  const activeModeBgColor = theme === "dark" ? "bg-blue-700 text-white" : "bg-blue-500 text-white";

  return (
    <div className={`flex flex-col h-full rounded-lg shadow-xl ${bgColor} ${borderColor} border`}>
      {/* Chat Display Area */}
      <div
        ref={chatRef}
        className="flex-grow overflow-y-auto p-6 space-y-6 w-full md:max-w-5xl mx-auto" // Increased max-width to 5xl
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex items-start max-w-[80%] md:max-w-[70%] rounded-xl p-4 shadow-md ${getMessageColors(msg.role)}`}
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
                {msg.image && (
                  <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden mt-3 border border-gray-400">
                    <Image
                      src={`data:image/jpeg;base64,${msg.image}`}
                      alt="Generated"
                      layout="fill"
                      objectFit="cover"
                      className="rounded-lg"
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
              className={`flex items-center max-w-[80%] md:max-w-[70%] rounded-xl p-4 shadow-md ${getMessageColors("bot")}`}
            >
              <span className="mr-3 text-xl flex-shrink-0">
                <FaRobot />
              </span>
              <div className="animate-pulse flex space-x-2">
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
                <div className="h-3 w-3 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t ${borderColor} ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"} flex flex-col items-center`}>
        {imagePreviewUrl && (
          <div className="relative w-32 h-32 mb-4 rounded-lg overflow-hidden border border-gray-400">
            <Image
              src={imagePreviewUrl}
              alt="Image Preview"
              layout="fill"
              objectFit="cover"
              className="rounded-lg"
            />
            <button
              onClick={clearImagePreview}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs z-10 shadow-md hover:bg-red-600 transition"
              title="Remove image"
            >
              <FaTimesCircle />
            </button>
          </div>
        )}

        {mode !== "chat" && mode !== "image" && (
          // Adjusted class to ensure it's left-aligned and still uses flex for its internal content
          <div className={`mb-3 py-1 px-3 rounded-full text-sm font-semibold flex items-center gap-2 ${activeModeBgColor} self-start`}>
            {getIcon(mode)} {mode.toUpperCase()} Mode Active
          </div>
        )}

        <form onSubmit={sendMessage} className="flex flex-col gap-3 w-full md:max-w-5xl"> {/* Increased max-width to 5xl */}
          {/* Textarea and Send Button */}
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
              className={`flex-grow resize-none rounded-full py-3 px-5 ${inputBgColor} ${inputTextColor} ${placeholderColor} text-sm md:text-base focus:outline-none border ${borderColor} focus:ring-2 ${
                theme === "dark" ? "focus:ring-blue-500" : "focus:ring-blue-400"
              } transition-all duration-200`}
              style={{ maxHeight: "200px", overflowY: "auto" }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || (!input.trim() && !imageBase64)}
              className={`${buttonBgColor} ${buttonTextColor} p-3 rounded-full text-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
              title="Send Message"
            >
              <FaPaperPlane />
            </button>
          </div>

          {/* Bottom row of buttons (Tools, Image Upload, Microphone) */}
          <div className="flex items-center justify-start gap-3 w-full">
            {/* File Upload Button */}
            <label
              htmlFor="imageUpload"
              className={`${toolButtonBgColor} ${toolButtonTextColor} p-3 rounded-full cursor-pointer transition-all duration-200 text-xl flex-shrink-0`}
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
                className={`${toolButtonBgColor} ${toolButtonTextColor} px-4 py-3 rounded-full flex items-center gap-2 transition-all duration-200 text-sm md:text-base`}
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

            {/* Microphone Button */}
            <button
              type="button"
              title={isRecording ? "Stop Recording" : "Start Voice"}
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-full transition-all duration-200 text-xl flex-shrink-0 ${
                isRecording ? "bg-red-600 text-white hover:bg-red-700" : `${toolButtonBgColor} ${toolButtonTextColor}`
              }`}
            >
              <FaMicrophone />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}