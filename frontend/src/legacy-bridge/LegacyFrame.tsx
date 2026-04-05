"use client";

import { useEffect, useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function LegacyFrame({ path = "/legacy/index.html" }: { path?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const iframeSrc = `${basePath}${path}${path.includes('?') ? '&' : '?'}embed=true`;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-950">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          Loading Legacy Dashboard...
        </div>
      )}
      <iframe
        src={iframeSrc}
        className={`w-full h-full border-none transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="TrustChecker Legacy Application"
      />
    </div>
  );
}
