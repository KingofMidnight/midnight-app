import { supabase } from "@/integrations/supabase/client";
import type { StoryWithProfile, ChapterWithStory } from "@/types/domain";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface PendingResult {
  stories: StoryWithProfile[];
  chapters: ChapterWithStory[];
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

async function apiPatch<T = void>(path: string, body?: object): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? "Request failed.");
  return json.data as T;
}

async function apiPost<T = void>(path: string, body: string): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? "Request failed.");
  return json.data as T;
}

async function apiDelete(path: string): Promise<void> {
  const jwt = await getJwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json() as { success: boolean; error?: string };
  if (!json.success) throw new Error(json.error ?? "Delete failed.");
}

async function apiGet<T>(path: string): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? "Request failed.");
  return json.data as T;
}

export const api = {
  export: {
    async epub(storyId: string, storyTitle: string): Promise<void> {
      const jwt = await getJwt();
      const res = await fetch(`${BASE_URL}/api/export/epub/${storyId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "EPUB generation failed.");
      }
      const blob = await res.blob();
      downloadBlob(blob, `${storyTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.epub`);
    },

    async pdf(chapterId: string, chapterLabel: string): Promise<void> {
      const jwt = await getJwt();
      const res = await fetch(`${BASE_URL}/api/export/pdf/${chapterId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "PDF generation failed.");
      }
      const blob = await res.blob();
      downloadBlob(blob, `${chapterLabel.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`);
    },
  },

  admin: {
    async getPending(): Promise<PendingResult> {
      return apiGet<PendingResult>("/api/admin/pending");
    },

    async reviewStory(storyId: string, status: "approved" | "rejected"): Promise<void> {
      await apiPatch("/api/admin/stories/" + storyId + "/review", { status });
    },

    async reviewChapter(chapterId: string, status: "approved" | "rejected"): Promise<void> {
      await apiPatch("/api/admin/chapters/" + chapterId + "/review", { status });
    },

    async reviewEpisode(episodeId: string, status: "approved" | "rejected"): Promise<void> {
      await apiPatch("/api/admin/episodes/" + episodeId + "/review", { status });
    },

    async deleteComment(commentId: string): Promise<void> {
      await apiDelete("/api/admin/comments/" + commentId);
    },

    async resolveReport(
      reportId: string,
      status: "resolved" | "dismissed" | "reviewing",
      admin_notes?: string
    ): Promise<void> {
      await apiPatch("/api/admin/reports/" + reportId + "/resolve", { status, admin_notes });
    },

    async banUser(userId: string, reason: string, notes?: string, expires_at?: string): Promise<void> {
      await apiPost<void>("/api/admin/users/" + userId + "/ban", JSON.stringify({ reason, notes, expires_at }));
    },

    async unbanUser(userId: string): Promise<void> {
      await apiPatch("/api/admin/users/" + userId + "/unban");
    },
  },

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      const json = await res.json() as { success: boolean };
      return json.success === true;
    } catch {
      return false;
    }
  },

  sessionSecurity: {
    async terminateAllSessions(): Promise<{ success: boolean; message: string }> {
      const jwt = await getJwt();
      const res = await fetch(`${BASE_URL}/api/session-security/terminate-all`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to terminate sessions");
      }
      
      return await res.json();
    },
  },

  views: {
    async record(storyId: string): Promise<number> {
      const res = await fetch(`${BASE_URL}/api/views/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId }),
      });
      const json = await res.json() as { success: boolean; data?: { count: number }; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to record view.");
      return json.data?.count ?? 0;
    },
  },
};
