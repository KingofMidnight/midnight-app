import { useEffect, useRef } from "react";

interface HCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark";
}

export const HCaptcha = ({ onVerify, onError, theme = "light" }: HCaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const sitekey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    if (!sitekey) {
      console.error("hCaptcha site key not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.hcaptcha) {
        window.hcaptcha.render(containerRef.current, {
          sitekey,
          theme,
          callback: (response: any) => onVerify(response.response),
          "error-callback": onError,
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [onVerify, onError, theme]);

  return <div ref={containerRef} />;
};

declare global {
  interface Window {
    hcaptcha?: {
      render: (element: HTMLElement | null, options: any) => void;
      reset: () => void;
      remove: () => void;
      execute: (options?: any) => void;
    };
  }
}
