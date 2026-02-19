import { useState, useEffect, useCallback } from "react";
import { apiUrl, apiFetch } from "@/lib/api";

export interface Model {
  id: string;
  name: string;
  vision?: boolean;
}

const MODELS_URL = apiUrl("/v1/models");
export const DEFAULT_MODEL_KEY = "pulse-default-model";
export const VISION_MODEL_KEY = "pulse-vision-model";

const FALLBACK_MODELS: Model[] = [
  { id: "google/gemma-3-27b", name: "Gemma 3 27B", vision: true },
  { id: "qwen/qwen3-vl-30b", name: "Qwen3 VL 30B", vision: true },
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", vision: false },
];

export function getDefaultModel(): string | null {
  return localStorage.getItem(DEFAULT_MODEL_KEY);
}

export function setDefaultModel(modelId: string): void {
  localStorage.setItem(DEFAULT_MODEL_KEY, modelId);
}

export function useModels(storageKey: string = DEFAULT_MODEL_KEY) {
  const [models, setModels] = useState<Model[]>(FALLBACK_MODELS);
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    return localStorage.getItem(storageKey) || FALLBACK_MODELS[0].id;
  });
  const [loading, setLoading] = useState(true);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
    localStorage.setItem(storageKey, modelId);
  }, [storageKey]);

  useEffect(() => {
    apiFetch(MODELS_URL)
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        const list: Model[] = (data.data || data || []).map((m: any) => ({
          id: m.id || m.model || String(m),
          name: m.displayName || m.name || m.id || m.model || String(m),
          vision: m.vision || false,
        }));
        if (list.length > 0) {
          setModels(list);
          const storedDefault = localStorage.getItem(storageKey);
          if (storedDefault && list.some(m => m.id === storedDefault)) {
            setSelectedModelState(storedDefault);
          } else {
            setSelectedModelState(list[0].id);
            localStorage.setItem(storageKey, list[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storageKey]);

  return { models, selectedModel, setSelectedModel, loading };
}
