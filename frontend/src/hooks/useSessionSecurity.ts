import { useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useSessionSecurity = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const terminateAllSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.sessionSecurity.terminateAllSessions();
      
      if (result.success) {
        await supabase.auth.signOut();
        
        toast.success({
          title: "All Sessions Terminated",
          description: "You have been logged out from all devices.",
        });
        

        navigate("/auth");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { 
    terminateAllSessions, 
    loading, 
    error,
    clearError: () => setError(null)
  };
};
