import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useWallet } from "@/hooks/useWallet";
import { NavBar } from "@/components/NavBar";
import ShopPublicPage from "../ShopPublicPage";
import DashboardPage from "../DashboardPage";
import { DEMO_SHOPS_DATA, isDemoShop } from "@/lib/demo-shops";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ShopRouteProps {
  initialShop?: { id: string; walletAddress?: string; [k: string]: unknown };
  initialListings?: unknown[];
  initialOrders?: unknown[];
}

/**
 * Route /shop/[id] phục vụ 2 vai trò trên CÙNG 1 URL:
 *  - Ví đang kết nối LÀ chủ shop (verified, id khớp) → hiện thẳng Dashboard quản lý
 *    (kèm NavBar đầy đủ, vì DashboardPage không tự render NavBar — bình thường dựa vào _app.tsx,
 *    nhưng route này không nằm trong FULL_NAVBAR_ROUTES nên phải tự render ở đây).
 *  - Ví thường / khách / chưa kết nối → trang mua hàng công khai như cũ (ShopPublicPage tự có
 *    NavBarMinimal riêng).
 * Nhờ vậy nút "Shop của tôi" và link khi khách bấm vào shop đều là /shop/{id} — 1 đường link duy nhất.
 */
export default function ShopRoute(props: ShopRouteProps) {
  const router = useRouter();
  const { walletAddress, isConnected, isConnecting } = useWallet();

  const shopId = props.initialShop?.id ?? (router.query.id as string | undefined);

  // ?preview=1 → chủ shop cố tình muốn XEM THỬ giao diện khách (nút "Xem trang shop" trong
  // Dashboard), nên bỏ qua nhận diện chủ shop và hiện trang công khai như buyer.
  const previewPublic = router.query.preview === "1" || router.query.view === "public";

  const [isOwner, setIsOwner] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Chưa biết shopId hoặc chưa kết nối ví → chắc chắn không phải chủ shop.
    // Demo shop không thuộc sở hữu ai → luôn xem như khách.
    // previewPublic → chủ shop chủ động xem giao diện khách.
    if (!shopId || !walletAddress || isDemoShop(shopId) || previewPublic) {
      setIsOwner(false);
      setChecked(true);
      return;
    }

    setChecked(false);
    fetch(`${API}/api/shops/me`, { headers: { "X-Wallet-Address": walletAddress } })
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (cancelled) return;
        const mine = json?.success ? json.data : null;
        // Chủ shop = ví này sở hữu đúng shop đang xem VÀ shop đã verified.
        setIsOwner(!!mine && mine.id === shopId && mine.status === "verified");
      })
      .catch(() => { if (!cancelled) setIsOwner(false); })
      .finally(() => { if (!cancelled) setChecked(true); });

    return () => { cancelled = true; };
  }, [shopId, walletAddress, previewPublic]);

  // Trong lúc còn đang xác định chủ shop (ví đã kết nối, shop thật) → giữ màn chờ nhẹ để chủ shop
  // không bị nháy qua giao diện buyer trước khi Dashboard hiện. Ví chưa kết nối thì vào thẳng
  // trang công khai, không phải chờ gì.
  const stillChecking = isConnected && !checked && !!shopId && !isDemoShop(shopId) && !previewPublic;
  if (isConnecting || stillChecking) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#FBFBFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #EAEAEA", borderTopColor: "#111111", animation: "ap-spin 700ms linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: "@keyframes ap-spin{to{transform:rotate(360deg)}}" }} />
      </div>
    );
  }

  if (isOwner) {
    return (
      <>
        <NavBar />
        <DashboardPage />
      </>
    );
  }

  return <ShopPublicPage {...(props as any)} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const demoPaths = Object.keys(DEMO_SHOPS_DATA).map(id => ({ params: { id } }));

  let realPaths: { params: { id: string } }[] = [];
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${API_URL}/api/shops?limit=50`);
    const json = await res.json();
    if (json.success) {
      realPaths = (json.data.shops ?? []).map((s: { id: string }) => ({ params: { id: s.id } }));
    }
  } catch {
    // Backend offline during build — fallback: true hiện skeleton loading ngay, ShopPublicPage
    // tự fetch client-side khi initialShop chưa có (xem useEffect trong ShopPublicPage.tsx),
    // thay vì chờ trắng màn hình cho tới khi SSR xong như "blocking".
  }

  return { paths: [...demoPaths, ...realPaths], fallback: true };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id as string;

  // Demo shop: dùng local data, không cần backend
  if (isDemoShop(id)) {
    const demo = DEMO_SHOPS_DATA[id];
    if (!demo) return { notFound: true };
    const s = demo.shop;
    return {
      props: {
        initialShop: {
          id: s.id, name: s.name, description: s.description,
          category: s.category, gmail: s.gmail,
          facebookUrl: s.facebookUrl ?? null,
          returnPolicy: s.returnPolicy,
          status: "verified" as const,
          avgRating: s.avgRating, totalOrders: s.totalOrders,
          totalRevenue: s.totalRevenue, createdAt: s.createdAt,
        },
        initialListings: demo.listings.map(l => ({
          id: l.id, name: l.name,
          ...(l.description ? { description: l.description } : {}),
          priceUsdc: l.priceUsdc, isActive: l.isActive,
        })),
        initialOrders: demo.orders.map(o => ({
          id: o.id, orderCode: o.orderCode, productName: o.productName,
          priceUsdc: o.priceUsdc, warrantyDays: o.warrantyDays,
          status: o.status, createdAt: o.createdAt,
          ...(o.review ? { review: o.review } : {}),
        })),
      },
    };
  }

  // Real shop: gọi /full endpoint — 1 request thay vì 3
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${API_URL}/api/shops/${id}/full`);
    const json = await res.json();
    if (!json.success) return { notFound: true };
    return {
      props: {
        initialShop: json.data.shop,
        initialListings: json.data.listings,
        initialOrders: json.data.orders,
      },
      revalidate: 60,
    };
  } catch {
    return { notFound: true };
  }
};
