/**
 * ChatBot.jsx
 * 
 * AI Customer Service chatbot (Maya) for MyStore.
 * - Drop this into src/components/ChatBot.jsx
 * - Add <ChatBot /> once in App.jsx (outside your routes, so it floats on every page)
 * 
 * Matches your project's Tailwind + Lucide React style.
 * Works for guests AND logged-in users (sends JWT if available).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  Loader2,
  Bot,
  ChevronDown,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const QUICK_REPLIES = [
  "Track my order",
  "What's in my cart?",
  "How do I cancel?",
  "Show my order history",
  "Payment not working",
];

const INITIAL_MESSAGE = {
  id: 1,
  role: "assistant",
  content: "Hi! I'm Maya, your MyStore assistant 👋 I can help you with orders, products, cart issues, and more. How can I help you today?",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem("token");

let msgIdCounter = 2;
const newId = () => msgIdCounter++;

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar — only for assistant */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0 mb-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-gray-900 text-white rounded-br-sm"
            : "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatBot() {
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState([INITIAL_MESSAGE]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [isOnline, setIsOnline]       = useState(true);
  const [unread, setUnread]           = useState(0);
  const [hasEverOpened, setHasEverOpened] = useState(false);
  const [isMinimised, setIsMinimised] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const abortRef       = useRef(null);

  // ── Health check on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/chatbot/health`)
      .then((r) => r.json())
      .then((d) => setIsOnline(d.success))
      .catch(() => setIsOnline(false));
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Focus input when opened ──────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimised) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimised]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;
      setInput("");

      const userMsg = { id: newId(), role: "user", content };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsLoading(true);

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/chatbot/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: nextMessages
              .slice(-20)
              .map(({ role, content }) => ({ role, content })),
          }),
          signal: abortRef.current.signal,
        });

        const data = await res.json();
        const botMsg = {
          id: newId(),
          role: "assistant",
          content: data.success
            ? data.reply
            : "Sorry, I'm having trouble right now. Please try again or email support@mystore.com",
        };

        setMessages((prev) => [...prev, botMsg]);

        // Badge if chat is closed
        if (!isOpen) setUnread((n) => n + 1);
      } catch (err) {
        if (err.name === "AbortError") return;
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content:
              "I'm unable to connect right now. Please try again shortly or reach us at support@mystore.com",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, isOpen]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimised(false);
    setHasEverOpened(true);
    setUnread(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    abortRef.current?.abort();
  };

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating action button ── */}
      <button
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? "Close chat" : "Open customer support"}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-900 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}

        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unread}
          </span>
        )}

        {/* First-time pulse ring */}
        {!isOpen && !hasEverOpened && (
          <span className="absolute inset-0 rounded-full bg-gray-900 animate-ping opacity-30" />
        )}
      </button>

      {/* ── Chat window ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right ${
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{ maxHeight: "560px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Maya</p>
              <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isOnline ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Clear chat */}
            <button
              onClick={handleClear}
              title="Clear chat"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Minimise */}
            <button
              onClick={() => setIsMinimised((v) => !v)}
              title="Minimise"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isMinimised ? "rotate-180" : ""
                }`}
              />
            </button>
            {/* Close */}
            <button
              onClick={handleClose}
              title="Close"
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible body */}
        {!isMinimised && (
          <>
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50 min-h-0" style={{ maxHeight: "340px" }}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies — only show early in conversation */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-3 py-2 flex flex-wrap gap-1.5 bg-gray-50 border-t border-gray-100">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-grow up to ~3 lines
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 72) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={isOnline ? "Type a message…" : "AI service offline"}
                disabled={isLoading || !isOnline}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 leading-relaxed"
                style={{ minHeight: "38px", maxHeight: "72px", overflowY: "auto" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 py-1.5 bg-white border-t border-gray-50">
              Powered by Ollama · MyStore AI
            </p>
          </>
        )}
      </div>
    </>
  );
}