"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PMPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pm/dashboard");
  }, [router]);

  return null;
}
