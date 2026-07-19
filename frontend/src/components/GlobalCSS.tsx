/**
 * GiuPay — GlobalCSS (Step 16)
 * Inject một lần duy nhất trong layout.tsx.
 * Không inject trong từng page nữa.
 */

import { T } from "@/lib/tokens";

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: ${T.canvas};
    font-family: ${T.fontSans};
    color: ${T.ink};
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  button { font-family: inherit; cursor: pointer; border: none; background: none; }
  input, textarea, select { font-family: inherit; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${T.surfaceAlt}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }

  @keyframes ap-spin    { to { transform: rotate(360deg); } }
  @keyframes ap-pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes ap-shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* Mobile helpers */
  @media (max-width: 640px) {
    .ap-hide-sm { display: none !important; }
    .ap-show-sm { display: flex !important; }
  }
  @media (min-width: 641px) {
    .ap-show-sm { display: none !important; }
  }

  /* Dark Mode — CSS filter invert trick */
  [data-theme="dark"] {
    filter: invert(1) hue-rotate(180deg);
  }
  /* Re-invert images & video so they look correct */
  [data-theme="dark"] img,
  [data-theme="dark"] video,
  [data-theme="dark"] canvas,
  [data-theme="dark"] [data-no-invert] {
    filter: invert(1) hue-rotate(180deg);
  }
`;

export function GlobalCSS() {
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
