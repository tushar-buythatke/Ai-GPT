import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp, ImagePlus, X, Square, Plus, Copy, Check, ChevronDown, PanelRightClose, PanelRightOpen,
  RefreshCw, Image as ImageIcon, AlertTriangle, Zap, Brain, Tag, ScanLine, BellRing, MessageSquareQuote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiUrl, apiFetch, API_BASE_URL } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface OcModel {
  id: string;
  name: string;
  image: boolean;
  variants: string[];
  context?: number;
}

interface Health {
  ok: boolean;
  version?: string;
  active?: number;
  queued?: number;
  error?: string | null;
  legacy?: boolean;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
  images?: string[];
  reasoning?: string;
  model?: string;
  seconds?: number;
  firstWord?: number;
  tps?: number;
  error?: boolean;
  pending?: boolean;
}

interface Settings {
  model: string;
  effort: "low" | "high";
  system: string;
  stream: boolean;
  panel: boolean;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DEFAULT_MODEL = "deepseek-v4.1-flash-free";
const PREFERRED = [DEFAULT_MODEL, "glm-5.3-flash-free", "mimo-v2.6-flash-free"];
const MAX_IMAGES = 4;
const SETTINGS_KEY = "hatke-opencode-settings";
const PUBLIC_BASE = API_BASE_URL.startsWith("http") ? API_BASE_URL.replace(/\/$/, "") : "https://ail.buyhatke.com";

const MODEL_NOTES: Record<string, string> = {
  "deepseek-v4.1-flash-free": "Default. Fastest, reads images.",
  "glm-5.3-flash-free": "Fallback. Reads images, can be slow.",
  "mimo-v2.6-flash-free": "Second fallback. Reads images.",
};

// Brand-ish colour per model family, used for the monogram badges.
const FAMILIES: { match: RegExp; mark: string; color: string }[] = [
  { match: /deepseek/, mark: "DS", color: "#4D6BFE" },
  { match: /glm/, mark: "GL", color: "#8B5CF6" },
  { match: /mimo/, mark: "Mi", color: "#FF6900" },
  { match: /nemotron/, mark: "Nv", color: "#76B900" },
  { match: /pickle/, mark: "BP", color: "#10B981" },
  { match: /muse/, mark: "Mu", color: "#EC4899" },
  { match: /longcat/, mark: "LC", color: "#06B6D4" },
  { match: /bunny/, mark: "SB", color: "#F43F5E" },
];
const familyOf = (id: string) => FAMILIES.find((f) => f.match.test(id)) || { mark: id.slice(0, 2).toUpperCase(), color: "#64748B" };

const STARTERS: { title: string; prompt: string; icon: React.ElementType; tint: string; needsImage?: boolean }[] = [
  { title: "Categorise a product", icon: Tag, tint: "#4D6BFE", prompt: "Which shopping category does this belong to? Reply with the category only.\n\nSamsung Galaxy M35 5G (Thunder Grey, 8GB RAM, 128GB Storage)" },
  { title: "Read a price from a screenshot", icon: ScanLine, tint: "#10B981", needsImage: true, prompt: "From this screenshot, extract the product name, the selling price and the MRP as JSON." },
  { title: "Write a deal alert", icon: BellRing, tint: "#F97316", prompt: "Write a one-line deal alert: boAt Airdopes 141 dropped from ₹1,499 to ₹899 on Flipkart." },
  { title: "Summarise reviews", icon: MessageSquareQuote, tint: "#8B5CF6", prompt: "Summarise these reviews in three bullet points:\n\n1. Battery lasts two days, great value.\n2. Camera is average in low light.\n3. Heats up while gaming but otherwise smooth." },
];

const loadSettings = (): Settings => {
  const base: Settings = { model: DEFAULT_MODEL, effort: "low", system: "", stream: true, panel: true };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return base;
  }
};

const titleCase = (id: string) => id.replace(/-free$/i, "").split("-").map((w) => (/^v?\d/.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
const cleanName = (name: string, id: string) => (name && name !== id ? name.replace(/\s+free$/i, "") : titleCase(id));
const formatContext = (n?: number) => (n ? (n >= 1_000_000 ? `${Math.round(n / 1_000_000)}M` : `${Math.round(n / 1000)}k`) : null);

/* ─── Request building ───────────────────────────────────────────────────── */

const buildMessages = (turns: Turn[], system: string) => {
  const msgs: Record<string, unknown>[] = [];
  if (system.trim()) msgs.push({ role: "system", content: system.trim() });
  for (const t of turns) {
    if (t.error || t.pending) continue;
    if (t.role === "user" && t.images?.length) {
      msgs.push({ role: "user", content: [{ type: "text", text: t.text }, ...t.images.map((url) => ({ type: "image_url", image_url: { url } }))] });
    } else {
      msgs.push({ role: t.role, content: t.text });
    }
  }
  return msgs;
};

const snippets = (s: Settings, prompt: string) => {
  const messages: Record<string, unknown>[] = [];
  if (s.system.trim()) messages.push({ role: "system", content: s.system.trim() });
  messages.push({ role: "user", content: prompt || "Hello" });
  const body = { model: s.model, reasoning_effort: s.effort, messages };
  const json = JSON.stringify(body, null, 2);
  const url = `${PUBLIC_BASE}/v1/opencode/chat/completions`;
  return {
    cURL: `curl ${url} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`,
    JavaScript: `const res = await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(${json.replace(/\n/g, "\n  ")}),\n});\nconst data = await res.json();\nconsole.log(data.choices[0].message.content);`,
    Python: `import requests\n\nres = requests.post(\n    "${url}",\n    json=${json.replace(/\n/g, "\n    ").replace(/true/g, "True").replace(/false/g, "False")},\n)\nprint(res.json()["choices"][0]["message"]["content"])`,
  };
};

// Tailwind typography is not enabled in this app, so markdown gets scoped styles.
const MARKDOWN = cn(
  "text-[15px] leading-[1.7] text-foreground break-words",
  "[&_p]:my-2 first:[&_p]:mt-0 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_li]:pl-1 marker:[&_li]:text-muted-foreground",
  "[&_h1]:text-[19px] [&_h2]:text-[17px] [&_h3]:text-[15px] [&_h1,&_h2,&_h3]:font-semibold [&_h1,&_h2,&_h3]:mt-4 [&_h1,&_h2,&_h3]:mb-2",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_:not(pre)>code]:bg-secondary [&_:not(pre)>code]:rounded [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[13px] [&_:not(pre)>code]:font-mono",
  "[&_pre]:bg-zinc-900 [&_pre]:text-zinc-200 [&_pre]:rounded-lg [&_pre]:p-3.5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:text-[13px] [&_pre]:font-mono",
  "[&_table]:my-3 [&_table]:w-full [&_table]:text-[14px] [&_table]:border-collapse [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground",
  "[&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_td]:border-b [&_td]:border-border/50 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top",
  "[&_hr]:my-4 [&_hr]:border-border",
);

/* ─── Small pieces ───────────────────────────────────────────────────────── */

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, copy };
};

const Monogram = ({ id, size = 24 }: { id: string; size?: number }) => {
  const f = familyOf(id);
  return (
    <span
      className="inline-flex items-center justify-center rounded-md font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(140deg, ${f.color}, ${f.color}bb)` }}
      aria-hidden
    >
      {f.mark}
    </span>
  );
};

const StatusPill = ({ health }: { health: Health | null }) => {
  const state = health === null ? "checking" : health.ok ? "online" : "offline";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border px-2.5 h-8 text-[12px] text-muted-foreground" title={health?.version ? `opencode ${health.version}` : undefined}>
      <span className="relative flex h-2 w-2">
        {state === "online" && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping motion-reduce:hidden" />}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", state === "online" ? "bg-emerald-500" : state === "offline" ? "bg-destructive" : "bg-muted-foreground/40")} />
      </span>
      {state === "online" ? (health?.queued ? `${health.queued} waiting` : "Online") : state === "offline" ? "Offline" : "Checking"}
    </span>
  );
};

// Recent reply times; the signature of this page is speed, so we show it.
const Sparkline = ({ times }: { times: number[] }) => {
  if (times.length < 2) return null;
  const max = Math.max(...times, 1);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return (
    <span className="hidden md:inline-flex items-center gap-2 h-8 px-2.5 rounded-full border border-border text-[12px] text-muted-foreground" title="Recent reply times">
      <span className="flex items-end gap-[2px] h-4">
        {times.map((t, i) => (
          <span key={i} className="w-[3px] rounded-sm bg-primary/70" style={{ height: `${Math.max(15, (t / max) * 100)}%` }} />
        ))}
      </span>
      avg {avg.toFixed(1)} s
    </span>
  );
};

const TimingBar = ({ turn }: { turn: Turn }) => {
  if (turn.seconds === undefined) return null;
  const total = Math.max(turn.seconds, 0.01);
  const wait = Math.min(turn.firstWord ?? total, total);
  const waitPct = (wait / total) * 100;
  return (
    <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
      <div className="relative h-1 w-24 sm:w-32 rounded-full bg-secondary overflow-hidden" aria-hidden>
        <div className="absolute inset-y-0 left-0 bg-muted-foreground/40" style={{ width: `${waitPct}%` }} />
        <div className="absolute inset-y-0 bg-primary" style={{ left: `${waitPct}%`, right: 0 }} />
      </div>
      <span>
        {turn.firstWord !== undefined && <>first word {turn.firstWord.toFixed(1)} s, </>}
        total {total.toFixed(1)} s{turn.tps ? `, ${Math.round(turn.tps)} tokens/s` : ""}
      </span>
    </div>
  );
};

const AssistantTurn = ({ turn, modelName, onRetry }: { turn: Turn; modelName: string; onRetry?: () => void }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const { copied, copy } = useCopy();

  if (turn.error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
        <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] text-foreground">The request failed.</p>
          <p className="text-[13px] text-muted-foreground mt-0.5 break-words">{turn.text}</p>
        </div>
        {onRetry && (
          <button onClick={onRetry} className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border text-[12px] text-foreground hover:bg-secondary">
            <RefreshCw size={12} /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group flex gap-3">
      <div className="pt-0.5"><Monogram id={turn.model || DEFAULT_MODEL} size={26} /></div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-foreground font-medium">{modelName}</span>
          {turn.reasoning && (
            <button onClick={() => setShowReasoning((v) => !v)} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
              <Brain size={12} /> {turn.pending && !turn.text ? "Reasoning…" : "Reasoning"}
              <ChevronDown size={12} className={cn("transition-transform", showReasoning && "rotate-180")} />
            </button>
          )}
          {!turn.pending && (
            <button
              onClick={() => copy(turn.text)}
              className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground transition-opacity"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {showReasoning && turn.reasoning && (
          <div className="border-l-2 border-border pl-3 text-[13px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{turn.reasoning}</div>
        )}

        {turn.text ? (
          <div className={MARKDOWN}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
            {turn.pending && <span className="inline-block w-2 h-4 align-text-bottom bg-primary/70 animate-pulse motion-reduce:animate-none" />}
          </div>
        ) : turn.pending ? (
          <div className="flex items-center gap-1.5 h-6" aria-label="Waiting for the model">
            {[0, 150, 300].map((d) => (
              <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        ) : null}

        {!turn.pending && <TimingBar turn={turn} />}
      </div>
    </div>
  );
};

/* ─── Model picker (composer) ────────────────────────────────────────────── */

const ModelPicker = ({ models, value, onChange }: { models: OcModel[]; value: string; onChange: (id: string) => void }) => {
  const [open, setOpen] = useState(false);
  const current = models.find((m) => m.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="h-8 pl-1.5 pr-2 rounded-lg text-[13px] text-foreground hover:bg-secondary inline-flex items-center gap-2 max-w-[220px]">
          <Monogram id={value} size={20} />
          <span className="truncate">{current ? cleanName(current.name, current.id) : titleCase(value)}</span>
          <ChevronDown size={13} className="text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-1.5 max-h-[60vh] overflow-y-auto">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => { onChange(m.id); setOpen(false); }}
            className={cn("w-full flex items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-secondary", m.id === value && "bg-secondary")}
          >
            <Monogram id={m.id} size={22} />
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] text-foreground truncate">{cleanName(m.name, m.id)}</span>
              {MODEL_NOTES[m.id] && <span className="block text-[11.5px] text-muted-foreground truncate">{MODEL_NOTES[m.id]}</span>}
            </span>
            {m.image && <ImageIcon size={12} className="text-muted-foreground shrink-0" aria-label="Reads images" />}
            {m.id === value && <Check size={13} className="text-primary shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

/* ─── Settings panel ─────────────────────────────────────────────────────── */

const SettingsPanel = ({ settings, set, models, health, draft, onClose }: {
  settings: Settings;
  set: (patch: Partial<Settings>) => void;
  models: OcModel[];
  health: Health | null;
  draft: string;
  onClose: () => void;
}) => {
  const [tab, setTab] = useState<"cURL" | "JavaScript" | "Python">("cURL");
  const { copied, copy } = useCopy();
  const code = snippets(settings, draft)[tab];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 h-14 border-b border-border/60 shrink-0">
        <h2 className="text-[14px] font-medium text-foreground">Settings</h2>
        <button onClick={onClose} aria-label="Close settings" title="Close settings"
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
        <section className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-foreground">Model</h3>
          <div className="space-y-1" role="radiogroup" aria-label="Model">
            {models.map((m) => {
              const active = m.id === settings.model;
              return (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ model: m.id })}
                  className={cn(
                    "w-full text-left rounded-lg px-2.5 py-2 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary/50 bg-primary/[0.06]" : "border-transparent hover:bg-secondary/60"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Monogram id={m.id} size={22} />
                    <span className="text-[13px] text-foreground truncate flex-1">{cleanName(m.name, m.id)}</span>
                    {m.image && <ImageIcon size={12} className="text-muted-foreground shrink-0" aria-label="Reads images" />}
                    {formatContext(m.context) && <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{formatContext(m.context)}</span>}
                  </div>
                  {MODEL_NOTES[m.id] && <p className="text-[12px] text-muted-foreground mt-1 pl-[32px]">{MODEL_NOTES[m.id]}</p>}
                </button>
              );
            })}
            {!models.length && <p className="text-[12px] text-muted-foreground">No models loaded yet.</p>}
          </div>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[13px] font-medium text-foreground">Speed</h3>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-1">
            {([{ id: "low", label: "Fast", icon: Zap }, { id: "high", label: "Thorough", icon: Brain }] as const).map((o) => (
              <button
                key={o.id}
                onClick={() => set({ effort: o.id })}
                className={cn("h-8 rounded-md text-[12px] inline-flex items-center justify-center gap-1.5 transition-colors",
                  settings.effort === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <o.icon size={12} /> {o.label}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            {settings.effort === "low" ? "Answers in a few seconds. Good for classification and extraction." : "The model reasons before answering. Better for tricky questions, slower."}
          </p>
        </section>

        <section className="space-y-2.5">
          <label htmlFor="oc-system" className="text-[13px] font-medium text-foreground block">Instructions</label>
          <textarea
            id="oc-system"
            value={settings.system}
            onChange={(e) => set({ system: e.target.value })}
            rows={4}
            placeholder="Optional. For example: Reply in JSON only."
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </section>

        <section className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium text-foreground">Stream the reply</p>
            <p className="text-[12px] text-muted-foreground">Show words as they arrive.</p>
          </div>
          <Switch checked={settings.stream} onCheckedChange={(v) => set({ stream: v })} aria-label="Stream the reply" />
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-foreground">Use it from code</h3>
            <button onClick={() => copy(code)} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="rounded-lg overflow-hidden border border-white/[0.06]">
            <div className="flex bg-zinc-800">
              {(["cURL", "JavaScript", "Python"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn("px-3 h-8 text-[12px] transition-colors", tab === t ? "text-zinc-100 bg-zinc-900" : "text-zinc-400 hover:text-zinc-200")}>
                  {t}
                </button>
              ))}
            </div>
            <pre className="bg-zinc-900 text-zinc-200 font-mono text-[11.5px] leading-relaxed p-3 overflow-x-auto max-h-64 whitespace-pre">{code}</pre>
          </div>
          <p className="text-[12px] text-muted-foreground">No API key needed. Images go in as <code className="text-[11.5px]">image_url</code> parts, the same as OpenAI.</p>
        </section>

        <section className="text-[12px] text-muted-foreground space-y-1 pb-2">
          <p>Status: {health === null ? "checking" : health.ok ? "online" : "offline"}{health?.version ? `, opencode ${health.version}` : ""}</p>
          {health?.ok && <p>{health.active || 0} running, {health.queued || 0} waiting</p>}
        </section>
      </div>
    </div>
  );
};

/* ─── Page ───────────────────────────────────────────────────────────────── */

const OpencodePlayground = () => {
  const [models, setModels] = useState<OcModel[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [times, setTimes] = useState<number[]>([]);
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  const [overlay, setOverlay] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const set = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const loadHealth = useCallback(() => {
    apiFetch(apiUrl("/v1/opencode/health"))
      .then((r) => r.json())
      .then((d) => setHealth({ ok: Boolean(d.ok), version: d.version || d.opencode?.version, active: d.active, queued: d.queued, error: d.error, legacy: Boolean(d.transport) }))
      .catch((e) => setHealth({ ok: false, error: e.message }));
  }, []);

  useEffect(() => {
    apiFetch(apiUrl("/v1/opencode/models"))
      .then((r) => r.json())
      .then((d) => {
        const list: OcModel[] = (d.data || []).map((m: { id: string; opencode?: Record<string, unknown> }) => {
          const o = (m.opencode || {}) as { name?: string; image?: boolean; input?: string[]; variants?: string[]; context?: number };
          return { id: m.id, name: o.name || m.id, image: o.image ?? Boolean(o.input?.includes("image")), variants: o.variants || [], context: o.context };
        });
        list.sort((a, b) => {
          const ia = PREFERRED.indexOf(a.id), ib = PREFERRED.indexOf(b.id);
          return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.id.localeCompare(b.id);
        });
        setModels(list);
      })
      .catch(() => setModels([]));
    loadHealth();
    const t = setInterval(loadHealth, 15000);
    return () => clearInterval(t);
  }, [loadHealth]);

  // Keep the selection valid when the server's list changes.
  useEffect(() => {
    if (models.length && !models.some((m) => m.id === settings.model)) {
      set({ model: (models.find((m) => m.id === DEFAULT_MODEL) || models[0]).id });
    }
  }, [models, settings.model, set]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [prompt]);

  const nameOf = useCallback((id: string) => {
    const m = models.find((x) => x.id === id);
    return m ? cleanName(m.name, m.id) : titleCase(id);
  }, [models]);

  const current = models.find((m) => m.id === settings.model);
  const imagesBlocked = images.length > 0 && current && !current.image;
  const panelVisible = wide ? settings.panel : overlay;
  const togglePanel = () => (wide ? set({ panel: !settings.panel }) : setOverlay((v) => !v));

  const addFiles = (files: FileList | File[]) => {
    Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, e.target?.result as string]));
      reader.readAsDataURL(file);
    });
  };

  const run = async (history: Turn[]) => {
    setTurns([...history, { role: "assistant", text: "", pending: true, model: settings.model }]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const started = performance.now();
    let firstToken = 0;
    let text = "";
    let reasoning = "";
    let model = settings.model;
    let tokens = 0;

    const patch = (p: Partial<Turn>) => setTurns((prev) => [...prev.slice(0, -1), { ...prev[prev.length - 1], ...p }]);

    try {
      const res = await apiFetch(apiUrl("/v1/opencode/chat/completions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: settings.model, reasoning_effort: settings.effort, stream: settings.stream, messages: buildMessages(history, settings.system) }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        if (res.status === 403 && !err?.error?.message) throw new Error("Your IP address is not on the bridge's allow-list. Ask an admin to add it.");
        throw new Error(err?.error?.message || (typeof err?.error === "string" ? err.error : null) || `The bridge answered HTTP ${res.status}.`);
      }

      if (!settings.stream) {
        const data = await res.json();
        const msg = data.choices?.[0]?.message || {};
        text = msg.content || "";
        reasoning = msg.reasoning_content || "";
        model = data.model || model;
        tokens = data.usage?.completion_tokens || 0;
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            const evt = JSON.parse(payload);
            if (evt.error) throw new Error(evt.error.message);
            if (evt.model) model = evt.model;
            if (evt.usage) tokens = evt.usage.completion_tokens || 0;
            const delta = evt.choices?.[0]?.delta || {};
            if (delta.reasoning_content) {
              reasoning += delta.reasoning_content;
              patch({ reasoning, model });
            }
            if (delta.content) {
              if (!firstToken) firstToken = performance.now();
              text += delta.content;
              patch({ text, model });
            }
          }
        }
      }

      const end = performance.now();
      const seconds = (end - started) / 1000;
      const genSecs = firstToken ? (end - firstToken) / 1000 : 0;
      patch({
        text: text || "The model returned an empty reply.",
        reasoning: reasoning || undefined,
        model,
        seconds,
        firstWord: firstToken ? (firstToken - started) / 1000 : undefined,
        tps: tokens && genSecs > 0.3 ? tokens / genSecs : undefined,
        pending: false,
      });
      setTimes((prev) => [...prev, seconds].slice(-14));
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      if (aborted) patch({ text: text || "Stopped.", pending: false, model, seconds: (performance.now() - started) / 1000 });
      else patch({ text: (e as Error).message, error: true, pending: false });
    } finally {
      setBusy(false);
      abortRef.current = null;
      loadHealth();
    }
  };

  const send = () => {
    const text = prompt.trim();
    if (!text || busy || imagesBlocked) return;
    const history = [...turns.filter((t) => !t.error), { role: "user" as const, text, images: images.length ? images : undefined }];
    setPrompt("");
    setImages([]);
    run(history);
  };

  const retry = () => {
    const history = turns.filter((t) => !t.error && !t.pending);
    if (history.length && history[history.length - 1].role === "user") run(history);
  };

  const reset = () => {
    abortRef.current?.abort();
    setTurns([]);
    setPrompt("");
    setImages([]);
    inputRef.current?.focus();
  };

  const starter = (s: (typeof STARTERS)[number]) => {
    setPrompt(s.prompt);
    if (s.needsImage) fileRef.current?.click();
    inputRef.current?.focus();
  };

  const bridgeHint = useMemo(() => {
    if (!health || health.ok) return null;
    if (health.legacy) return "This bridge still runs the old OpenCode integration, so free models are failing. Deploy the latest local-llm-bridge and restart it.";
    return health.error ? `The bridge reported: ${health.error}` : `Could not reach ${PUBLIC_BASE}/v1/opencode/health.`;
  }, [health]);

  const settingsPanel = (
    <SettingsPanel settings={settings} set={set} models={models} health={health} draft={prompt}
      onClose={() => (wide ? set({ panel: false }) : setOverlay(false))} />
  );

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="shrink-0 h-14 border-b border-border/60 px-4 sm:px-6 flex items-center gap-3">
          <h1 className="font-display text-[17px] text-foreground leading-tight">OpenCode</h1>
          <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-500 text-[11px] font-medium px-2 h-5">Free</span>
          <div className="ml-auto flex items-center gap-2">
            <Sparkline times={times} />
            <StatusPill health={health} />
            <button
              onClick={reset}
              disabled={!turns.length && !prompt}
              className="h-8 px-3 rounded-md border border-border text-[13px] text-foreground hover:bg-secondary disabled:opacity-40 inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> <span className="hidden sm:inline">New chat</span>
            </button>
            <button
              onClick={togglePanel}
              className={cn("h-8 w-8 rounded-md border border-border inline-flex items-center justify-center transition-colors",
                panelVisible ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary")}
              aria-label={panelVisible ? "Hide settings" : "Show settings"}
              title={panelVisible ? "Hide settings" : "Show settings"}
            >
              {panelVisible ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </header>

        {bridgeHint && (
          <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-4 sm:px-6 py-2.5 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-[13px] text-foreground flex-1">{bridgeHint}</p>
            <button onClick={loadHealth} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0">
              <RefreshCw size={12} /> Check again
            </button>
          </div>
        )}

        {/* Conversation */}
        <div
          className="flex-1 min-h-0 overflow-y-auto relative"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        >
          {dragging && (
            <div className="absolute inset-3 z-10 rounded-2xl border-2 border-dashed border-primary/60 bg-background/80 flex items-center justify-center pointer-events-none">
              <p className="text-[14px] text-foreground">Drop the image to attach it</p>
            </div>
          )}

          <div className="max-w-[740px] mx-auto px-4 sm:px-6 py-8">
            {!turns.length ? (
              <div className="pt-[6vh]">
                <div className="flex items-center gap-3">
                  <Monogram id={settings.model} size={40} />
                  <div>
                    <p className="text-[15px] text-foreground font-medium">{nameOf(settings.model)}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {[current?.image ? "Reads images" : "Text only", formatContext(current?.context) && `${formatContext(current?.context)} context`, "Free"].filter(Boolean).join(", ")}
                    </p>
                  </div>
                </div>
                <h2 className="mt-7 font-display text-[30px] sm:text-[38px] leading-[1.1] text-foreground tracking-tight max-w-[18ch]">
                  Answers in seconds, on free models.
                </h2>
                <p className="mt-3 text-[15px] text-muted-foreground max-w-[54ch] leading-relaxed">
                  Ask anything, or paste a screenshot of a product page. Switch models from the box below. No API key needed.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => starter(s)}
                      className="group text-left rounded-xl border border-border bg-card/40 px-4 py-3.5 hover:border-primary/40 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg inline-flex items-center justify-center shrink-0" style={{ background: `${s.tint}1f`, color: s.tint }}>
                          <s.icon size={14} />
                        </span>
                        <span className="text-[14px] text-foreground">{s.title}</span>
                        {s.needsImage && <ImageIcon size={12} className="text-muted-foreground ml-auto" aria-label="Needs an image" />}
                      </span>
                      <span className="block text-[12.5px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{s.prompt.split("\n")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {turns.map((t, i) =>
                  t.role === "user" ? (
                    <div key={i} className="flex flex-col items-end gap-2">
                      {t.images && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {t.images.map((src, j) => <img key={j} src={src} alt="" className="max-h-40 max-w-[260px] object-contain rounded-xl border border-border bg-card" />)}
                        </div>
                      )}
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5">
                        <p className="text-[15px] text-foreground whitespace-pre-wrap leading-relaxed">{t.text}</p>
                      </div>
                    </div>
                  ) : (
                    <AssistantTurn key={i} turn={t} modelName={nameOf(t.model || settings.model)} onRetry={i === turns.length - 1 ? retry : undefined} />
                  )
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2">
          <div className={cn(
            "max-w-[740px] mx-auto rounded-2xl border bg-card shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] transition-colors",
            imagesBlocked ? "border-destructive/50" : "border-border focus-within:border-primary/50"
          )}>
            {images.length > 0 && (
              <div className="px-3 pt-3 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative">
                    <img src={src} alt={`Attachment ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border border-border" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                      aria-label="Remove image"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imagesBlocked && current && (
              <p className="px-4 pt-2 text-[12px] text-destructive">{cleanName(current.name, current.id)} can't read images. Switch to DeepSeek V4.1 Flash, or remove the image.</p>
            )}
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onPaste={(e) => {
                const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                if (files.length) { e.preventDefault(); addFiles(files); }
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
              placeholder="Ask anything, or paste a screenshot"
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="Message"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <ModelPicker models={models} value={settings.model} onChange={(id) => set({ model: id })} />
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= MAX_IMAGES}
                className="h-8 px-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 inline-flex items-center gap-1.5"
                title="Add image"
              >
                <ImagePlus size={15} /> <span className="hidden sm:inline">Image</span>
              </button>
              <button
                onClick={() => set({ effort: settings.effort === "low" ? "high" : "low" })}
                className="h-8 px-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center gap-1.5"
                title={settings.effort === "low" ? "Fast: answers in a few seconds" : "Thorough: thinks first, slower"}
              >
                {settings.effort === "low" ? <Zap size={14} /> : <Brain size={14} />}
                <span className="hidden sm:inline">{settings.effort === "low" ? "Fast" : "Thorough"}</span>
              </button>
              <div className="ml-auto">
                {busy ? (
                  <button onClick={() => abortRef.current?.abort()} className="h-8 px-3 rounded-lg bg-secondary text-foreground text-[13px] inline-flex items-center gap-1.5" aria-label="Stop">
                    <Square size={11} className="fill-current" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={send}
                    disabled={!prompt.trim() || Boolean(imagesBlocked)}
                    className="h-8 w-8 rounded-lg bg-primary text-primary-foreground inline-flex items-center justify-center disabled:opacity-30 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Send"
                  >
                    <ArrowUp size={16} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {wide && settings.panel && (
        <aside className="w-[320px] shrink-0 border-l border-border/60 bg-sidebar">{settingsPanel}</aside>
      )}
      {!wide && overlay && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button className="absolute inset-0 bg-black/50" onClick={() => setOverlay(false)} aria-label="Close settings" />
          <div className="relative w-[min(340px,100vw)] h-full bg-background border-l border-border shadow-xl">{settingsPanel}</div>
        </div>
      )}
    </div>
  );
};

export default OpencodePlayground;
