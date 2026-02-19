
import React, { useState, useRef } from "react";
import { Upload, ArrowUp, X, Copy, Check, ChevronDown, ChevronRight, Mic, MicOff, FileText, Clock, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { apiUrl } from "@/lib/api";

interface FileResponse {
  content: string;
  reasoningContent?: string;
  nonReasoningContent?: string;
  stats?: {
    stopReason: string;
    tokensPerSecond: number;
    timeToFirstTokenSec: number;
    totalTimeSec: number;
    promptTokensCount: number;
    predictedTokensCount: number;
    totalTokensCount: number;
  };
  modelInfo?: {
    displayName: string;
    paramsString: string;
  };
  error?: string;
}

const ACCEPTED_TYPES = [
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp",
  ".pdf", ".txt", ".md", ".json", ".csv", ".xml", ".html"
];

const CodeBlock = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const [copied, setCopied] = useState(false);
  const language = className?.replace("language-", "") || "text";
  const code = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-4">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/50 border border-border rounded-t-lg text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="bg-muted/30 border border-t-0 border-border rounded-b-lg p-4 overflow-x-auto">
        <code className={`language-${language} text-sm font-mono`}>{children}</code>
      </pre>
    </div>
  );
};

const FilePlayground = () => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<FileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels();

  const { isListening, toggleVoice } = useVoiceInput((transcript) => {
    setPrompt(prev => prev + (prev ? " " : "") + transcript);
  });

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    setResponse(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (!file || !prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResponse(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("query", prompt.trim());
    formData.append("model", selectedModel);

    try {
      const res = await fetch(apiUrl("/process/file"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResponse(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = response?.nonReasoningContent || response?.content || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const displayContent = response?.nonReasoningContent || response?.content || "";

  return (
    <div className="flex flex-col h-full items-center">
      <div className="w-full shrink-0 flex justify-center py-4 border-b border-border/50 bg-background/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-xl border border-border transition-colors backdrop-blur-sm bg-background/50"
          >
            <span>
              {modelsLoading ? "Loading..." : models.find(m => m.id === selectedModel)?.name || selectedModel || "Select model"}
            </span>
            <ChevronDown size={14} className={cn("transition-transform opacity-60", showModelDropdown && "rotate-180")} />
          </button>
          {showModelDropdown && models.length > 0 && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setShowModelDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-[13px] hover:bg-secondary transition-colors truncate",
                    m.id === selectedModel ? "text-primary font-medium" : "text-foreground"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-[640px] px-4 py-8 overflow-y-auto min-h-0 scroll-smooth">
        <div className="space-y-6">

          <div className="text-center">
            <h1 className="font-display text-2xl text-foreground">File Upload</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Upload a file and describe what you'd like the model to analyze or extract.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
            className={cn(
              "relative border rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden",
              file ? "border-border bg-card" : "border-dashed",
              isDragging ? "border-primary bg-accent" : !file && "border-border hover:border-muted-foreground/30 hover:bg-card/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="relative p-4">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-72 rounded-xl mx-auto object-contain" />
                ) : (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                      <FileText size={28} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground font-medium truncate max-w-full">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatFileSize(file.size)}</p>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile(); }}
                  className="absolute top-3 right-3 w-7 h-7 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  <Upload size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium">Drop a file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDF, TXT, MD, JSON, CSV, XML, HTML</p>
              </div>
            )}
          </div>

          <div className="relative bg-card border border-border rounded-xl focus-within:border-ring/40 transition-all flex items-end shadow-sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should the model do with this file?"
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-[14px] text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[60px]"
            />
            <div className="flex items-center gap-1.5 pr-3 pb-2">
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  isListening
                    ? "text-destructive animate-pulse bg-destructive/10"
                    : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-secondary"
                )}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!file || !prompt.trim() || isLoading}
                className={cn(
                  "p-2 transition-all duration-300",
                  prompt.trim()
                    ? "text-primary scale-110 drop-shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                    : "text-muted-foreground/20 scale-100"
                )}
              >
                <ArrowUp size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
              Processing file...
            </div>
          )}

          {error && (
            <div className="animate-fade-in p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}

          {response && displayContent && (
            <div className="animate-fade-in space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Response</p>
                <button onClick={handleCopy} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="text-[15px] leading-relaxed text-foreground prose prose-sm dark:prose-invert prose-headings:font-display prose-headings:font-semibold prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children }: { className?: string; children?: React.ReactNode }) {
                        return <CodeBlock className={className}>{children}</CodeBlock>;
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-4">
                            <table className="w-full border-collapse border border-border rounded-lg overflow-hidden text-sm">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      th({ children }) {
                        return <th className="border border-border bg-muted/50 px-4 py-2 text-left font-medium">{children}</th>;
                      },
                      td({ children }) {
                        return <td className="border border-border px-4 py-2">{children}</td>;
                      }
                    }}
                  >
                    {displayContent}
                  </ReactMarkdown>
                </div>
              </div>

              {response.reasoningContent && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                  >
                    {showReasoning ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>Reasoning</span>
                  </button>
                  {showReasoning && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                      {response.reasoningContent}
                    </div>
                  )}
                </div>
              )}

              {response.stats && (
                <div className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors"
                  >
                    {showStats ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Clock size={14} />
                    <span>Stats</span>
                  </button>
                  {showStats && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Zap size={12} className="text-primary" />
                          <span className="text-muted-foreground">Speed:</span>
                          <span className="text-foreground font-medium">{response.stats.tokensPerSecond.toFixed(1)} tok/s</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-primary" />
                          <span className="text-muted-foreground">Time:</span>
                          <span className="text-foreground font-medium">{response.stats.totalTimeSec.toFixed(2)}s</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Prompt tokens:</span>
                          <span className="text-foreground font-medium">{response.stats.promptTokensCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Generated:</span>
                          <span className="text-foreground font-medium">{response.stats.predictedTokensCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePlayground;
