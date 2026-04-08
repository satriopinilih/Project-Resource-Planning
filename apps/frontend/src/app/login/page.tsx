"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(userId, password);
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("auth_user", JSON.stringify({
        userId: result.userId,
        userName: result.userName,
        email: result.email,
        roles: result.roles
      }));
      if (result.roles.includes("GM")) {
        router.push("/dashboard/gm");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid User ID or Password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8eefb] to-[#f5f7ff] overflow-hidden p-6">
      {/* Subtle animated background blobs */}
      <div className="absolute w-[420px] h-[420px] rounded-full blur-[90px] opacity-35 pointer-events-none bg-[radial-gradient(circle,#6c9cff_0%,transparent_70%)] -top-20 -left-15 animate-blob-float" />
      <div className="absolute w-[350px] h-[350px] rounded-full blur-[90px] opacity-35 pointer-events-none bg-[radial-gradient(circle,#a78bfa_0%,transparent_70%)] -bottom-15 -right-10 animate-blob-float [animation-delay:-6s]" />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[420px] px-10 pt-11 pb-10 bg-white/88 backdrop-blur-[18px] rounded-3xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_12px_32px_-4px_rgba(59,95,180,0.1),0_0_0_1px_rgba(255,255,255,0.7)_inset] animate-card-enter">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 mb-5 bg-gradient-to-br from-[#3366ff] to-[#2952cc] rounded-2xl text-white shadow-[0_4px_12px_-2px_rgba(51,102,255,0.45),0_0_0_3px_rgba(51,102,255,0.08)]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-[1.65rem] font-bold text-[#1a1f36] mb-1 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-[0.95rem] font-normal text-[#5c7cba] mb-8">
          Resource Planning System
        </p>

        {/* Form */}
        <form className="flex flex-col gap-5 w-full" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="userId"
              className="text-sm font-semibold text-[#2d3748] pl-0.5"
            >
              User ID
            </label>
            <input
              id="userId"
              type="text"
              placeholder="HR123 or hr.manager@company.com"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full h-12 px-4 text-[0.95rem] text-[#1a1f36] bg-[#f7f9fc] border-[1.5px] border-[#e2e8f0] rounded-xl outline-none transition-all duration-200 placeholder:text-[#a0aec0] hover:border-[#c5d1e8] hover:bg-[#f0f4fb] focus:border-[#3366ff] focus:bg-white focus:shadow-[0_0_0_3px_rgba(51,102,255,0.1)]"
              required
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-[#2d3748] pl-0.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 text-[0.95rem] text-[#1a1f36] bg-[#f7f9fc] border-[1.5px] border-[#e2e8f0] rounded-xl outline-none transition-all duration-200 placeholder:text-[#a0aec0] hover:border-[#c5d1e8] hover:bg-[#f0f4fb] focus:border-[#3366ff] focus:bg-white focus:shadow-[0_0_0_3px_rgba(51,102,255,0.1)]"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            id="signInButton"
            type="submit"
            className="login-button relative flex items-center justify-center w-full h-[50px] mt-2 text-base font-semibold text-white bg-gradient-to-br from-[#3366ff] to-[#2952cc] border-none rounded-[14px] cursor-pointer tracking-wide shadow-[0_4px_14px_-3px_rgba(51,102,255,0.45),0_1px_3px_rgba(51,102,255,0.15)] transition-all duration-[180ms] ease-out overflow-hidden hover:enabled:-translate-y-px hover:enabled:shadow-[0_6px_20px_-3px_rgba(51,102,255,0.55),0_2px_6px_rgba(51,102,255,0.2)] hover:enabled:brightness-[1.06] active:enabled:translate-y-0 active:enabled:shadow-[0_2px_8px_-2px_rgba(51,102,255,0.4),0_1px_2px_rgba(51,102,255,0.12)] disabled:opacity-75 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="block w-[22px] h-[22px] border-[2.5px] border-white/35 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
