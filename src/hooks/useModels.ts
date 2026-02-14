import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/api";

export interface Model {
  id: string;
  name: string;
}

const MODELS_URL = apiUrl("/v1/models");

// Fallback models if API is unreachable (CORS / IP whitelist)
const FALLBACK_MODELS: Model[] = [
  { id: "google/gemma-3-27b", name: "google/gemma-3-27b" },
  { id: "qwen/qwen3-vl-30b", name: "qwen/qwen3-vl-30b" },
  { id: "openai/gpt-oss-120b", name: "openai/gpt-oss-120b" },
];

export function useModels() {
  const [models, setModels] = useState<Model[]>(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>(FALLBACK_MODELS[0].id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(MODELS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        const list: Model[] = (data.data || data || []).map((m: any) => ({
          id: m.id || m.model || String(m),
          name: m.id || m.model || String(m),
        }));
        if (list.length > 0) {
          setModels(list);
          setSelectedModel(list[0].id);
        }
      })
      .catch(() => {
        // Keep fallback models — API may need IP whitelist or CORS headers
      })
      .finally(() => setLoading(false));
  }, []);

  return { models, selectedModel, setSelectedModel, loading };
}
