/**
 * GiuPay — Field (Step 16)
 * Reusable form field wrapper dùng cho mọi form trong app.
 * Extract từ RegisterShopPage + CreateOrderPage.
 *
 * Usage:
 *   import { Field, inputStyle } from "@/components/Field";
 *
 *   <Field label="Shop name" required error={errors.name}>
 *     <input style={inputStyle(!!errors.name)} ... />
 *   </Field>
 */

import { Warning } from "@phosphor-icons/react";
import { T } from "@/lib/tokens";

interface FieldProps {
  label:     string;
  hint?:     string;
  required?: boolean;
  error?:    string;
  children:  React.ReactNode;
}

export function Field({ label, hint, required = false, error, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Label row */}
      <div style={{
        display: "flex", alignItems: "baseline",
        justifyContent: "space-between",
      }}>
        <label style={{
          fontFamily: T.fontSans, fontSize: 13, fontWeight: 500, color: T.ink,
        }}>
          {label}
          {required && <span style={{ color: T.red.text, marginLeft: 3 }}>*</span>}
        </label>
        {hint && (
          <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.inkMuted }}>
            {hint}
          </span>
        )}
      </div>

      {/* Input slot */}
      {children}

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Warning size={11} color={T.red.text} />
          <span style={{ fontFamily: T.fontSans, fontSize: 11, color: T.red.text }}>
            {error}
          </span>
        </div>
      )}
    </div>
  );
}

// ── inputStyle helper ─────────────────────────────────────────────────────────
export function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%",
    fontFamily: T.fontSans,
    fontSize: 14,
    color: T.ink,
    backgroundColor: T.surface,
    border: `1px solid ${hasError ? T.red.text : T.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
    transition: "border-color 150ms",
  };
}

// ── Focus / blur handlers ─────────────────────────────────────────────────────
export const onFocus = (e: React.FocusEvent<HTMLElement>) => {
  (e.target as HTMLElement).style.borderColor = T.ink;
};

export const onBlur = (hasError = false) =>
  (e: React.FocusEvent<HTMLElement>) => {
    (e.target as HTMLElement).style.borderColor = hasError ? T.red.text : T.border;
  };
