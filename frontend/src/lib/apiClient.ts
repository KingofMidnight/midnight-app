export const api = {
  async post<T>(endpoint: string, data?: any): Promise<T> {
    const { data: session } = await import("@/integrations/supabase/client").then(
      (m) => m.supabase.auth.getSession()
    );

    const response = await fetch(`/api${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.session?.access_token && {
          Authorization: `Bearer ${session.session.access_token}`,
        }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async get<T>(endpoint: string): Promise<T> {
    const { data: session } = await import("@/integrations/supabase/client").then(
      (m) => m.supabase.auth.getSession()
    );

    const response = await fetch(`/api${endpoint}`, {
      method: "GET",
      headers: {
        ...(session?.session?.access_token && {
          Authorization: `Bearer ${session.session.access_token}`,
        }),
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const { data: session } = await import("@/integrations/supabase/client").then(
      (m) => m.supabase.auth.getSession()
    );

    const response = await fetch(`/api${endpoint}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(session?.session?.access_token && {
          Authorization: `Bearer ${session.session.access_token}`,
        }),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const { data: session } = await import("@/integrations/supabase/client").then(
      (m) => m.supabase.auth.getSession()
    );

    const response = await fetch(`/api${endpoint}`, {
      method: "DELETE",
      headers: {
        ...(session?.session?.access_token && {
          Authorization: `Bearer ${session.session.access_token}`,
        }),
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },
};
