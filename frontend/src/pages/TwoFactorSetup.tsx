import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, AlertCircle } from "lucide-react";
import { use2FA } from "@/hooks/use2FA";
import { useAuth } from "@/hooks/useAuth";

export default function TwoFactorSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setup2FA, verify2FASetup, enable2FA, error, loading } = use2FA();

  const [step, setStep] = useState<"setup" | "verify" | "backup">("setup");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSetup = async () => {
    if (!user?.email) return;

    const setup = await setup2FA();
    if (setup) {
      setSecret(setup.secret);
      setBackupCodes(setup.backupCodes);
      setStep("verify");
    }
  };

  const handleVerify = async () => {
    if (!token || !secret) return;

    const valid = await verify2FASetup(token);
    if (valid) {
      setStep("backup");
    }
  };

  const handleEnable = async () => {
    const success = await enable2FA(token);
    if (success) {
      setSaved(true);
      setTimeout(() => navigate("/settings"), 2000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <h1 className="text-3xl font-bold">Set Up 2FA</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 flex gap-3">
          <AlertCircle className="text-red-600" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {step === "setup" && (
        <div className="space-y-4">
          <p className="text-gray-700">
            Enable Two-Factor Authentication using Google Authenticator, Microsoft Authenticator, or similar apps.
          </p>
          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? "Setting up..." : "Start Setup"}
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <div className="bg-gray-100 p-6 rounded text-center">
            <p className="text-sm text-gray-600 mb-2">Scan this code with your authenticator app:</p>
            <div className="bg-white p-4 rounded inline-block mb-4">
              {/* QR Code placeholder - in production, generate actual QR code */}
              <p className="text-xs text-gray-500">Secret: {secret}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Or enter manually:</label>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono break-all">
              {secret}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(secret)}
              className="mt-2"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Secret
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Enter 6-digit code from app:</label>
            <Input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl font-mono"
            />
          </div>

          <Button onClick={handleVerify} disabled={loading || token.length !== 6} className="w-full">
            Verify Code
          </Button>
        </div>
      )}

      {step === "backup" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-4">
            <p className="text-sm font-medium text-amber-900 mb-2">Save backup codes</p>
            <p className="text-sm text-amber-800">
              Store these codes in a safe place. Use them to access your account if you lose access to your authenticator app.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded space-y-2">
            {backupCodes.map((code, idx) => (
              <code key={idx} className="block font-mono text-sm">
                {code}
              </code>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => {
              const text = backupCodes.join("\n");
              const blob = new Blob([text], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "2fa-backup-codes.txt";
              a.click();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Codes
          </Button>

          <Button
            onClick={handleEnable}
            disabled={loading || saved}
            className="w-full"
          >
            {saved ? "✓ 2FA Enabled!" : "Enable 2FA"}
          </Button>
        </div>
      )}
    </div>
  );
}
