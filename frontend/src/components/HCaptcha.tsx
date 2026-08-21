import { useRef } from "react";
import HCaptchaComponent from "@hcaptcha/react-hcaptcha";

interface HCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark";
}

export const HCaptcha = ({ onVerify, onError, theme = "light" }: HCaptchaProps) => {
  const captchaRef = useRef<HCaptchaComponent>(null);
  const sitekey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;

  if (!sitekey) {
    console.error("hCaptcha site key not configured");
    return <div>hCaptcha is not configured</div>;
  }

  return (
    <HCaptchaComponent
      ref={captchaRef}
      sitekey={sitekey}
      theme={theme}
      onVerify={(token) => onVerify(token)}
      onError={onError}
    />
  );
};
