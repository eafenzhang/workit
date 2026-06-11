// ──────────────────────────────────────────────────────
// Unified API layer — AionCore backend
// All API calls go through Vite proxy (dev) or direct HTTP (Electron)
// ──────────────────────────────────────────────────────

import { aioncore } from './lib/aioncore';

// Drop-in replacement for fetch('/api/...') for existing pages
// Returns a Response-like object so existing .json() calls work
export async function apiFetch(url: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, opts);
  let data: any;
  try { data = await res.json(); }
  catch { data = await res.text(); }
  return { json: () => Promise.resolve(data), data };
}

/** API path constants */
export const API = {
  requirements: '/api/requirements',
  requirementsUploadImage: '/api/requirements/upload-image',
  requirementsAnalyze: (id: number) => `/api/requirements/${id}/analyze`,
  requirementsById: (id: number) => `/api/requirements/${id}`,
  documents: '/api/documents',
  documentsUpload: '/api/documents/upload',
  documentsById: (id: number) => `/api/documents/${id}`,
  documentsPreview: (id: number) => `/api/documents/${id}/preview`,
  documentsSummarize: (id: number) => `/api/documents/${id}/summarize`,
  models: '/api/models',
  modelsById: (id: number) => `/api/models/${id}`,
  storageStats: '/api/storage/stats',
  knowledgeCategories: '/api/knowledge_categories',
  mcp: '/api/mcp',
  mcpById: (id: number) => `/api/mcp/${id}`,
  mcpToken: (serverId: number) => `/api/mcp/${serverId}/token`,
  mcpServers: '/api/mcp_servers',
  skills: '/api/skills',
  skillsById: (id: string) => `/api/skills/${id}`,
  plugins: '/api/claude_code_plugins',
  pluginsById: (id: string) => `/api/claude_code_plugins/${id}`,
  cliTools: '/api/cli_tools',
  cliToolsById: (id: string) => `/api/cli_tools/${id}`,
  reqModules: '/api/requirement_modules',
  reqModulesById: (id: number) => `/api/requirement_modules/${id}`,
  insights: {
    kpis: '/api/insights/kpis',
    charts: '/api/insights/charts',
    aiInsights: '/api/insights/ai-insights',
    activities: '/api/insights/activities',
  },
} as const;
