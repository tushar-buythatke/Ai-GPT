
import React, { useState } from "react";
import {
  BookOpen, Copy, Check, ChevronRight, Terminal, FileJson,
  Zap, Info, Radio, Layers, ArrowRight, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ApiEndpoint {
  id: string;
  method: "POST" | "GET";
  name: string;
  path: string;
  description: string;
  headers: Record<string, string>;
  body: string;
  response: string;
  category?: string;
  examples?: { label: string; body: string }[];
}

type Selection =
  | { kind: "endpoint"; id: string }
  | { kind: "guide"; id: "stateful" | "streaming" };

/* ─── Constants ──────────────────────────────────────────────────────────── */

const BASE_URL = "https://ail.buyhatke.com";

/* ─── Data ───────────────────────────────────────────────────────────────── */

const endpoints: ApiEndpoint[] = [
  {
    id: "models",
    method: "GET",
    category: "Models",
    name: "List Models",
    path: "/v1/models",
    description: "Retrieve the list of available models. Use the returned model IDs in other endpoints.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN" },
    body: "// No request body required (GET request)",
    response: JSON.stringify({ data: [{ id: "google/gemma-3-27b" }, { id: "qwen/qwen3-vl-30b" }, { id: "openai/gpt-oss-120b" }] }, null, 2),
  },
  {
    id: "chat",
    method: "POST",
    category: "Chat",
    name: "Chat Completions",
    path: "/v1/chat/completions",
    description: "Send a conversation to the model and receive a completion. Compatible with OpenAI chat completions format. Supports streaming via stream: true.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", messages: [{ role: "user", content: "Hello, how are you?" }], stream: false }, null, 2),
    response: JSON.stringify({ choices: [{ message: { role: "assistant", content: "I'm doing well, thank you for asking!" } }], usage: { prompt_tokens: 12, completion_tokens: 9, total_tokens: 21 } }, null, 2),
  },
  {
    id: "stateful-chat",
    method: "POST",
    category: "Chat",
    name: "Stateful Chat",
    path: "/api/v1/chat",
    description: "LM Studio-style stateful chat endpoint. Pass input as a string — the server stores context and returns a response_id. Use previous_response_id in the next request to continue the conversation without resending history. Set store: false for stateless one-off requests.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", input: "My favorite color is blue." }, null, 2),
    response: JSON.stringify({ model_instance_id: "openai/gpt-oss-120b", output: [{ type: "message", content: "That's great! Blue is a beautiful color..." }], response_id: "resp_abc123xyz..." }, null, 2),
    examples: [
      { label: "Continue conversation", body: JSON.stringify({ model: "openai/gpt-oss-120b", input: "What color did I just mention?", previous_response_id: "resp_abc123xyz..." }, null, 2) },
      { label: "Stateless (store: false)", body: JSON.stringify({ model: "openai/gpt-oss-120b", input: "Tell me a joke.", store: false }, null, 2) },
    ],
  },
  {
    id: "responses",
    method: "POST",
    category: "Chat",
    name: "Responses",
    path: "/v1/responses",
    description: "Create responses with support for streaming, reasoning, and stateful conversation context. Pass previous_response_id to continue a conversation without resending history. Compatible with the OpenAI Responses API.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/gpt-oss-120b", input: "Provide a prime number less than 50", reasoning: { effort: "low" } }, null, 2),
    response: JSON.stringify({ id: "resp_abc123xyz", model: "openai/gpt-oss-120b", output: [{ type: "message", content: "Here is a prime number less than 50: 47" }], output_text: "Here is a prime number less than 50: 47" }, null, 2),
  },
  {
    id: "vision-base64",
    method: "POST",
    category: "Vision",
    name: "Vision / Base64",
    path: "/vision/base64",
    description: "Analyze an image by sending its Base64-encoded data along with a text prompt.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image: "iVBORw0KGgo...", query: "Describe what you see in this image.", model: "google/gemma-3-27b" }, null, 2),
    response: JSON.stringify({ content: "The image shows a modern dashboard interface with charts and data visualizations." }, null, 2),
  },
  {
    id: "vision-url",
    method: "POST",
    category: "Vision",
    name: "Vision / Image URL",
    path: "/vision/url",
    description: "Analyze an image by providing its URL along with a text prompt. The server fetches and processes the image.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: "https://example.com/photo.png", query: "What objects are in this image?", model: "qwen/qwen3-vl-30b" }, null, 2),
    response: JSON.stringify({ content: "The image contains a laptop, coffee cup, and notebook on a wooden desk." }, null, 2),
  },
  {
    id: "file-upload",
    method: "POST",
    category: "Files",
    name: "File Upload",
    path: "/process/file",
    description: "Upload a file and ask the model to analyze or extract information from it. Supported: JPG, PNG, WebP, GIF, PDF, TXT, MD, JSON, CSV, XML, HTML.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "multipart/form-data" },
    body: `// FormData fields:\n{\n  file: <File>,\n  query: "Summarize this document",\n  model: "openai/gpt-oss-120b"\n}`,
    response: JSON.stringify({ content: "This document discusses the implementation of machine learning models...", stats: { tokensPerSecond: 85.95, totalTimeSec: 0.877, promptTokensCount: 106 } }, null, 2),
  },
  {
    id: "voice",
    method: "POST",
    category: "Audio",
    name: "Voice / Audio",
    path: "/voice",
    description: "Upload an audio file for transcription using Whisper. Supported: MP3, MP4, MPEG, M4A, WAV, WebM, OGG, FLAC, AAC, OPUS, WMA.",
    headers: { Authorization: "Bearer $HATKE_API_TOKEN", "Content-Type": "multipart/form-data" },
    body: `// FormData fields:\n{\n  audio: <File>,\n  query: "Technical interview"  // optional context\n}`,
    response: JSON.stringify({ text: "Hello, this is a transcription of the uploaded audio file." }, null, 2),
  },
];

const CATEGORY_ORDER = ["Models", "Chat", "Vision", "Files", "Audio"];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const generateCurl = (ep: ApiEndpoint, bodyOverride?: string): string => {
  const auth = `-H "Authorization: Bearer $HATKE_API_TOKEN"`;
  if (ep.method === "GET") return `curl ${BASE_URL}${ep.path} \\\n  ${auth}`;
  if (ep.headers["Content-Type"] === "multipart/form-data") {
    if (ep.id === "voice") return `curl -X POST ${BASE_URL}${ep.path} \\\n  ${auth} \\\n  -F "audio=@/path/to/audio.mp3" \\\n  -F "query=Technical interview"`;
    return `curl -X POST ${BASE_URL}${ep.path} \\\n  ${auth} \\\n  -F "file=@/path/to/file.pdf" \\\n  -F "query=Summarize this document" \\\n  -F "model=openai/gpt-oss-120b"`;
  }
  const body = bodyOverride ?? ep.body;
  return `curl -X POST ${BASE_URL}${ep.path} \\\n  ${auth} \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
};

/* ─── Primitive UI ───────────────────────────────────────────────────────── */

const useCopy = (text: string) => {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return { copied, copy };
};

const MethodBadge = ({ method, size = "sm" }: { method: "GET" | "POST"; size?: "sm" | "xs" }) => (
  <span className={cn(
    "font-mono font-bold tracking-wider rounded shrink-0",
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[9px] px-1 py-0.5",
    method === "GET"
      ? "text-emerald-400 bg-emerald-400/10"
      : "text-orange-400 bg-orange-400/10",
  )}>
    {method}
  </span>
);

// Always-dark code block (Postman style)
const DarkCode = ({ code, lang = "json" }: { code: string; lang?: string }) => {
  const { copied, copy } = useCopy(code);
  return (
    <div className="relative group rounded-lg overflow-hidden border border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-white/[0.06]">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="bg-zinc-900 text-zinc-200 font-mono text-[12px] leading-relaxed p-4 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
};

const CopyBtn = ({ text, label, icon: Icon }: { text: string; label: string; icon: React.ElementType }) => {
  const { copied, copy } = useCopy(text);
  return (
    <button onClick={copy} className={cn(
      "flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md border transition-all",
      copied
        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-secondary/50"
    )}>
      {copied ? <Check size={11} /> : <Icon size={11} />}
      {copied ? "Copied!" : label}
    </button>
  );
};

/* ─── Endpoint Detail Panel ──────────────────────────────────────────────── */

const DETAIL_TABS = ["cURL", "Request", "Response"] as const;
type DetailTab = typeof DETAIL_TABS[number];

const EndpointDetail = ({ ep }: { ep: ApiEndpoint }) => {
  const [tab, setTab] = useState<DetailTab>("cURL");
  const curl = generateCurl(ep);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="border-b border-border/50 px-6 py-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <MethodBadge method={ep.method} size="sm" />
          <code className="text-[15px] font-mono text-foreground font-medium flex-1 min-w-0 truncate">{ep.path}</code>
          <div className="flex items-center gap-2 shrink-0">
            <CopyBtn text={curl} label="cURL" icon={Terminal} />
            {ep.method !== "GET" && <CopyBtn text={ep.body} label="JSON" icon={FileJson} />}
          </div>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">{ep.description}</p>
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-transparent -mb-4 pb-0">
          {DETAIL_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              "text-[12px] font-medium px-3 py-1.5 rounded-t-md border-b-2 transition-all",
              tab === t ? "border-primary text-foreground bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {tab === "cURL" && (
          <>
            {/* Base request */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Base request</span>
                <CopyBtn text={curl} label="Copy" icon={Terminal} />
              </div>
              <DarkCode code={curl} lang="bash" />
            </div>

            {/* Variant curls for endpoints with examples */}
            {ep.examples && ep.examples.map(ex => {
              const variantCurl = generateCurl(ep, ex.body);
              return (
                <div key={ex.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{ex.label}</span>
                    <CopyBtn text={variantCurl} label="Copy" icon={Terminal} />
                  </div>
                  <DarkCode code={variantCurl} lang="bash" />
                </div>
              );
            })}
          </>
        )}

        {tab === "Request" && (
          <>
            <section className="space-y-2">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Headers</h4>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                {Object.entries(ep.headers).map(([k, v], i, arr) => (
                  <div key={k} className={cn("flex items-start gap-4 px-4 py-2.5 text-[12px] font-mono", i < arr.length - 1 && "border-b border-border/40")}>
                    <span className="text-primary/80 shrink-0 w-40">{k}</span>
                    <span className="text-muted-foreground break-all">{v}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Body</h4>
              <DarkCode code={ep.body} lang={ep.body.startsWith("//") ? "text" : "json"} />
            </section>
            {ep.examples && ep.examples.length > 0 && (
              <section className="space-y-3 pt-1">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Variants</h4>
                {ep.examples.map(ex => (
                  <div key={ex.label} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground bg-secondary/60 border border-border/50 rounded px-2 py-0.5">{ex.label}</span>
                    </div>
                    <DarkCode code={ex.body} />
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {tab === "Response" && (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">200 OK</span>
              <span className="text-[11px] text-muted-foreground font-mono">application/json</span>
            </div>
            <DarkCode code={ep.response} />
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Stateful Chats Guide ───────────────────────────────────────────────── */

const StatefulChatsGuide = () => {
  const startBody = JSON.stringify({ model: "openai/gpt-oss-120b", input: "My favorite color is blue." }, null, 2);
  const continueBody = JSON.stringify({ model: "openai/gpt-oss-120b", input: "What color did I just mention?", previous_response_id: "resp_abc123xyz" }, null, 2);
  const statelessBody = JSON.stringify({ model: "openai/gpt-oss-120b", input: "Tell me a joke.", store: false }, null, 2);
  const streamBody = JSON.stringify({ model: "openai/gpt-oss-120b", input: "Hello", stream: true }, null, 2);
  const startCurl = `curl -X POST ${BASE_URL}/v1/responses \\\n  -H "Authorization: Bearer $HATKE_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${startBody}'`;
  const continueCurl = `curl -X POST ${BASE_URL}/v1/responses \\\n  -H "Authorization: Bearer $HATKE_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${continueBody}'`;
  const startResponse = JSON.stringify({ id: "resp_abc123xyz", model_instance_id: "openai/gpt-oss-120b", output: [{ type: "message", content: "That's great! Blue is a beautiful color..." }] }, null, 2);

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Stateful Chats</h2>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          The <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono">/v1/responses</code> endpoint is stateful by default.
          You don't need to pass full conversation history — the server stores it and links responses via a unique <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono">id</code>.
          Branch any conversation by referencing a prior <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono">id</code>.
        </p>
      </div>

      {/* How it works diagram */}
      <div className="flex items-center gap-2 flex-wrap">
        {["Send input", "Get id in response", "Pass as previous_response_id", "Model remembers context"].map((s, i, arr) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2 bg-secondary/60 border border-border/50 rounded-lg px-3 py-2">
              <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full w-4 h-4 flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="text-[11px] text-foreground font-medium">{s}</span>
            </div>
            {i < arr.length - 1 && <ArrowRight size={12} className="text-muted-foreground shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">1. Start a conversation</h3>
          <CopyBtn text={startCurl} label="cURL" icon={Terminal} />
        </div>
        <DarkCode code={startCurl} lang="bash" />
      </div>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-4 py-3">
        <Info size={13} className="text-primary mt-0.5 shrink-0" />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Every response includes a unique <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1 py-0.5 rounded font-mono">id</code> you can use to branch or continue the conversation.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Response</h3>
        <DarkCode code={startResponse} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">2. Continue the conversation</h3>
          <CopyBtn text={continueCurl} label="cURL" icon={Terminal} />
        </div>
        <p className="text-[12px] text-muted-foreground">Pass the <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1 py-0.5 rounded font-mono">id</code> as <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1 py-0.5 rounded font-mono">previous_response_id</code>. The model remembers context without you resending history.</p>
        <DarkCode code={continueCurl} lang="bash" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Streaming</h3>
            <CopyBtn text={`curl -X POST ${BASE_URL}/v1/responses \\\n  -H "Authorization: Bearer $HATKE_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${streamBody}'`} label="cURL" icon={Terminal} />
          </div>
          <DarkCode code={streamBody} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Stateless (store: false)</h3>
            <CopyBtn text={`curl -X POST ${BASE_URL}/v1/responses \\\n  -H "Authorization: Bearer $HATKE_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${statelessBody}'`} label="cURL" icon={Terminal} />
          </div>
          <DarkCode code={statelessBody} />
        </div>
      </div>
    </div>
  );
};

/* ─── Streaming Events Guide ─────────────────────────────────────────────── */

interface SseEvent { type: string; desc: string; example: object; }

const SSE_EVENTS: SseEvent[] = [
  { type: "chat.start", desc: "Emitted at the start of a streaming response. Contains the model instance ID.", example: { type: "chat.start", model_instance_id: "openai/gpt-oss-120b" } },
  { type: "model_load.start", desc: "Signals a model is loading. Not emitted if already loaded.", example: { type: "model_load.start", model_instance_id: "openai/gpt-oss-120b" } },
  { type: "model_load.progress", desc: "Model load progress as a float 0–1.", example: { type: "model_load.progress", model_instance_id: "openai/gpt-oss-120b", progress: 0.65 } },
  { type: "model_load.end", desc: "Model load completed successfully.", example: { type: "model_load.end", model_instance_id: "openai/gpt-oss-120b", load_time_seconds: 12.34 } },
  { type: "prompt_processing.start", desc: "Model is starting to process the prompt.", example: { type: "prompt_processing.start" } },
  { type: "prompt_processing.progress", desc: "Prompt processing progress as a float 0–1.", example: { type: "prompt_processing.progress", progress: 0.5 } },
  { type: "prompt_processing.end", desc: "Prompt processing complete.", example: { type: "prompt_processing.end" } },
  { type: "reasoning.start", desc: "Model is starting to stream reasoning content.", example: { type: "reasoning.start" } },
  { type: "reasoning.delta", desc: "A chunk of reasoning text. Multiple deltas may arrive.", example: { type: "reasoning.delta", content: "Need to call function." } },
  { type: "reasoning.end", desc: "End of the reasoning stream.", example: { type: "reasoning.end" } },
  { type: "tool_call.start", desc: "Model is starting a tool call. Includes tool name and provider info (plugin or MCP).", example: { type: "tool_call.start", tool: "model_search", provider_info: { type: "ephemeral_mcp", server_label: "huggingface" } } },
  { type: "tool_call.arguments", desc: "Arguments streamed for the tool call.", example: { type: "tool_call.arguments", tool: "model_search", arguments: { sort: "trendingScore", limit: 1 } } },
  { type: "tool_call.success", desc: "Tool call completed. Contains arguments used and raw output string.", example: { type: "tool_call.success", tool: "model_search", output: "[{\"type\":\"text\",\"text\":\"Showing first 1 model...\"}]" } },
  { type: "tool_call.failure", desc: "Tool call failed. Reason: invalid_name or invalid_arguments.", example: { type: "tool_call.failure", reason: "Cannot find tool: open_browser.", metadata: { type: "invalid_name", tool_name: "open_browser" } } },
  { type: "message.start", desc: "Model is about to stream a message.", example: { type: "message.start" } },
  { type: "message.delta", desc: "A chunk of message text. Multiple deltas may arrive.", example: { type: "message.delta", content: "The current" } },
  { type: "message.end", desc: "End of the message stream.", example: { type: "message.end" } },
  { type: "error", desc: "Error during streaming. Types: invalid_request, unknown, mcp_connection_error, model_not_found, internal_error.", example: { type: "error", error: { type: "invalid_request", message: "\"model\" is required", code: "missing_required_parameter", param: "model" } } },
  { type: "chat.end", desc: "Final event with full aggregated response — equivalent to non-streaming response body.", example: { type: "chat.end", result: { model_instance_id: "openai/gpt-oss-120b", output: [{ type: "message", content: "The top-trending model is..." }], stats: { tokens_per_second: 43.73, time_to_first_token_seconds: 0.781 }, response_id: "resp_02b2..." } } },
];

const SseEventRow = ({ ev }: { ev: SseEvent }) => {
  const [open, setOpen] = useState(false);
  const isLifecycle = ev.type === "chat.start" || ev.type === "chat.end";
  const isError = ev.type === "error";
  return (
    <div className={cn("rounded-lg border overflow-hidden transition-all", isLifecycle ? "border-primary/20" : isError ? "border-destructive/20" : "border-border/40")}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/30 transition-colors">
        <code className={cn(
          "text-[10px] font-mono px-2 py-0.5 rounded shrink-0",
          isLifecycle ? "bg-primary/10 text-primary" : isError ? "bg-destructive/10 text-destructive" : "bg-zinc-800 text-zinc-300"
        )}>{ev.type}</code>
        <span className="text-[12px] text-muted-foreground flex-1 min-w-0 truncate hidden sm:block">{ev.desc}</span>
        <ChevronRight size={12} className={cn("text-muted-foreground shrink-0 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2 bg-secondary/10">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{ev.desc}</p>
          <DarkCode code={JSON.stringify(ev.example, null, 2)} />
        </div>
      )}
    </div>
  );
};

const StreamingEventsGuide = () => {
  const streamCurl = `curl -X POST ${BASE_URL}/v1/chat/completions \\\n  -H "Authorization: Bearer $HATKE_API_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "openai/gpt-oss-120b",\n    "messages": [{"role": "user", "content": "Hello"}],\n    "stream": true\n  }'`;

  return (
    <div className="p-6 space-y-7 max-w-3xl">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Radio size={16} className="text-primary" />
          <h2 className="text-base font-semibold text-foreground">Streaming Events (SSE)</h2>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Set <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1.5 py-0.5 rounded font-mono">stream: true</code> on any chat request to receive a Server-Sent Events stream.
          The stream always begins with <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1 py-0.5 rounded font-mono">chat.start</code> and ends with <code className="text-[11px] bg-zinc-900 text-zinc-200 px-1 py-0.5 rounded font-mono">chat.end</code>, which contains the full aggregated result.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Enable streaming</h3>
          <CopyBtn text={streamCurl} label="cURL" icon={Terminal} />
        </div>
        <DarkCode code={streamCurl} lang="bash" />
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">SSE wire format</h3>
        <DarkCode code={`event: <event type>\ndata: <JSON event data>`} lang="text" />
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">All event types</h3>
        <div className="flex flex-wrap gap-1.5">
          {SSE_EVENTS.map(e => (
            <code key={e.type} className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded border",
              e.type === "chat.start" || e.type === "chat.end" ? "bg-primary/10 text-primary border-primary/20" :
              e.type === "error" ? "bg-destructive/10 text-destructive border-destructive/20" :
              "bg-zinc-800 text-zinc-300 border-zinc-700"
            )}>{e.type}</code>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Event reference</h3>
        <div className="space-y-1.5">
          {SSE_EVENTS.map(ev => <SseEventRow key={ev.type} ev={ev} />)}
        </div>
      </div>
    </div>
  );
};

/* ─── Welcome Panel ──────────────────────────────────────────────────────── */

const WelcomePanel = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
      <Layers size={22} className="text-primary" />
    </div>
    <h2 className="text-lg font-semibold text-foreground mb-2">Select an endpoint</h2>
    <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
      Choose an endpoint from the sidebar to view its request format, headers, body, and example response.
    </p>
  </div>
);

/* ─── Main ───────────────────────────────────────────────────────────────── */

const ApiDocs = () => {
  const { models } = useModels();
  const [selected, setSelected] = useState<Selection | null>(null);

  const grouped = CATEGORY_ORDER.reduce<Record<string, ApiEndpoint[]>>((acc, cat) => {
    acc[cat] = endpoints.filter(e => e.category === cat);
    return acc;
  }, {});

  const selectedEndpoint = selected?.kind === "endpoint" ? endpoints.find(e => e.id === selected.id) : undefined;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Sidebar ── */}
      <aside className="w-56 sm:w-64 shrink-0 flex flex-col border-r border-border/50 bg-sidebar overflow-y-auto">
        {/* Logo row */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border/50 shrink-0">
          <BookOpen size={14} className="text-primary" />
          <span className="text-[13px] font-semibold tracking-wide text-foreground">API Reference</span>
        </div>

        {/* Base URL */}
        <div className="px-3 py-3 border-b border-border/30">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Base URL</p>
          <div className="flex items-center gap-1.5 bg-zinc-900 rounded-md px-2.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <code className="text-[10px] font-mono text-zinc-300 truncate">ail.buyhatke.com</code>
          </div>
        </div>

        {/* Endpoint groups */}
        <nav className="flex-1 py-2">
          {CATEGORY_ORDER.map(cat => (
            grouped[cat].length > 0 && (
              <div key={cat} className="mb-1">
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-4 py-1.5">{cat}</p>
                {grouped[cat].map(ep => {
                  const isActive = selected?.kind === "endpoint" && selected.id === ep.id;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => setSelected({ kind: "endpoint", id: ep.id })}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-all rounded-md mx-1",
                        isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      <MethodBadge method={ep.method} size="xs" />
                      <code className={cn("text-[11px] font-mono truncate flex-1", isActive ? "text-foreground" : "")}>{ep.path}</code>
                    </button>
                  );
                })}
              </div>
            )
          ))}

          {/* Guides */}
          <div className="mt-2 pt-2 border-t border-border/30">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest px-4 py-1.5">Guides</p>
            {[
              { id: "stateful" as const, label: "Stateful Chats", icon: Zap },
              { id: "streaming" as const, label: "Streaming Events", icon: Radio },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = selected?.kind === "guide" && selected.id === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelected({ kind: "guide", id })}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left transition-all rounded-md mx-1",
                    isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  <Icon size={11} className={isActive ? "text-primary" : ""} />
                  <span className="text-[11px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Auth hint */}
        <div className="px-3 py-3 border-t border-border/30 shrink-0">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Auth</p>
          <code className="text-[10px] font-mono text-zinc-400 block leading-relaxed">Bearer $HATKE_API_TOKEN</code>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">
        {!selected && <WelcomePanel />}
        {selected?.kind === "endpoint" && selectedEndpoint && (
          <EndpointDetail key={selectedEndpoint.id} ep={selectedEndpoint} />
        )}
        {selected?.kind === "guide" && selected.id === "stateful" && (
          <div className="flex-1 overflow-y-auto">
            <StatefulChatsGuide />
          </div>
        )}
        {selected?.kind === "guide" && selected.id === "streaming" && (
          <div className="flex-1 overflow-y-auto">
            <StreamingEventsGuide />
          </div>
        )}
      </main>
    </div>
  );
};

export default ApiDocs;
