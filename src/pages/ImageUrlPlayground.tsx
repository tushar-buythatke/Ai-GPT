
import React, { useState, useRef } from "react";
import { Link2, ArrowUp, Copy, Check, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import { apiUrl } from "@/lib/api";

const ImageUrlPlayground = () => {
  const [imageUrl, setImageUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels();

  const handleSend = () => {
    if (!imageUrl.trim() || !prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResponse(null);

    fetch(apiUrl("/vision/url"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: imageUrl.trim(),
        query: prompt.trim(),
        model: selectedModel,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setResponse(JSON.stringify(data, null, 2));
      })
      .catch(err => {
        setResponse(JSON.stringify({ error: err.message }, null, 2));
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-4 py-8 space-y-6">
          {/* Title */}
          <div>
            <h1 className="font-display text-xl text-foreground">Image URL</h1>
            <p className="text-sm text-muted-foreground mt-1">
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

          {/* Prompt */}
          <div className="relative bg-card border border-border rounded-xl focus-within:border-ring/40 transition-colors">
            {/* Model selector */}
            <div className="flex items-center px-3 pt-2.5 pb-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                >
                  <span className="font-medium truncate max-w-[180px]">
                    {modelsLoading ? "Loading..." : selectedModel || "Select model"}
                  </span>
                  <ChevronDown size={12} className={cn("transition-transform", showModelDropdown && "rotate-180")} />
                </button>
                {showModelDropdown && models.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg z-50">
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModelDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[13px] hover:bg-secondary transition-colors truncate",
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
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should the model analyze about this image?"
              rows={2}
              className="w-full resize-none bg-transparent px-4 py-3 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!isValidUrl || !prompt.trim() || isLoading}
              className={cn(
                "absolute right-3 bottom-3 transition-all",
                isValidUrl && prompt.trim() && !isLoading
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/20"
              )}
            >
              <ArrowUp size={20} />
            </button>
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
