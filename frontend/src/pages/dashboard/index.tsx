// Route /dashboard — GOP vao /shop/{id}.
// Truoc day trang nay render thang DashboardPage. Nay Dashboard duoc hien ngay tai /shop/{id}
// cho chu shop (xem pages/shop/[id].tsx), nen /dashboard chi con nhiem vu chuyen huong:
//   - verified -> /shop/{id}
//   - pending  -> /pending
//   - con lai  -> /register
// Giu lai route nay de moi link/back cu tro toi /dashboard van hoat dong (khong gay).
"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@/hooks/useWallet";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function DashboardRedirect() {
  const router = useRouter();
  const { walletAddress, isConnecting } = useWallet();

  useEffect(() => {
    if (isConnecting) return;
    if (!walletAddress) { router.replace("/"); return; }

    let cancelled = false;
    fetch(`${API}/api/shops/me`, { headers: { "X-Wallet-Address": walletAddress } })
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return;
        const s = json?.success ? json.data : null;
        if (s?.status === "verified") router.replace(`/shop/${s.id}`);
        else if (s?.status === "pending") router.replace("/pending");
        else router.replace("/register");
      })
      .catch(() => { if (!cancelled) router.replace("/register"); });

    return () => { cancelled = true; };
  }, [walletAddress, isConnecting]);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FBFBFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #EAEAEA", borderTopColor: "#111111", animation: "ap-spin 700ms linear infinite" }} />
      <style dangerouslySetInnerHTML={{ __html: "@keyframes ap-spin{to{transform:rotate(360deg)}}" }} />
    </div>
  );
}
