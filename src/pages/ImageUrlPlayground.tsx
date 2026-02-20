
import React, { useState, useRef } from "react";
import { Link2, ArrowUp, Copy, Check, ExternalLink, ChevronDown, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels, VISION_MODEL_KEY } from "@/hooks/useModels";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { apiUrl, apiFetch } from "@/lib/api";

const ImageUrlPlayground = () => {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels(VISION_MODEL_KEY);
  const visionModels = models.filter(m => m.vision);

  const { isListening, toggleVoice } = useVoiceInput((transcript) => {
    setPrompt(prev => prev + (prev ? " " : "") + transcript);
  });

  // Set initial vision model if not set
  React.useEffect(() => {
    if (!modelsLoading && visionModels.length > 0 && !visionModels.find(m => m.id === selectedModel)) {
      setSelectedModel(visionModels[0].id);
    }
  }, [modelsLoading, visionModels, selectedModel, setSelectedModel]);

  const handleSend = () => {
    if (!imageUrl.trim() || !prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResponse(null);

    apiFetch(apiUrl("/vision/url"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: imageUrl.trim(),
        query: prompt.trim(),
        model: selectedModel,
      }),
    })
      .then(res => {
        if (res.status === 403) {
          throw new Error("IP_NOT_WHITELISTED");
        }
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        const content = data?.choices?.[0]?.message?.content || data?.content || data?.response || data?.text || JSON.stringify(data, null, 2);
        setResponse(content);
      })
      .catch(err => {
        const errorMsg = err.message === "IP_NOT_WHITELISTED" 
          ? "Your IP address is not whitelisted. Please contact the administrator to whitelist your IP."
          : err.message;
        setResponse(JSON.stringify({ error: errorMsg }, null, 2));
      })
      .finally(() => setIsLoading(false));
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isValidUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");

  return (
    <div className="flex flex-col h-full items-center">
      {/* Persistent sticky model selector header */}
      <div className="w-full shrink-0 flex justify-center py-3 sm:py-4 border-b border-border/50 bg-background/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1.5 text-[13px] sm:text-[14px] font-medium text-foreground hover:bg-secondary/80 px-3 py-2 sm:py-1.5 rounded-xl border border-border transition-colors backdrop-blur-sm bg-background/50 active:scale-[0.97]"
          >
            <span className="truncate max-w-[200px] sm:max-w-none">
              {modelsLoading ? "Loading..." : visionModels.find(m => m.id === selectedModel)?.name || selectedModel || "Select model"}
            </span>
            <ChevronDown size={14} className={cn("transition-transform opacity-60 shrink-0", showModelDropdown && "rotate-180")} />
          </button>
          {showModelDropdown && visionModels.length > 0 && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[min(16rem,calc(100vw-2rem))] max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95">
              {visionModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setShowModelDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-3 sm:py-2.5 text-[13px] hover:bg-secondary transition-colors truncate active:bg-secondary",
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

      <div className="flex-1 w-full max-w-[640px] px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto min-h-0 scroll-smooth">
        <div className="space-y-5 sm:space-y-6">

          {/* Title */}
          <div className="text-center">
            <h1 className="font-display text-xl sm:text-2xl text-foreground">Image URL</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Provide an image URL and a prompt to analyze it with your model.
            </p>
          </div>

          {/* URL input */}
          <div className="space-y-3">
            <div className="relative bg-card border border-border rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-ring/50 transition-shadow">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Link2 size={15} />
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewError(false);
                }}
                placeholder="https://example.com/image.png"
                className="w-full bg-transparent pl-10 pr-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Image preview */}
            {isValidUrl && !previewError && (
              <div className="animate-fade-in border border-border rounded-xl p-4 bg-card relative group">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-56 rounded-lg mx-auto object-contain"
                  onError={() => setPreviewError(true)}
                />
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            {previewError && isValidUrl && (
              <p className="text-xs text-destructive px-1">
                Could not load image preview. The URL may be invalid or blocked by CORS.
              </p>
            )}
          </div>

          <div className="relative bg-card border border-border rounded-xl focus-within:border-ring/40 transition-all flex items-end shadow-sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder="What should the model analyze about this image?"
              rows={2}
              maxLength={1000}
              className="w-full resize-none bg-transparent px-4 py-[14px] text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[60px]"
            />
            <div className="flex items-center gap-1.5 pr-3 pb-2">
              <span className={cn("text-[10px] tabular-nums", prompt.length >= 1000 ? "text-destructive" : "text-muted-foreground/40")}>
                {prompt.length}/1k
              </span>
              {/* Voice input */}
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
              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!isValidUrl || !prompt.trim() || isLoading}
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

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
              <div className="w-4 h-4 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
              Analyzing image...
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="animate-fade-in space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Response</p>
                <button onClick={handleCopy} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </div>
              <pre className="bg-card border border-border rounded-xl p-4 text-sm font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUrlPlayground;
