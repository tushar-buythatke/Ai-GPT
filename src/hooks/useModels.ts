import { useState, useCallback } from "react";

export interface Model {
  id: string;
  name: string;
  vision?: boolean;
}

export const DEFAULT_MODEL_KEY = "hatke-default-model";
export const VISION_MODEL_KEY = "hatke-vision-model";

const ALLOWED_MODELS: Model[] = [
  { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", vision: false },
  { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", vision: false },
  { id: "qwen/qwen3-vl-30b", name: "Qwen3 VL 30B", vision: true },
];

export function getDefaultModel(): string | null {
  return localStorage.getItem(DEFAULT_MODEL_KEY);
}

export function setDefaultModel(modelId: string): void {
  localStorage.setItem(DEFAULT_MODEL_KEY, modelId);
}

export function useModels(storageKey: string = DEFAULT_MODEL_KEY) {
  const [models] = useState<Model[]>(ALLOWED_MODELS);
  const [selectedModel, setSelectedModelState] = useState<string>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored && ALLOWED_MODELS.some(m => m.id === stored)) {
      return stored;
    }
    localStorage.setItem(storageKey, ALLOWED_MODELS[0].id);
    return ALLOWED_MODELS[0].id;
  });
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const setSelectedModel = useCallback((modelId: string) => {
    setSelectedModelState(modelId);
    localStorage.setItem(storageKey, modelId);
  }, [storageKey]);

  return { models, selectedModel, setSelectedModel, loading, error };
}
