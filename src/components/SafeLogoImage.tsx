import React, { useState, useEffect } from "react";
import { useTheme } from "../ThemeContext";
import commuariaLogo from "../assets/images/logo.png";
import logoMinimalista from "../assets/images/logo_minimalista.png";
import logoPreta from "../assets/images/logo_preta.png";
import { COMMUARIA_LOGO_B64, LOGO_MINIMALISTA_B64 } from "../assets/logoData";
import { LOGO_PRETA_B64 } from "../assets/logoPretaData";

interface SafeLogoImageProps {
  className?: string;
  alt?: string;
  isMinimal?: boolean;
  forceTheme?: "dark" | "light";
}

export const SafeLogoImage: React.FC<SafeLogoImageProps> = ({
  className = "w-48 h-auto mx-auto mb-16 relative z-20 drop-shadow-xl",
  alt = "Commuária Logo",
  isMinimal = false,
  forceTheme,
}) => {
  const { isDark } = useTheme();
  const effectiveIsDark = forceTheme ? forceTheme === "dark" : isDark;

  // On light backgrounds, use the black version of the logo
  const primarySrc = !effectiveIsDark
    ? logoPreta
    : isMinimal
    ? logoMinimalista
    : commuariaLogo;

  const fallbackB64 = !effectiveIsDark
    ? LOGO_PRETA_B64
    : isMinimal
    ? LOGO_MINIMALISTA_B64
    : COMMUARIA_LOGO_B64;

  const [currentSrc, setCurrentSrc] = useState(primarySrc);

  useEffect(() => {
    setCurrentSrc(primarySrc);
  }, [primarySrc]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackB64) {
          setCurrentSrc(fallbackB64);
        }
      }}
    />
  );
};
