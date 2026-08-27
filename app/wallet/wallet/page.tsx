"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WalletRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const search = window.location.search || "";
    router.replace(`/wallet${search}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-stone-300">
      <div className="text-center p-6 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Redirecting to your wallet...</p>
      </div>
    </div>
  );
}
