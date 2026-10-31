"use client";

import type Anthropic from "@anthropic-ai/sdk";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatEvent } from "../api/chat/route";

type Part = { kind: "text"; text: string } | { kind: "tool"; name: string };
type Bubble = { role: "user" | "assistant"; parts: Part[]; error?: string };

const TOOL_LABELS: Record<string, string> = {
  list_applications: "Listing applications",
  list_substitution_variables: "Reading substitution variables",
  get_member: "Looking up members",
  query_data: "Querying data",
  list_recent_jobs: "Checking recent jobs",
};

const SUGGESTIONS = [
  "Net income by entity, Actual vs Budget, Q3 FY26",
  "Revenue trend by month this year vs last year",
  "Which operating expenses are over budget YTD?",
  "Did any recent jobs fail?",
];

export function Chat() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Full API history (with tool calls), sent back on each turn.
  const history = useRef<Anthropic.Beta.BetaMessageParam[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  function updateLast(fn: (b: Bubble) => Bubble) {
    setBubbles((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    setBubbles((prev) => [
      ...prev,
      { role: "user", parts: [{ kind: "text", text: question }] },
      { role: "assistant", parts: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.current, input: question }),
      });
      if (res.status === 401) {
        // Full page load: /sign-in redirects to the external WorkOS login page.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/sign-in";
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line) handle(JSON.parse(line) as ChatEvent);
        }
      }
    } catch (err) {
      updateLast((b) => ({ ...b, error: err instanceof Error ? err.message : "Request failed" }));
    } finally {
      setBusy(false);
    }
  }

  function handle(e: ChatEvent) {
    switch (e.type) {
      case "text":
        updateLast((b) => {
          const last = b.parts[b.parts.length - 1];
          const parts =
            last?.kind === "text"
              ? [...b.parts.slice(0, -1), { kind: "text" as const, text: last.text + e.text }]
              : [...b.parts, { kind: "text" as const, text: e.text }];
          return { ...b, parts };
        });
        break;
      case "tool":
        updateLast((b) => ({ ...b, parts: [...b.parts, { kind: "tool", name: e.name }] }));
        break;
      case "done":
        history.current = e.messages;
        break;
      case "error":
        updateLast((b) => ({ ...b, error: e.message }));
        break;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {bubbles.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
            <p>Ask about your EPM data. Try:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {bubbles.map((b, i) => (
          <div key={i} className={b.role === "user" ? "self-end max-w-[80%]" : "self-start w-full"}>
            {b.role === "user" ? (
              <div className="rounded-2xl bg-foreground px-4 py-2 text-background">{b.parts[0]?.kind === "text" && b.parts[0].text}</div>
            ) : (
              <div className="flex flex-col gap-2">
                {b.parts.map((p, j) =>
                  p.kind === "tool" ? (
                    <span key={j} className="self-start rounded-md bg-black/5 px-2 py-1 text-xs text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                      {TOOL_LABELS[p.name] ?? p.name}…
                    </span>
                  ) : (
                    <div key={j} className="prose-chat">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.text}</ReactMarkdown>
                    </div>
                  ),
                )}
                {busy && i === bubbles.length - 1 && b.parts.length === 0 && (
                  <span className="text-sm text-zinc-500">Thinking…</span>
                )}
                {b.error && <p className="text-sm text-red-600">{b.error}</p>}
              </div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about revenue, budgets, jobs…"
          className="flex-1 rounded-full border border-black/15 bg-transparent px-4 py-2 outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
