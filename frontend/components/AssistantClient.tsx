"use client";

import { useState } from "react";
import Topbar from "./Topbar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { sendAssistantChat } from "../lib/api";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const seedMessages: Message[] = [
  {
    role: "assistant",
    text: "Ask me why Model A is favoring a sector or request a weekly portfolio briefing."
  },
  {
    role: "user",
    text: "Summarize the top drivers of model performance this week."
  },
  {
    role: "assistant",
    text: "Momentum and liquidity remain dominant, while drift readings stayed below the alert threshold."
  }
];

export default function AssistantClient() {
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const nextQuery = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: nextQuery }]);
    setInput("");
    setIsSending(true);
    try {
      const res = await sendAssistantChat(nextQuery);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.reply || "No reply returned." }
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Unable to reach the assistant backend yet. Check OPENAI_API_KEY or API availability."
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <Topbar
        title="AI Assistant"
        subtitle="Conversational explainability layer for model decisions and portfolio insights."
        eyebrow="Assistant"
        actions={<Badge variant="secondary">Preview</Badge>}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversation</CardTitle>
          <Badge variant="outline">Phase 6</Badge>
        </CardHeader>
        <CardContent className="flex h-[420px] flex-col gap-4 overflow-hidden">
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
            {messages.length === 0 ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`rounded-xl px-3 py-2 ${
                    msg.role === "assistant"
                      ? "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                      : "bg-ink/5 text-slate-800 dark:bg-white/5 dark:text-white"
                  }`}
                >
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {msg.role === "assistant" ? "Assistant" : "You"}
                  </span>
                  <p className="mt-1">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about drift, signals, or explainability..."
              className="flex-1 rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            />
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
