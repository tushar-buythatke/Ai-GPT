
import React, { useState } from "react";
import { BookOpen, Copy, Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";

interface ApiEndpoint {
  id: string;
  method: "POST" | "GET";
  name: string;
  path: string;
  description: string;
  headers: Record<string, string>;
  body: string;
  response: string;
}

const endpoints: ApiEndpoint[] = [
  {
    id: "models",
    method: "GET",
    name: "List Models",
    path: "/v1/models",
    description: "Retrieve the list of available models. Use the returned model IDs in other endpoints.",
    headers: {
      "Content-Type": "application/json",
    },
    body: "// No request body required (GET request)",
    response: JSON.stringify(
      {
        data: [
          { id: "google/gemma-3-27b" },
          { id: "qwen/qwen3-vl-30b" },
          { id: "openai/gpt-oss-120b" },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "chat",
    method: "POST",
    name: "Chat Completions",
    path: "/v1/chat/completions",
    description: "Send a conversation to the model and receive a completion response. Compatible with OpenAI chat completions format.",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "user", content: "Hello, how are you?" },
        ],
      },
      null,
      2
    ),
    response: JSON.stringify(
      {
        choices: [
          {
            message: {
              role: "assistant",
              content: "I'm doing well, thank you for asking!",
            },
          },
        ],
      },
      null,
      2
    ),
  },
  {
    id: "vision-base64",
    method: "POST",
    name: "Vision / Base64",
    path: "/vision/base64",
    description: "Analyze an image by sending its Base64 encoded data along with a text prompt.",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        base64Image: "iVBORw0KGgo...",
        query: "Describe what you see in this image.",
        model: "google/gemma-3-27b",
      },
      null,
      2
    ),
    response: JSON.stringify(
      {
        content: "The image shows a modern dashboard interface with charts and data visualizations.",
      },
      null,
      2
    ),
  },
  {
    id: "vision-url",
    method: "POST",
    name: "Vision / Image URL",
    path: "/vision/url",
    description: "Analyze an image by providing its URL along with a text prompt. The server fetches the image and processes it.",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        imageUrl: "https://example.com/photo.png",
        query: "What objects are in this image?",
        model: "qwen/qwen3-vl-30b",
      },
      null,
      2
    ),
    response: JSON.stringify(
      {
        content: "The image contains a laptop, coffee cup, and notebook on a wooden desk.",
      },
      null,
      2
    ),
  },
  {
    id: "file-upload",
    method: "POST",
    name: "File Upload",
    path: "/process/file",
    description: "Upload a file (images, PDF, text files) and ask the model to analyze or extract information from it. Supported formats: JPG, PNG, WebP, GIF, PDF, TXT, MD, JSON, CSV, XML, HTML.",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: `// FormData fields:
{
  file: <File>,           // The file to process
  query: "Summarize this document",
  model: "openai/gpt-oss-120b"
}`,
    response: JSON.stringify(
      {
        content: "This document discusses the implementation of machine learning models...",
        reasoningContent: "Analyzing the document structure and key points...",
        stats: {
          tokensPerSecond: 85.95,
          totalTimeSec: 0.877,
          promptTokensCount: 106,
          predictedTokensCount: 77,
        },
      },
      null,
      2
    ),
  },
  {
    id: "voice",
    method: "POST",
    name: "Voice / Audio",
    path: "/voice",
    description: "Upload an audio file for transcription using Whisper. Supported formats: MP3, MP4, MPEG, MPGA, M4A, WAV, WebM, OGG, FLAC, AAC, OPUS, WMA.",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: `// FormData fields:
{
  audio: <File>,          // The audio file to transcribe (required)
  query: "Technical interview"  // Optional: context to improve accuracy
}`,
    response: JSON.stringify(
      {
        text: "Hello, this is a transcription of the uploaded audio file.",
      },
      null,
      2
    ),
  },
];

const CodeBlock = ({ code, language = "json" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-secondary/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <pre className="bg-background border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
};

const EndpointCard = ({ endpoint }: { endpoint: ApiEndpoint }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-card/50 transition-colors"
      >
        <span className={cn(
          "shrink-0 text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded",
          endpoint.method === "GET" ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"
        )}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
        <span className="text-xs text-muted-foreground hidden sm:block">{endpoint.name}</span>
        {expanded ? (
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-5 space-y-5 animate-fade-in bg-card/30">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Headers</h4>
            <CodeBlock
              code={Object.entries(endpoint.headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Request Body</h4>
            <CodeBlock code={endpoint.body} />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Response</h4>
            <CodeBlock code={endpoint.response} />
          </div>
        </div>
      )}
    </div>
  );
};

const ApiDocs = () => {
  const { models } = useModels();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDisplayModel, setSelectedDisplayModel] = useState<string | null>(null);

  const activeModel = models.find(m => m.id === selectedDisplayModel) || models[0];

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center h-14 px-6 border-b border-border shrink-0">
        <BookOpen size={16} className="text-primary mr-2" />
        <h1 className="font-display text-sm tracking-wide">API Documentation</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Intro */}
          <div className="space-y-2">
            <h2 className="font-display text-xl">API Reference</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Six endpoints to interact with your models. All endpoints accept JSON except file uploads which use multipart/form-data.
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base URL</h3>
            <CodeBlock code="https://ail.buyhatke.com" />
          </div>

          {/* Endpoints */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endpoints</h3>
            {endpoints.map((ep) => (
              <EndpointCard key={ep.id} endpoint={ep} />
            ))}
          </div>

          <div className="bg-accent/50 border border-primary/10 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-accent-foreground text-center">Available Models</h3>

            <div className="flex justify-center">
              <div className="relative w-full max-w-sm">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full flex items-center justify-between gap-2 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 transition-all text-left shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{activeModel?.name || "Select a model"}</span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">{activeModel?.id}</span>
                  </div>
                  <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", showDropdown && "rotate-180")} />
                </button>

                {showDropdown && models.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto animate-fade-in translate-y-0">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedDisplayModel(m.id);
                          setShowDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 hover:bg-secondary transition-colors border-b border-border last:border-0",
                          m.id === (selectedDisplayModel || models[0]?.id) ? "bg-secondary/50" : ""
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{m.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{m.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-sm mx-auto">
              Use the <code className="text-[10px] bg-card px-1.5 py-0.5 rounded border border-border font-mono mx-0.5 text-foreground">/v1/models</code> endpoint
              to fetch the current list of available models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
