import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowLeft, Pen } from "lucide-react";
import { siteContent } from "@/lib/content";
import { HCaptcha } from "@/components/HCaptcha";

const AuthCreator = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const t = siteContent.authCreator;
  const a = siteContent.auth;

  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      toast({ title: "Verification required", description: "Please complete the captcha verification.", variant: "destructive" });
      return;
    }
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username, display_name: displayName || username },
          captchaToken,
        },
      });

      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
        resetCaptcha();
        setLoading(false);
        return;
      }

      if (!data.session) {
        toast({ title: a.checkEmail, description: `${a.checkEmailDesc} Then sign in here to activate your creator account.` });
        resetCaptcha();
        setMode("signin");
        setLoading(false);
        return;
      }

      try {
        await api.creator.become();
      } catch (err) {
        toast({ title: "Could not activate creator account", description: (err as Error).message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (bio && data.user) {
        await supabase.from("profiles").update({ bio }).eq("id", data.user.id);
      }

      await refreshUser();
      navigate("/creator");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        resetCaptcha();
      } else {
        try {
          await api.creator.become();
          await refreshUser();
          navigate("/creator");
        } catch (err) {
          toast({ title: "Could not activate creator account", description: (err as Error).message, variant: "destructive" });
        }
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> {a.backToHome}
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Pen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gradient">{t.title}</h1>
          </div>
          <p className="text-muted-foreground">
            {mode === "signin" ? t.signInPrompt : t.signUpPrompt}
          </p>
          <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary underline">
            {t.regularAccount}
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
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
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.displayNamePlaceholder}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              <Textarea
                placeholder={t.bioPlaceholder}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="bg-card border-border"
                rows={3}
              />
            </>
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
            <HCaptcha onVerify={setCaptchaToken} onError={() => setCaptchaToken("")} resetKey={captchaReset} theme="dark" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? siteContent.loading : mode === "signin" ? a.signIn : t.createButton}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? a.noAccount : a.hasAccount}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "signin" ? a.signUp : a.signIn}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthCreator;

