import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserBlocking } from "@/hooks/useUserBlocking";

interface UserBlockButtonProps {
  userId: string;
  userName: string;
  onBlockChange?: (blocked: boolean) => void;
}

export const UserBlockButton = ({ userId, userName, onBlockChange }: UserBlockButtonProps) => {
  const { blockUser, unblockUser, blockedUsers, loading } = useUserBlocking();
  const [showDialog, setShowDialog] = useState(false);
  const isBlocked = blockedUsers.includes(userId);

  const handleBlock = async () => {
    const success = await blockUser(userId, "User blocked");
    if (success) {
      onBlockChange?.(true);
      setShowDialog(false);
    }
  };

  const handleUnblock = async () => {
    const success = await unblockUser(userId);
    if (success) {
      onBlockChange?.(false);
    }
  };

  if (isBlocked) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnblock}
        disabled={loading}
        className="text-gray-600 hover:text-green-600"
      >
        Unblock
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        disabled={loading}
        className="text-gray-600 hover:text-red-600"
      >
        Block
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogTitle>Block {userName}?</DialogTitle>
          <DialogDescription>
            Blocking this user will prevent their comments from appearing and they won't be able to message you.
            You can unblock them later.
          </DialogDescription>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBlock} className="bg-red-600 hover:bg-red-700" size="sm">
              Block User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
