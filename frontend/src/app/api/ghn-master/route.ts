import { NextRequest, NextResponse } from "next/server";

// Sandbox (5sao.ghn.dev) dùng domain "dev-online-gateway" — KHÔNG phải "online-gateway" (production).
// Token lấy từ sandbox chỉ hoạt động với domain này; gọi nhầm domain production sẽ bị GHN từ chối.
const GHN_BASE = "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const GHN_TOKEN = process.env.GHN_TOKEN;

  if (!GHN_TOKEN) {
    return NextResponse.json({ data: [] });
  }

  let url = "";
  if (type === "province") {
    url = `${GHN_BASE}/province`;
  } else if (type === "district") {
    const provinceId = searchParams.get("province_id");
    if (!provinceId) return NextResponse.json({ data: [] });
    url = `${GHN_BASE}/district?province_id=${provinceId}`;
  } else if (type === "ward") {
    const districtId = searchParams.get("district_id");
    if (!districtId) return NextResponse.json({ data: [] });
    url = `${GHN_BASE}/ward?district_id=${districtId}`;
  } else {
    return NextResponse.json({ data: [] });
  }

  try {
    const res = await fetch(url, {
      headers: { Token: GHN_TOKEN, "Content-Type": "application/json" },
      next: { revalidate: 3600 },
    });
    const json = await res.json();
    return NextResponse.json({ data: json.data ?? [] });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
