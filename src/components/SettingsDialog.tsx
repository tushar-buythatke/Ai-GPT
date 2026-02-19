
import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useModels } from "@/hooks/useModels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Settings, Palette, Trash2, ChevronDown } from "lucide-react";

const ACCENT_COLORS = [
  { name: "Sunburn", hsl: "24 95% 53%", preview: "bg-orange-500" },
  { name: "Green", hsl: "142 71% 45%", preview: "bg-green-500" },
  { name: "Blue", hsl: "217 91% 60%", preview: "bg-blue-500" },
  { name: "Purple", hsl: "271 91% 65%", preview: "bg-purple-500" },
  { name: "Rose", hsl: "350 89% 60%", preview: "bg-rose-500" },
  { name: "Cyan", hsl: "186 94% 42%", preview: "bg-cyan-500" },
];

type SettingsTab = "general" | "appearance" | "data";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("pulse-accent") || "Sunburn";
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const { models, selectedModel, setSelectedModel, loading: modelsLoading } = useModels();

  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelDropdown]);

  // Close dropdown when dialog closes
  useEffect(() => {
    if (!open) setShowModelDropdown(false);
  }, [open]);

  const handleAccentChange = (color: typeof ACCENT_COLORS[number]) => {
    setAccentColor(color.name);
    localStorage.setItem("pulse-accent", color.name);
    document.documentElement.style.setProperty("--primary", color.hsl);
    document.documentElement.style.setProperty("--ring", color.hsl);
    document.documentElement.style.setProperty("--sidebar-primary", color.hsl);
    document.documentElement.style.setProperty("--sidebar-ring", color.hsl);
  };

  const handleClearAllChats = () => {
    localStorage.removeItem("pulse-chat-sessions");
    localStorage.removeItem("pulse-active-chat");
    window.location.reload();
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
    { id: "data", label: "Data controls", icon: <Trash2 size={16} /> },
  ];

  const currentModelName = modelsLoading
    ? "Loading..."
    : models.find(m => m.id === selectedModel)?.name || selectedModel || "Select model";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl bg-card border-border/50 shadow-2xl p-0 gap-0 overflow-hidden">
        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="w-[180px] border-r border-border/50 p-3 space-y-0.5 shrink-0">
            <DialogHeader className="px-2 pb-3">
              <DialogTitle className="font-display text-base text-foreground">Settings</DialogTitle>
            </DialogHeader>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors",
                  activeTab === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-6">
                <h3 className="font-display text-base text-foreground">General</h3>

                {/* Theme */}
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-[14px] text-foreground">Appearance</p>
                    <p className="text-[12px] text-muted-foreground">Choose light or dark theme</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {theme === "dark" ? "Dark" : "Light"}
                  </button>
                </div>

                {/* Default model */}
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-[14px] text-foreground">Default model</p>
                    <p className="text-[12px] text-muted-foreground">Used in chat &amp; file upload</p>
                  </div>
                  <div className="relative" ref={modelDropdownRef}>
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      disabled={modelsLoading}
                      className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors max-w-[160px]"
                    >
                      <span className="truncate">{currentModelName}</span>
                      <ChevronDown
                        size={12}
                        className={cn("shrink-0 opacity-60 transition-transform", showModelDropdown && "rotate-180")}
                      />
                    </button>
                    {showModelDropdown && models.length > 0 && (
                      <div className="absolute right-0 top-full mt-1.5 w-60 max-h-52 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl z-[100] animate-in fade-in zoom-in-95">
                        {models.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setShowModelDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 text-[12px] hover:bg-secondary transition-colors truncate flex items-center gap-2",
                              m.id === selectedModel ? "text-primary font-medium" : "text-foreground"
                            )}
                          >
                            {m.vision && (
                              <span className="shrink-0 text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                                vision
                              </span>
                            )}
                            <span className="truncate">{m.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h3 className="font-display text-base text-foreground">Appearance</h3>

                {/* Theme toggle */}
                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <p className="text-[14px] text-foreground">Theme</p>
                  <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
                    <button
                      onClick={() => theme !== "light" && toggleTheme()}
                      className={cn(
                        "text-[12px] px-3 py-1 rounded-md transition-colors",
                        theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => theme !== "dark" && toggleTheme()}
                      className={cn(
                        "text-[12px] px-3 py-1 rounded-md transition-colors",
                        theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      Dark
                    </button>
                  </div>
                </div>

                {/* Accent color */}
                <div className="py-3 border-b border-border/30">
                  <p className="text-[14px] text-foreground mb-3">Accent color</p>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => handleAccentChange(color)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] border transition-all",
                          accentColor === color.name
                            ? "border-primary text-foreground bg-primary/10"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        )}
                      >
                        <span className={cn("w-3 h-3 rounded-full", color.preview)} />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="space-y-6">
                <h3 className="font-display text-base text-foreground">Data controls</h3>

                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-[14px] text-foreground">Delete all chats</p>
                    <p className="text-[12px] text-muted-foreground">
                      Permanently remove all chat history from this browser
                    </p>
                  </div>
                  <button
                    onClick={handleClearAllChats}
                    className="text-[13px] px-4 py-1.5 rounded-lg bg-secondary text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                  >
                    Delete all
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border/30">
                  <div>
                    <p className="text-[14px] text-foreground">Export chats</p>
                    <p className="text-[12px] text-muted-foreground">
                      Download all chat data as JSON
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const data = localStorage.getItem("pulse-chat-sessions") || "[]";
                      const blob = new Blob([data], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "pulse-chats.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-[13px] px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
