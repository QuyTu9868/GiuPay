import ProductDetailPage from "../../../ProductDetailPage";
import type { GetStaticPaths, GetStaticProps } from "next";
import { DEMO_SHOPS_DATA, isDemoShop, getDemoListingDetail } from "@/lib/demo-shops";

export default ProductDetailPage;

// Demo shops: enumerate hết ngay lúc build (data tĩnh, nhẹ, không đổi) — giống pattern shop/[id].tsx.
// Shop thật: không enumerate (số lượng có thể lớn/đổi liên tục) — generate on-demand ở request
// đầu tiên rồi cache lại nhờ fallback:true.
export const getStaticPaths: GetStaticPaths = async () => {
  const demoPaths = Object.values(DEMO_SHOPS_DATA).flatMap(d =>
    d.listings.map(l => ({ params: { id: d.shop.id, listingId: l.id } }))
  );
  return { paths: demoPaths, fallback: true };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const shopId    = params?.id as string;
  const listingId = params?.listingId as string;

  // Demo shop: dùng thẳng dữ liệu tĩnh, không gọi API (API /api/listings/:id chỉ query DB thật,
  // sẽ trả 404 với id dạng "demo-X-lY").
  if (isDemoShop(shopId)) {
    const demo = getDemoListingDetail(shopId, listingId);
    if (!demo) return { notFound: true };
    return { props: { initialListing: demo } };
  }

  try {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const res = await fetch(`${API}/api/listings/${listingId}`);
    const json = await res.json();
    if (!json.success) return { notFound: true };
    return {
      props: { initialListing: json.data },
      revalidate: 60,
    };
  } catch {
    return { notFound: true };
  }
};
