"use client";

import {
  FaRobot,
  FaUser,
  FaMicrophone,
  FaPlus,
  FaChevronDown,
  FaGlobe,
  FaLightbulb,
} from "react-icons/fa";
import { useEffect, useRef, useState } from "react";

type Role = "user" | "bot" | "system";
type Mode = "chat" | "image" | "reasoning" | "websearch";

type Message = {
  role: Role;
  content: string;
};

type RequestBody = {
  prompt?: string;
  imageBase64?: string;
  type: Mode;
};

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      content: "🤖 Hello! I'm your AI assistant. Ask me anything you'd like 🚀",
    },
  ]);
  const [showTools, setShowTools] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("chat");
  const chatRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !imageBase64) return;

    const userMsg: Message = {
      role: "user",
      content: input || "[Image + prompt]",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const body: RequestBody = {
      prompt: input,
      type: imageBase64 ? "image" : mode,
    };
    if (imageBase64) {
      body.imageBase64 = imageBase64;
    }

    const res = await fetch("/api/groq/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setMessages((prev) => [
      ...prev,
      { role: "bot", content: `${getIcon(body.type)} ${data.message}` },
    ]);
    setImageBase64(null);
    setMode("chat");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setImageBase64(base64);
        setMessages((prev) => [
          ...prev,
          {
            role: "user",
            content: "🖼️ [Image ready, now type your question and send]",
          },
        ]);
        setMode("image");
      };
      reader.readAsDataURL(file);
    }
  };

  const setToolMode = (tool: Mode) => {
    setMode(tool);
    setShowTools(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: `🔧 Switched to ${tool.toUpperCase()} mode.`,
      },
    ]);
  };

  const getIcon = (type: Mode) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "reasoning":
        return "🧠";
      case "websearch":
        return "🌐";
      default:
        return "🤖";
    }
  };

  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 mt-10 px-4">
      <div
        ref={chatRef}
        className="bg-[#1a1a1f] border border-[#333] rounded-2xl p-6 h-[65vh] overflow-y-auto space-y-5 text-base"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-4 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`${
                msg.role === "bot"
                  ? "bg-[#2c2c2c] text-[#dfbfc9]"
                  : msg.role === "system"
                  ? "bg-blue-900 text-blue-100"
                  : "bg-[#dfbfc9] text-black"
              } p-4 rounded-2xl max-w-[80%] flex items-start gap-3 shadow-md`}
            >
              {msg.role === "bot" ? (
                <FaRobot className="mt-1" />
              ) : msg.role === "user" ? (
                <FaUser className="mt-1" />
              ) : (
                <FaLightbulb className="mt-1" />
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="flex items-end gap-3 flex-wrap">
        <label
          htmlFor="imageUpload"
          className="bg-[#2f2f2f] text-[#dfbfc9] p-3 rounded-xl hover:bg-[#3a3a3a] transition cursor-pointer"
          title="Upload Image"
        >
          <FaPlus />
          <input
            type="file"
            accept="image/*"
            id="imageUpload"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTools(!showTools)}
            className="bg-[#2f2f2f] text-[#dfbfc9] px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-[#3a3a3a] transition"
          >
            Tools <FaChevronDown className="text-xs" />
          </button>
          {showTools && (
            <div className="absolute left-0 mt-2 bg-[#2f2f2f] border border-[#444] rounded-lg shadow-lg z-50 text-sm text-white w-40">
              <button
                type="button"
                onClick={() => setToolMode("reasoning")}
                className="flex items-center w-full gap-2 px-4 py-2 hover:bg-[#444]"
              >
                <FaLightbulb className="text-[#dfbfc9]" />
                Reasoning
              </button>
              <button
                type="button"
                onClick={() => setToolMode("websearch")}
                className="flex items-center w-full gap-2 px-4 py-2 hover:bg-[#444]"
              >
                <FaGlobe className="text-[#dfbfc9]" />
                Web Search
              </button>
            </div>
          )}
        </div>

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
          placeholder={
            imageBase64
              ? "Describe the image or ask something about it..."
              : mode === "reasoning"
              ? "Type your reasoning question..."
              : mode === "websearch"
              ? "Type your search query..."
              : "Type your message..."
          }
          className="flex-grow resize-none rounded-xl p-4 bg-[#2f2f2f] text-[#dfbfc9] placeholder-gray-400 text-sm focus:outline-none border border-gray-600 focus:ring-2 focus:ring-[#dfbfc9]"
        />

        <button
          type="button"
          title="Voice Mode"
          className="bg-[#dfbfc9] text-black px-4 py-3 rounded-xl hover:bg-[#f3cddd] transition"
        >
          <FaMicrophone />
        </button>

        <button
          type="submit"
          className="bg-[#dfbfc9] hover:bg-[#f7d7e2] text-black font-bold px-6 py-3 rounded-xl text-sm shadow-md transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
