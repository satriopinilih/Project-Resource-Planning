"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ssoLogin } from "@/lib/api";
import { getDashboardPathByRoles } from "@/lib/auth";

function SsoHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticket = searchParams.get("ticket");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) {
      setError("No SSO ticket found. Redirecting to login...");
      const timer = setTimeout(() => {
        router.push("/login");
      }, 3000);
      return () => clearTimeout(timer);
    }

    let isMounted = true;

    async function performSso() {
      try {
        const result = await ssoLogin(ticket!);
        if (!isMounted) return;

        localStorage.setItem("auth_token", result.token);
        localStorage.setItem("auth_user", JSON.stringify({
          userId: result.userId,
          userName: result.userName,
          email: result.email,
          roles: result.roles,
          mustChangePassword: result.mustChangePassword
        }));

        if (result.mustChangePassword) {
          router.push("/settings?forcePasswordChange=1");
        } else {
          router.push(getDashboardPathByRoles(result.roles));
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Single Sign-On authentication failed.");
      }
    }

    performSso();

    return () => {
      isMounted = false;
    };
  }, [ticket, router]);

  return (
    <div className="relative z-10 flex flex-col items-center w-full max-w-[440px] px-10 pt-11 pb-10 bg-white/88 backdrop-blur-[18px] rounded-3xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_12px_32px_-4px_rgba(59,95,180,0.1),0_0_0_1px_rgba(255,255,255,0.7)_inset] text-center">
      {!error ? (
        <>
          {/* Pulsing loading glow */}
          <div className="relative flex items-center justify-center w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
            <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <svg
              className="absolute w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-[#1a1f36] mb-2 tracking-tight">
            Securing Connection
          </h1>
          <p className="text-sm text-[#5c7cba] leading-relaxed mb-4">
            Authenticating your session via Accelist Single Sign-On...
          </p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-2/3 rounded-full animate-pulse" />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center w-16 h-16 mb-6 bg-red-50 text-red-500 rounded-2xl border border-red-100">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-[#1a1f36] mb-3 tracking-tight">
            Authentication Error
          </h1>
          <p className="text-sm text-red-600 leading-relaxed mb-6 bg-red-50/50 border border-red-100/50 p-3 rounded-xl">
            {error}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="flex items-center justify-center w-full h-[46px] text-sm font-semibold text-white bg-gradient-to-br from-[#3366ff] to-[#2952cc] rounded-xl cursor-pointer hover:shadow-[0_4px_12px_-3px_rgba(51,102,255,0.4)] transition-all duration-200"
          >
            Return to Login
          </button>
        </>
      )}
    </div>
  );
}

export default function SsoPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f4ff] via-[#e8eefb] to-[#f5f7ff] overflow-hidden p-6">
      {/* Background decoration */}
      <div className="absolute w-[420px] h-[420px] rounded-full blur-[90px] opacity-35 pointer-events-none bg-[radial-gradient(circle,#6c9cff_0%,transparent_70%)] -top-20 -left-15" />
      <div className="absolute w-[350px] h-[350px] rounded-full blur-[90px] opacity-35 pointer-events-none bg-[radial-gradient(circle,#a78bfa_0%,transparent_70%)] -bottom-15 -right-10" />

      <Suspense fallback={
        <div className="relative z-10 flex flex-col items-center w-full max-w-[440px] px-10 pt-11 pb-10 bg-white/88 backdrop-blur-[18px] rounded-3xl shadow-md text-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin mb-6" />
          <h1 className="text-xl font-bold text-[#1a1f36] mb-1">Loading SSO...</h1>
        </div>
      }>
        <SsoHandler />
      </Suspense>
    </div>
  );
}
