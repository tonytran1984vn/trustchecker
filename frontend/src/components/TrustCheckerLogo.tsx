"use client";

interface TrustCheckerLogoProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export default function TrustCheckerLogo({ size = 40, className = "", strokeWidth = 3.5 }: TrustCheckerLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 
        This matches the reference screenshot: 
        A cyan outlined shield with a cyan checkmark inside.
      */}
      
      {/* Outer Shield Outline */}
      <path
        d="M24 4L7 11V23C7 33.1 14.2 42.4 24 45.4C33.8 42.4 41 33.1 41 23V11L24 4Z"
        stroke="#00E5FF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Checkmark */}
      <path
        d="M16 25L21.5 30.5L32 18.5"
        stroke="#00E5FF"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
