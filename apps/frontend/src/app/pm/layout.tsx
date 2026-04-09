"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPrimaryRole, getSessionUser, SessionUser } from "@/lib/auth";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import { usePathname } from "next/navigation";

export default function PMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const sessionUser = getSessionUser();
    const role = getPrimaryRole(sessionUser?.roles ?? []);

    if (!sessionUser || role !== "PM") {
      router.push("/login");
      return;
    }

    setUser(sessionUser);
    setReady(true);
  }, [router]);

  // Map pathname to header title
  const getHeaderTitle = () => {
    if (pathname.includes("/dashboard")) return "PM Dashboard";
    if (pathname.includes("/team-members")) return "Team Members";
    if (pathname.includes("/projects")) return "Projects";
    if (pathname.includes("/settings")) return "Settings";
    return "Project Management";
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dash-bg-page)] dark:bg-[#1a1b1e]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading PM Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--dash-bg-page)] transition-colors duration-300 h-screen overflow-hidden">
      <AppSidebar role="PM" />
      <div className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <AppHeader title={getHeaderTitle()} role="PM" />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
