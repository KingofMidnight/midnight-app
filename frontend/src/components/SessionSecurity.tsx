import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield } from "lucide-react";
import { useSessionSecurity } from "@/hooks/useSessionSecurity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const SessionSecurity = () => {
  const { terminateAllSessions, loading, error, clearError } = useSessionSecurity();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTerminateSessions = async () => {
    await terminateAllSessions();
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">Session Security</h3>
      </div>
      
      {error && (
        <div className="text-red-500 text-sm p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            className="gap-2"
            disabled={loading}
          >
            <AlertTriangle className="h-4 w-4" />
            {loading ? "Terminating..." : "Terminate All Sessions"}
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Terminate All Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will immediately log you out from all devices and browsers where you're currently logged in. 
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleTerminateSessions}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Terminating..." : "Terminate All Sessions"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="text-sm text-muted-foreground space-y-2">
        <p>
          <strong>What this does:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-4">
          <li>Logs you out from all devices and browsers</li>
          <li>Invalidates all active session tokens</li>
          <li>Requires you to sign in again everywhere</li>
        </ul>
        <p className="pt-2">
          <strong>When to use:</strong> Use this if you suspect unauthorized access to your account or want to secure all your sessions at once.
        </p>
      </div>
    </div>
  );
};
