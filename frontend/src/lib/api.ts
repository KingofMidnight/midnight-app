import { supabase } from "@/integrations/supabase/client";
import type { StoryWithProfile, ChapterWithStory } from "@/types/domain";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface PendingResult {
  stories: StoryWithProfile[];
  chapters: ChapterWithStory[];
}

type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: string } & Record<string, unknown>;

interface TwoFactorSetup {
  secret: string;
  manualEntryKey: string;
  backupCodes: string[];
}

async function getJwt(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated.");
  return session.access_token;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function request<R extends ApiResponse = ApiResponse>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  { body, auth = true }: { body?: object; auth?: boolean } = {}
): Promise<R> {
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${await getJwt()}`;
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json().catch(() => null)) as R | null;
  if (!json) throw new Error(`Request failed (${res.status} ${res.statusText}).`);
  if (!json.success) throw new Error(json.error ?? "Request failed.");
  return json;
}

const apiGet = async <T>(path: string) => (await request<ApiResponse<T>>("GET", path)).data as T;
const apiPost = async <T = void>(path: string, body?: object) =>
  (await request<ApiResponse<T>>("POST", path, { body })).data as T;
const apiPatch = async <T = void>(path: string, body?: object) =>
  (await request<ApiResponse<T>>("PATCH", path, { body })).data as T;
const apiDelete = async (path: string) => {
  await request("DELETE", path);
};

async function downloadFile(path: string, filename: string, fallbackError: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${await getJwt()}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(json.error ?? fallbackError);
  }
  downloadBlob(await res.blob(), filename);
}

const safeName = (s: string) => s.replace(/[^a-z0-9]/gi, "_").toLowerCase();

export const api = {
  export: {
    epub: (storyId: string, storyTitle: string) =>
      downloadFile(`/api/export/epub/${storyId}`, `${safeName(storyTitle)}.epub`, "EPUB generation failed."),

    pdf: (chapterId: string, chapterLabel: string) =>
      downloadFile(`/api/export/pdf/${chapterId}`, `${safeName(chapterLabel)}.pdf`, "PDF generation failed."),
  },

  admin: {
    getPending: () => apiGet<PendingResult>("/api/admin/pending"),

    reviewStory: async (storyId: string, status: "approved" | "rejected") => {
      await apiPatch(`/api/admin/stories/${storyId}/review`, { status });
    },

    reviewChapter: async (chapterId: string, status: "approved" | "rejected") => {
      await apiPatch(`/api/admin/chapters/${chapterId}/review`, { status });
    },

    reviewEpisode: async (episodeId: string, status: "approved" | "rejected") => {
      await apiPatch(`/api/admin/episodes/${episodeId}/review`, { status });
    },

    deleteComment: (commentId: string) => apiDelete(`/api/admin/comments/${commentId}`),

    resolveReport: async (
      reportId: string,
      status: "resolved" | "dismissed" | "reviewing",
      admin_notes?: string
    ) => {
      await apiPatch(`/api/admin/reports/${reportId}/resolve`, { status, admin_notes });
    },

    banUser: async (userId: string, reason: string, notes?: string, expires_at?: string) => {
      await apiPost(`/api/admin/users/${userId}/ban`, { reason, notes, expires_at });
    },

    unbanUser: async (userId: string) => {
      await apiPatch(`/api/admin/users/${userId}/unban`);
    },

    deleteUser: (userId: string) => apiDelete(`/api/admin/users/${userId}`),
  },

  reviews: {
    markHelpful: (reviewId: string) => apiPost(`/api/reviews/${reviewId}/helpful`),
  },

  creator: {
    become: () => apiPost("/api/auth/creator", {}),
    leave: () => apiDelete("/api/auth/creator"),
  },

  twoFactor: {
    setup: () => apiPost<TwoFactorSetup & { otpauthUrl: string }>("/api/auth/2fa/setup"),

    verifySetup: (token: string) => apiPost<{ valid: boolean }>("/api/auth/2fa/verify-setup", { token }),

    enable: (token: string) => apiPost<{ enabled: boolean }>("/api/auth/2fa/enable", { token }),

    verify: (token: string) => apiPost<{ verified: boolean }>("/api/auth/2fa/verify", { token }),

    useBackupCode: (code: string) => apiPost<{ remainingCodes: number }>("/api/auth/2fa/backup-code", { code }),

    disable: (proof: { token: string } | { code: string }) =>
      apiPost<{ enabled: boolean }>("/api/auth/2fa/disable", proof),
  },

  sessions: {
    create: () => apiPost<{ sessionId: string }>("/api/auth/session/create"),

    validate: (sessionId: string) => apiPost<{ valid: boolean }>("/api/auth/session/validate", { sessionId }),

    terminate: (sessionId: string) => apiPost<{ terminated: string }>("/api/auth/session/terminate", { sessionId }),
  },

  async health(): Promise<boolean> {
    try {
      await request("GET", "/api/health", { auth: false });
      return true;
    } catch {
      return false;
    }
  },

  sessionSecurity: {
    terminateAllSessions: () =>
      request<ApiResponse<{ message: string }>>("POST", "/api/session-security/session/terminate-all"),
  },

  views: {
    async record(storyId: string): Promise<number> {
      const json = await request<ApiResponse<{ view_count: number }>>("POST", `/api/views/stories/${storyId}`, {
        auth: false,
      });
      return json.data?.view_count ?? 0;
    },
  },
};
