
import React, { useState, useRef } from "react";
import { Upload, ArrowUp, X, Copy, Check, ChevronDown, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels, VISION_MODEL_KEY } from "@/hooks/useModels";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { apiUrl, apiFetch } from "@/lib/api";

const VisionPlayground = () => {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setImage(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = () => {
    if (!image || !prompt.trim() || isLoading) return;
    setIsLoading(true);
    setResponse(null);

    // Extract pure base64 from data URL
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    apiFetch(apiUrl("/vision/base64"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Image,
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

  return (
    <div className="flex flex-col h-full items-center">
      {/* Persistent sticky model selector header */}
      <div className="w-full shrink-0 flex justify-center py-4 border-b border-border/50 bg-background/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModelDropdown(!showModelDropdown)}
            className="flex items-center gap-1.5 text-[14px] font-medium text-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-xl border border-border transition-colors backdrop-blur-sm bg-background/50"
          >
            <span>
              {modelsLoading ? "Loading..." : visionModels.find(m => m.id === selectedModel)?.name || selectedModel || "Select model"}
            </span>
            <ChevronDown size={14} className={cn("transition-transform opacity-60", showModelDropdown && "rotate-180")} />
          </button>
          {showModelDropdown && visionModels.length > 0 && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95">
              {visionModels.map((m) => (
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

          {/* Title */}
          <div className="text-center">
            <h1 className="font-display text-2xl text-foreground">Vision / Base64</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Upload an image and describe what you'd like the model to analyze.
            </p>
          </div>

          {/* Upload area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !image && fileInputRef.current?.click()}
            className={cn(
              "relative border rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden",
              image ? "border-border bg-card" : "border-dashed",
              isDragging ? "border-primary bg-accent" : !image && "border-border hover:border-muted-foreground/30 hover:bg-card/50"
            )}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {image ? (
              <div className="relative p-4">
                <img src={image} alt="Uploaded" className="max-h-72 rounded-xl mx-auto object-contain" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="absolute top-3 right-3 w-7 h-7 bg-background/80 backdrop-blur-sm border border-border rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
                <p className="text-[11px] text-muted-foreground text-center mt-3">{fileName}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 px-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                  <Upload size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground font-medium">Drop an image here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — up to 10MB</p>
              </div>
            )}
          </div>

          <div className="relative bg-card border border-border rounded-xl focus-within:border-ring/40 transition-all flex items-end shadow-sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 1000))}
              placeholder="What should the model look for?"
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
                disabled={!image || !prompt.trim() || isLoading}
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

export default VisionPlayground;
