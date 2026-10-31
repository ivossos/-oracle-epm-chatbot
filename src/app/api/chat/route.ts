import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { epmTools, isDemoMode, runEpmTool } from "@/lib/epm/tools";

// Events streamed to the browser, one JSON object per line.
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; input: unknown }
  | { type: "done"; messages: Anthropic.Beta.BetaMessageParam[] }
  | { type: "error"; message: string };

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 10;

const SYSTEM = `You are an assistant for Oracle EPM Cloud (Planning, FCCS, and related apps). You answer questions about the user's financial and planning data by calling the EPM tools.

How to work:
- Don't guess member names. Use get_member and list_substitution_variables to find valid names and the current year/period, then query_data.
- Every dimension not on rows or columns must be fixed in the pov.
- If a call fails, read the error, fix the request, and try again. Tell the user if you can't get the data.
- Show numbers in compact markdown tables and say which scenario, year and currency they are.
- You can only read data. If asked to change data or run jobs, say that isn't available.`;

const DEMO_NOTE = `

EPM is not connected yet, so the tools return sample "Vision" demo data. Mention once that the numbers are sample data.`;

export async function POST(req: Request) {
  const { user } = await withAuth();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    messages?: Anthropic.Beta.BetaMessageParam[];
    input?: string;
  } | null;
  const input = body?.input?.trim();
  if (!input || input.length > 10_000 || !Array.isArray(body?.messages ?? [])) {
    return new Response("Bad request", { status: 400 });
  }

  // Full API history (including thinking and tool blocks) is kept by the
  // browser and sent back unchanged, so earlier turns are never edited.
  const messages: Anthropic.Beta.BetaMessageParam[] = [...(body!.messages ?? []), { role: "user", content: input }];
  const system = SYSTEM + (isDemoMode() ? DEMO_NOTE : "");
  const client = new Anthropic();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        let jsonRetries = 0;
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const s = client.beta.messages.stream(
            {
              model: MODEL,
              max_tokens: 64000,
              system,
              messages,
              tools: epmTools,
              output_config: { effort: "medium" },
              cache_control: { type: "ephemeral" },
              // On a safety refusal, re-run on Anthropic's recommended fallback model.
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
            },
            { signal: req.signal },
          );
          s.on("text", (text) => send({ type: "text", text }));

          let message: Anthropic.Beta.BetaMessage;
          try {
            message = await s.finalMessage();
            jsonRetries = 0;
          } catch (err) {
            // Only a tool input that couldn't be parsed is retried; API errors go to the outer catch.
            if (err instanceof Anthropic.APIError || req.signal.aborted || jsonRetries++ >= 2) throw err;
            round--;
            continue;
          }

          if (message.stop_reason === "refusal") {
            send({ type: "text", text: "\n\nSorry, I can't help with that request." });
            break; // refused turn is not added to history
          }

          messages.push({ role: "assistant", content: message.content });

          if (message.stop_reason === "pause_turn") continue;

          const toolUses = message.content.filter(
            (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
          );
          if (toolUses.length === 0) break;

          if (message.stop_reason === "max_tokens") {
            messages.pop();
            throw new Error("The response was cut off. Please try a narrower question.");
          }
          if (round === MAX_TOOL_ROUNDS) {
            messages.pop();
            send({ type: "text", text: "\n\nI stopped after too many EPM lookups. Try a more specific question." });
            break;
          }

          for (const t of toolUses) send({ type: "tool", name: t.name, input: t.input });
          // Run calls in parallel and return all results in one user message.
          const results = await Promise.all(toolUses.map(runEpmTool));
          messages.push({ role: "user", content: results });
        }

        // History must end on an assistant turn; drop a dangling user turn on failure paths.
        while (messages.length && messages[messages.length - 1].role === "user") messages.pop();
        send({ type: "done", messages });
      } catch (err) {
        console.error("chat error", err);
        let message = "Something went wrong. Please try again.";
        if (err instanceof Anthropic.AuthenticationError) message = "The Claude API key is missing or invalid (ANTHROPIC_API_KEY).";
        else if (err instanceof Anthropic.RateLimitError) message = "Claude is rate limited right now. Try again in a minute.";
        else if (err instanceof Anthropic.APIError) message = `Claude API error ${err.status ?? ""}`.trim();
        else if (err instanceof Error) message = err.message;
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
