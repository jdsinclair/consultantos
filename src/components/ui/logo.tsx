import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "default" | "lg" | "xl";
  variant?: "full" | "mark" | "wordmark";
  showText?: boolean;
}

const sizeClasses = {
  sm: {
    container: "h-7 w-7",
    text: "text-base",
    svg: 28,
  },
  default: {
    container: "h-9 w-9",
    text: "text-lg",
    svg: 36,
  },
  lg: {
    container: "h-11 w-11",
    text: "text-xl",
    svg: 44,
  },
  xl: {
    container: "h-14 w-14",
    text: "text-2xl",
    svg: 56,
  },
};

/**
 * ConsultantOS Logo
 *
 * A professional geometric logo combining "C" and "O" letterforms
 * representing ConsultantOS. The design uses overlapping circles
 * to create a modern, systematic mark that conveys precision and insight.
 */
export function Logo({
  className,
  size = "default",
  variant = "full",
  showText = true,
}: LogoProps) {
  const sizeConfig = sizeClasses[size];

  const LogoMark = () => (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg bg-primary",
        sizeConfig.container
      )}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[60%] w-[60%]"
      >
        {/* C shape - outer arc */}
        <path
          d="M28 8C23.5 5 18 5 13.5 8C9 11 6 16.5 6 22C6 27.5 9 33 13.5 36"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        {/* O shape - complete circle */}
        <circle
          cx="26"
          cy="22"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-primary-foreground"
        />
        {/* Accent dot - representing the "spark" of insight */}
        <circle
          cx="26"
          cy="22"
          r="3"
          fill="currentColor"
          className="text-accent"
        />
      </svg>
    </div>
  );

  if (variant === "mark") {
    return (
      <div className={cn("flex items-center", className)}>
        <LogoMark />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={cn("flex items-center", className)}>
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            sizeConfig.text
          )}
        >
          Consultant
          <span className="text-primary">OS</span>
        </span>
      </div>
    );
  }

  // Full logo (mark + wordmark)
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            sizeConfig.text
          )}
        >
          Consultant
          <span className="text-primary">OS</span>
        </span>
      )}
    </div>
  );
}

/**
 * Simple logo mark for favicons and small spaces
 */
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
    >
      {/* Background */}
      <rect width="40" height="40" rx="8" className="fill-primary" />
      {/* C shape */}
      <path
        d="M24 10C20.5 7.5 16 7.5 12.5 10C9 12.5 6.5 17 6.5 22C6.5 27 9 31.5 12.5 34"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* O shape */}
      <circle cx="24" cy="22" r="9" stroke="white" strokeWidth="3" />
      {/* Accent */}
      <circle cx="24" cy="22" r="2.5" className="fill-accent" />
    </svg>
  );
}

export default Logo;
