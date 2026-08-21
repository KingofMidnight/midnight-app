import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import authLogo from "@/assets/logo.png";
import { siteContent } from "@/lib/content";
import { HCaptcha } from "@/components/HCaptcha";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const t = siteContent.auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        title: "Verification required",
        description: "Please complete the captcha verification.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUp(email, password, username);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> {t.backToHome}
          </Link>
          <img src={authLogo} alt={siteContent.logoAlt} className="h-16 w-16 mx-auto" />
          <p className="text-muted-foreground">
            {mode === "signin" ? t.signInPrompt : t.signUpPrompt}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 bg-card border-border"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-card border-border"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 bg-card border-border"
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-center">
            <HCaptcha
              onVerify={setCaptchaToken}
              onError={() => setCaptchaToken("")}
              theme="dark"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? siteContent.loading : mode === "signin" ? t.signIn : t.signUp}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? t.noAccount : t.hasAccount}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "signin" ? t.signUp : t.signIn}
          </button>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {t.joinCreator}{" "}
          <Link to="/auth/creator" className="text-primary hover:underline font-medium">
            {t.joinCreatorLink}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Auth;

