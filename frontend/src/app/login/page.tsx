"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import TrustCheckerLogo from "@/components/TrustCheckerLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetcher("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      
      // Phase 2A: Session Sync for Legacy Bridge
      // Write to localStorage so the legacy SPA picks it up immediately
      if (res.token) {
        localStorage.setItem("tc_token", res.token);
        document.cookie = `tc_token=${res.token}; path=/; max-age=86400; samesite=lax`;
      }
      if (res.refresh_token) localStorage.setItem("tc_refresh", res.refresh_token);
      if (res.user) {
        localStorage.setItem("tc_user", JSON.stringify(res.user));
        sessionStorage.setItem("tc_user", JSON.stringify(res.user));
      }

      console.log("[Next.js] Login successful. Redirecting appropriately...");
      if (res.user?.role === 'super_admin' || res.user?.user_type === 'platform') {
          router.push("/platform/platform/risk");
      } else {
          router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-slate-200 font-sans">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-slate-800 rounded-xl shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <TrustCheckerLogo size={44} />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
            TrustChecker
          </h1>
        </div>
        <p className="text-sm text-slate-400 mb-8">Secure Institutional Identity Access</p>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email / Enterprise ID</label>
            <input
              type="email"
              required
              className="w-full p-3 bg-gray-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
              placeholder="admin@institution.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Secure Password</label>
            <input
              type="password"
              required
              className="w-full p-3 bg-gray-950 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 flex justify-center items-center text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors ${isLoading ? 'cursor-not-allowed' : ''}`}
          >
            {isLoading ? "Authenticating..." : 'Sign In Security Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
