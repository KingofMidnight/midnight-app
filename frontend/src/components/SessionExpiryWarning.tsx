import { AlertCircle } from "lucide-react";
import { useSessionExpiry } from "@/hooks/useSessionExpiry";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const SessionExpiryWarning = () => {
  const { showWarning, expiresIn, formatTimeRemaining } = useSessionExpiry();

  if (!showWarning || expiresIn === null) return null;

  const handleExtend = async () => {
    await supabase.auth.refreshSession();
  };

  return (
    <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg z-50">
      <div className="flex gap-3">
        <AlertCircle className="text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-red-900">Session expiring soon</p>
          <p className="text-sm text-red-700 mt-1">
            Your session will expire in {formatTimeRemaining(expiresIn)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExtend}
            className="mt-3"
          >
            Extend Session
          </Button>
        </div>
      </div>
    </div>
  );
};
