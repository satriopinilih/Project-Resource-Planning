"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionUser, getPrimaryRole } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export default function MasterDataLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const sessionUser = getSessionUser();
    const role = getPrimaryRole(sessionUser?.roles ?? []);

    if (role !== "GM") {
      router.replace("/dashboard");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dash-bg-page)]">
        <div className="flex flex-col items-center gap-3 text-[var(--dash-text-muted)]">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-[14px] font-medium">Checking access...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
