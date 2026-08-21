import { useEffect, useRef, useState } from "react";

interface GoogleAdProps {
  slot: string;
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const GoogleAd = ({ slot, format = "auto", className = "mb-4", style }: GoogleAdProps) => {
  const adRef = useRef<HTMLModElement>(null);
  const initialized = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!import.meta.env.VITE_ADSENSE_CLIENT || import.meta.env.VITE_ADSENSE_CLIENT.includes("XXXXXXXX")) {
      console.warn("⚠️ AdSense Client ID is missing or not configured properly.");
      setHasError(true);
      setIsLoading(false);
      return;
    }

    if (!slot) {
      console.warn("⚠️ AdSense Slot is empty or not configured.");
      setHasError(true);
      setIsLoading(false);
      return;
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    } catch (e) {
      console.error("❌ AdSense error:", e);
      setHasError(true);
      setIsLoading(false);
    }
  }, [slot]);

  if (isLoading) {
    const height = style?.height || (format === "vertical" ? "600px" : format === "horizontal" ? "90px" : "280px");
    return (
      <div className={className} style={style}>
        <div
          className="bg-gradient-to-r from-muted to-muted-foreground/20 animate-pulse rounded w-full"
          style={{ height, minHeight: height }}
        />
      </div>
    );
  }

  if (hasError) {
    const height = style?.height || (format === "vertical" ? "600px" : format === "horizontal" ? "90px" : "280px");
    return (
      <div className={className} style={style}>
        <div
          className="bg-muted border-2 border-dashed border-muted-foreground/30 rounded w-full flex items-center justify-center"
          style={{ height, minHeight: height }}
        />
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={{ display: "block", ...style }}
      data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAd;

