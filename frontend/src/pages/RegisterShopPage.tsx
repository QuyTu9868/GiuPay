/**
 * GiuPay — RegisterShopPage (Step 19)
 * ✅ i18n: tất cả text dùng t.xxx từ useTheme()
 * ✅ NavBar: dùng NavBarMinimal + StepDots từ components
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { useWallet } from "@/hooks/useWallet";
import { NavBarMinimal, StepDots } from "@/components/NavBarMinimal";
import {
  ArrowRight, CaretLeft, CheckCircle, UploadSimple,
  X, Warning, EnvelopeSimple, FacebookLogo,
  ClockCountdown, Storefront, Info,
} from "@phosphor-icons/react";

const T = {
  canvas:    "#FBFBFA", surface:   "#FFFFFF", surfaceAlt:"#F7F6F3",
  border:    "#EAEAEA", ink:       "#111111", inkMid:    "#37352F",
  inkMuted:  "#787774",
  green:  { bg: "#EDF3EC", text: "#346538" },
  blue:   { bg: "#E1F3FE", text: "#1F6C9F" },
  yellow: { bg: "#FBF3DB", text: "#956400" },
  red:    { bg: "#FDEBEC", text: "#9F2F2D" },
  fontSans: "'Geist Sans', 'SF Pro Display', 'Helvetica Neue', sans-serif",
  fontMono: "'Geist Mono', 'SF Mono', 'JetBrains Mono', monospace",
};

type Step = 1 | 2 | 3;

// Phải KHỚP đúng danh mục ở HomePage/ShopsPage. DB lưu giá trị tiếng Việt (là cái bộ lọc dùng).
const CATEGORIES_VI = ["Công nghệ","Thời trang","Đồ ăn & Thức uống","Làm đẹp","Sách","Nội thất","Đồ chơi & Mẹ bé"];
const CATEGORIES_EN = ["Technology","Fashion","Food & Drinks","Beauty","Books","Home & Living","Toys & Kids"];

interface ShopForm {
  name: string; category: string; description: string;
  gmail: string; returnPolicy: string; facebook: string;
}

interface DocFile {
  file: File; preview: string; cid?: string; uploading: boolean; error?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function useReveal(threshold = 0.1) {
  const [visible, setVisible] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    obsRef.current?.disconnect();
    if (!node) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(node);
    obsRef.current = obs;
  }, [threshold]);
  return { ref, visible };
}

function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
  return { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms` };
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.canvas}; font-family: ${T.fontSans}; color: ${T.ink}; -webkit-font-smoothing: antialiased; }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; cursor: pointer; border: none; background: none; }
  input, textarea, select { font-family: inherit; }
  @keyframes ap-spin { to { transform: rotate(360deg); } }
  @keyframes ap-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
`;

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: "100%", fontFamily: T.fontSans, fontSize: 14, color: T.ink,
  backgroundColor: T.surface, border: `1px solid ${hasError ? T.red.text : T.border}`,
  borderRadius: 8, padding: "10px 12px", outline: "none", transition: "border-color 150ms",
});

function Field({ label, hint, required, error, children }: { label:string; hint?:string; required?:boolean; error?:string; children:React.ReactNode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
        <label style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.ink }}>
          {label}{required && <span style={{ color:T.red.text, marginLeft:3 }}>*</span>}
        </label>
        {hint && <span style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted }}>{hint}</span>}
      </div>
      {children}
      {error && <div style={{ display:"flex", alignItems:"center", gap:5 }}><Warning size={11} color={T.red.text} /><span style={{ fontFamily:T.fontSans, fontSize:11, color:T.red.text }}>{error}</span></div>}
    </div>
  );
}

// ── Step Progress Header ──────────────────────────────────────────────────────
function StepHeader({ step }: { step: Step }) {
  const { t } = useTheme();
  const steps = [
    { n: 1, label: t.step1 },
    { n: 2, label: t.step2 },
    { n: 3, label: t.step3 },
  ];
  return (
    <div style={{ marginBottom:36 }}>
      <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:28 }}>
        {steps.map(({ n, label }, i) => (
          <div key={n} style={{ display:"flex", alignItems:"center", flex: i < 2 ? 1 : "none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0, border:`1px solid ${n < step ? T.green.text : n === step ? T.ink : T.border}`, backgroundColor: n < step ? T.green.bg : n === step ? T.ink : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {n < step
                  ? <CheckCircle size={13} color={T.green.text} weight="fill" />
                  : <span style={{ fontFamily:T.fontMono, fontSize:10, fontWeight:700, color: n === step ? T.canvas : T.inkMuted }}>{n}</span>
                }
              </div>
              <span style={{ fontFamily:T.fontSans, fontSize:12, color: n === step ? T.ink : T.inkMuted, fontWeight: n === step ? 600 : 400, whiteSpace:"nowrap" }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex:1, height:1, backgroundColor: n < step ? T.green.text : T.border, margin:"0 12px" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 1: Shop Info ─────────────────────────────────────────────────────────
function Step1({ form, setForm, onNext }: { form:ShopForm; setForm:React.Dispatch<React.SetStateAction<ShopForm>>; onNext:()=>void }) {
  const { t, lang } = useTheme();
  const { ref, visible } = useReveal(0.05);
  const [errors, setErrors] = useState<Partial<ShopForm>>({});
  const CATEGORIES = lang === "vi" ? CATEGORIES_VI : CATEGORIES_EN;
  const isVi = lang === "vi";

  const set = (key: keyof ShopForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  function validate() {
    const err: Partial<ShopForm> = {};
    if (!form.name.trim())        err.name        = isVi ? "Tên shop không được trống" : "Shop name is required";
    if (!form.category)           err.category    = isVi ? "Vui lòng chọn danh mục" : "Please select a category";
    if (!form.description.trim()) err.description = isVi ? "Mô tả không được trống" : "Description is required";
    if (!form.gmail.trim())       err.gmail       = isVi ? "Email không được trống" : "Email is required";
    setErrors(err);
    return Object.keys(err).length === 0;
  }

  return (
    <div ref={ref} style={{ display:"flex", flexDirection:"column", gap:20, ...revealStyle(visible) }}>
      <Field label={isVi ? "Tên cửa hàng" : "Shop name"} required error={errors.name}>
        <input type="text" value={form.name} onChange={set("name")} maxLength={100}
          placeholder={isVi ? "VD: Thời Trang Linh" : "e.g. Linh Fashion Store"}
          style={inputStyle(!!errors.name)}
          onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = errors.name ? T.red.text : T.border)} />
      </Field>

      <Field label={isVi ? "Danh mục" : "Category"} required error={errors.category}>
        <select value={form.category} onChange={set("category")} style={{ ...inputStyle(!!errors.category), appearance:"none" }}>
          <option value="">{isVi ? "Chọn danh mục..." : "Select category..."}</option>
          {CATEGORIES_VI.map((vi, i) => <option key={vi} value={vi}>{CATEGORIES[i]}</option>)}
        </select>
      </Field>

      <Field label={isVi ? "Mô tả shop" : "Shop description"} required hint={`${form.description.length}/500`} error={errors.description}>
        <textarea value={form.description} onChange={set("description")} maxLength={500} rows={3}
          placeholder={isVi ? "Mô tả sản phẩm, dịch vụ của bạn..." : "Describe your products and services..."}
          style={{ ...inputStyle(!!errors.description), resize:"vertical", lineHeight:1.6 }}
          onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = errors.description ? T.red.text : T.border)} />
      </Field>

      <Field label="Gmail" required error={errors.gmail}>
        <input type="email" value={form.gmail} onChange={set("gmail")}
          placeholder="shop@gmail.com" style={inputStyle(!!errors.gmail)}
          onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = errors.gmail ? T.red.text : T.border)} />
      </Field>

      <Field label={isVi ? "Chính sách đổi trả" : "Return policy"} hint={isVi ? "Tùy chọn" : "Optional"}>
        <textarea value={form.returnPolicy} onChange={set("returnPolicy")} maxLength={300} rows={2}
          placeholder={isVi ? "VD: Đổi trả trong 7 ngày nếu có lỗi từ nhà sản xuất..." : "e.g. Returns accepted within 7 days for manufacturing defects..."}
          style={{ ...inputStyle(), resize:"vertical", lineHeight:1.6 }}
          onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
      </Field>

      <Field label="Facebook" hint={isVi ? "Tùy chọn" : "Optional"}>
        <input type="url" value={form.facebook} onChange={set("facebook")}
          placeholder="https://facebook.com/yourshop" style={inputStyle()}
          onFocus={e => (e.target.style.borderColor = T.ink)} onBlur={e => (e.target.style.borderColor = T.border)} />
      </Field>

      <button onClick={() => { if (validate()) onNext(); }} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor:T.ink, borderRadius:6, padding:"13px 0", border:"none", cursor:"pointer", transition:"background-color 150ms" }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#333")}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = T.ink)}
      >
        {t.next} <ArrowRight size={13} weight="bold" />
      </button>
    </div>
  );
}

// ── Step 2: Upload doc ────────────────────────────────────────────────────────
function Step2({ onNext, onBack }: { onNext:(cid:string)=>void; onBack:()=>void }) {
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const [doc, setDoc]         = useState<DocFile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setDoc({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "", uploading: true });
    try {
      const fd = new FormData(); fd.append("doc", file);
      const res = await fetch(`${API}/api/upload/doc`, { method:"POST", body:fd });
      const { success, data, error } = await res.json();
      if (!success) throw new Error(error);
      setDoc(d => d ? { ...d, cid: data.cid, uploading: false } : null);
    } catch (e: any) {
      setDoc(d => d ? { ...d, uploading: false, error: e.message } : null);
    }
  }

  async function handleSubmit() {
    if (!doc?.cid) return;
    setSubmitting(true);
    onNext(doc.cid);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt }}>
        <Info size={13} color={T.inkMuted} style={{ flexShrink:0, marginTop:1 }} />
        <p style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, lineHeight:1.6 }}>
          {isVi ? "Upload CCCD, hộ chiếu hoặc giấy phép kinh doanh. File sẽ được mã hóa và lưu trên IPFS." : "Upload your ID card, passport, or business license. The file will be encrypted and stored on IPFS."}
          {" "}
          <span style={{ color:T.inkMuted }}>({isVi ? "Không bắt buộc" : "Optional"})</span>
        </p>
      </div>

      <div style={{ border:`1.5px dashed ${T.border}`, borderRadius:8, padding:"32px 24px", textAlign:"center", backgroundColor:T.surfaceAlt, cursor:"pointer" }}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = T.ink; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = T.border; }}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); e.currentTarget.style.borderColor = T.border; }}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {doc ? (
          <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
            <div style={{ fontFamily:T.fontSans, fontSize:13, color:T.ink }}>{doc.file.name}</div>
            {doc.uploading && <div style={{ width:14, height:14, borderRadius:"50%", border:`2px solid ${T.border}`, borderTopColor:T.ink, animation:"ap-spin 700ms linear infinite" }} />}
            {doc.cid && <CheckCircle size={16} color={T.green.text} weight="fill" />}
            {doc.error && <Warning size={16} color={T.red.text} />}
            <button onClick={e => { e.stopPropagation(); setDoc(null); }} style={{ color:T.inkMuted }}><X size={14} /></button>
          </div>
        ) : (
          <>
            <UploadSimple size={24} color={T.inkMuted} style={{ marginBottom:10 }} />
            <p style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted }}>{isVi ? "Kéo thả hoặc click để chọn file" : "Drag & drop or click to select file"}</p>
            <p style={{ fontFamily:T.fontSans, fontSize:11, color:T.inkMuted, marginTop:4 }}>JPG, PNG, PDF · {isVi ? "tối đa 10MB" : "max 10MB"}</p>
          </>
        )}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onBack} style={{ flex:"0 0 auto", display:"flex", alignItems:"center", gap:6, fontFamily:T.fontSans, fontSize:13, fontWeight:500, color:T.inkMuted, border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 20px", backgroundColor:T.surface, cursor:"pointer", transition:"border-color 150ms, color 150ms" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink; e.currentTarget.style.color = T.ink; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
        >
          <CaretLeft size={13} weight="bold" /> {t.prev}
        </button>
        {/* Submit với doc đã upload */}
        {doc?.cid && (
          <button onClick={handleSubmit} disabled={submitting} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor: submitting ? T.border : T.ink, borderRadius:6, padding:"13px 0", cursor: submitting ? "not-allowed" : "pointer", transition:"background-color 150ms", border:"none" }}
            onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = "#333"; }}
            onMouseLeave={e => { if (!submitting) e.currentTarget.style.backgroundColor = T.ink; }}
          >
            {submitting
              ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:T.canvas, animation:"ap-spin 700ms linear infinite" }} />{isVi ? "Đang nộp..." : "Submitting..."}</>
              : <>{t.submitShop} <ArrowRight size={13} weight="bold" /></>
            }
          </button>
        )}
        {/* Bỏ qua nếu chưa upload hoặc upload lỗi — KHÓA lại khi ảnh đang tải để tránh submit giữa chừng */}
        {!doc?.cid && (
          <button onClick={() => onNext("")} disabled={doc?.uploading} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.canvas, backgroundColor: doc?.uploading ? T.border : T.ink, borderRadius:6, padding:"13px 0", cursor: doc?.uploading ? "not-allowed" : "pointer", transition:"background-color 150ms", border:"none" }}
            onMouseEnter={e => { if (!doc?.uploading) e.currentTarget.style.backgroundColor = "#333"; }}
            onMouseLeave={e => { if (!doc?.uploading) e.currentTarget.style.backgroundColor = T.ink; }}
          >
            {doc?.uploading
              ? (isVi ? "Đang tải ảnh..." : "Uploading...")
              : <>{isVi ? "Bỏ qua & Nộp đơn" : "Skip & Submit"} <ArrowRight size={13} weight="bold" /></>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Submitted ─────────────────────────────────────────────────────────
function Step3({ shopName, gmail }: { shopName:string; gmail:string }) {
  const { t, lang } = useTheme();
  const { ref, visible } = useReveal(0.05);
  const isVi = lang === "vi";

  const steps3 = [
    { icon:<ClockCountdown size={16} weight="duotone" />, title: isVi ? "Đang xem xét" : "Under review", desc: isVi ? "Đội ngũ GiuPay sẽ xem xét đơn đăng ký của bạn trong 24 giờ." : "Our team will review your application within 24 hours." },
    { icon:<EnvelopeSimple size={16} weight="duotone" />, title: isVi ? `Email gửi đến ${gmail}` : `Email sent to ${gmail}`, desc: isVi ? "Bạn sẽ nhận email xác nhận hoặc từ chối cùng các bước tiếp theo." : "You'll receive an approval or rejection email with next steps." },
    { icon:<Storefront size={16} weight="duotone" />, title: isVi ? "Bắt đầu kinh doanh" : "Go live", desc: isVi ? "Sau khi được duyệt, shop sẽ xuất hiện trên marketplace và bạn có thể tạo đơn hàng." : "Once approved, your shop will appear in the marketplace and you can create orders." },
  ];

  return (
    <div ref={ref} style={{ ...revealStyle(visible) }}>
      <div style={{ width:56, height:56, borderRadius:14, border:`1px solid ${T.green.bg}`, backgroundColor:T.green.bg, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 0 28px" }}>
        <CheckCircle size={28} color={T.green.text} weight="fill" />
      </div>
      <div style={{ border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", marginBottom:24 }}>
        {steps3.map(({ icon, title, desc }, i, arr) => (
          <div key={i} style={{ display:"flex", gap:14, padding:"18px 20px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none", backgroundColor:T.surface }}>
            <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, display:"flex", alignItems:"center", justifyContent:"center", color:T.inkMid }}>{icon}</div>
            <div>
              <div style={{ fontFamily:T.fontSans, fontSize:13, fontWeight:600, color:T.ink, marginBottom:4 }}>{title}</div>
              <div style={{ fontFamily:T.fontSans, fontSize:13, color:T.inkMuted, lineHeight:1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:"14px 16px", borderRadius:8, border:`1px solid ${T.border}`, backgroundColor:T.surfaceAlt, marginBottom:24 }}>
        <div style={{ fontFamily:T.fontSans, fontSize:12, color:T.inkMuted, marginBottom:8 }}>{isVi ? "Tóm tắt đơn đăng ký" : "Application summary"}</div>
        <div style={{ fontFamily:T.fontSans, fontSize:14, fontWeight:600, color:T.ink }}>{shopName}</div>
        <div style={{ display:"inline-flex", marginTop:6, fontFamily:T.fontMono, fontSize:10, letterSpacing:"0.05em", textTransform:"uppercase", borderRadius:9999, padding:"2px 8px", backgroundColor:T.yellow.bg, color:T.yellow.text }}>
          {isVi ? "Chờ duyệt" : "Pending review"}
        </div>
      </div>
      <a href="/" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:T.fontSans, fontSize:14, fontWeight:500, color:T.inkMuted, backgroundColor:"transparent", border:`1px solid ${T.border}`, borderRadius:6, padding:"12px 0", width:"100%", transition:"border-color 150ms, color 150ms" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.ink; e.currentTarget.style.color = T.ink; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.inkMuted; }}
      >
        {t.goHome}
      </a>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RegisterShopPage() {
  const { t, lang } = useTheme();
  const isVi = lang === "vi";
  const { walletAddress } = useWallet();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ShopForm>({ name:"", category:"", description:"", gmail:"", returnPolicy:"", facebook:"" });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => { window.scrollTo({ top:0, behavior:"smooth" }); }, [step]);

  async function handleStep2Next(cid: string) {
    setSubmitError("");
    if (!walletAddress) {
      setSubmitError(isVi ? "Chưa kết nối ví. Vui lòng kết nối ví trước." : "Wallet not connected. Please connect your wallet first.");
      return;
    }
    try {
      const res = await fetch(`${API}/api/shops`, {
        method:"POST",
        headers: { "Content-Type":"application/json", "X-Wallet-Address": walletAddress },
        body: JSON.stringify({ name:form.name, category:form.category, description:form.description, gmail:form.gmail, return_policy:form.returnPolicy, facebook_url:form.facebook||undefined, doc_cid:cid||undefined }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        setSubmitError(error ?? (isVi ? "Đăng ký thất bại. Vui lòng thử lại." : "Registration failed. Please try again."));
        return;
      }
    } catch {
      setSubmitError(isVi ? "Không thể kết nối server. Vui lòng thử lại." : "Cannot connect to server. Please try again.");
      return;
    }
    setStep(3);
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <NavBarMinimal back="/" right={<StepDots total={3} current={step} />} />
      <main style={{ minHeight:"100dvh", backgroundColor:T.canvas, padding:"88px 24px 72px", display:"flex", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:600 }}>
          <h1 style={{ fontFamily:T.fontSans, fontSize:"clamp(22px,3vw,28px)", fontWeight:700, letterSpacing:"-0.03em", color:T.ink, marginBottom:24 }}>
            {t.registerTitle}
          </h1>
          <StepHeader step={step} />
          {step === 1 && <Step1 form={form} setForm={setForm} onNext={() => setStep(2)} />}
          {step === 2 && (
            <>
              <Step2 onNext={handleStep2Next} onBack={() => setStep(1)} />
              {submitError && (
                <div style={{ marginTop:12, padding:"10px 14px", borderRadius:8, backgroundColor:T.red.bg, border:`1px solid ${T.red.text}22`, fontFamily:T.fontSans, fontSize:13, color:T.red.text }}>
                  {submitError}
                </div>
              )}
            </>
          )}
          {step === 3 && <Step3 shopName={form.name} gmail={form.gmail} />}
        </div>
      </main>
    </>
  );
}
