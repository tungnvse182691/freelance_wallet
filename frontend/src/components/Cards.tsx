// Sổ cái: Tổng tiền là hero nền đen + shader duy nhất, Thu/Chi/Lãi là dòng nhỏ viền trái màu.
// Không dùng 3 card giống hệt nhau (tránh SaaS-card kit).

import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

export function formatVND(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

// Bọc canvas WebGL: hỏng là rớt về nền CSS tĩnh bên dưới, không vỡ cả thẻ.
class ShaderFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function HeroShader({ paused }: { paused: boolean }) {
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <ShaderFallback>
        <ShaderGradientCanvas pixelDensity={1} style={{ position: "absolute", inset: 0 }}>
          <ShaderGradient
            type="waterPlane"
            animate={paused ? "off" : "on"}
            uSpeed={0.15}
            uStrength={2.2}
            uDensity={1.1}
            uFrequency={4}
            uAmplitude={1.4}
            range="disabled"
            grain="off"
            brightness={0.85}
            color1="#16A34A"
            color2="#14532D"
            color3="#111827"
          />
        </ShaderGradientCanvas>
      </ShaderFallback>
    </div>
  );
}

// Nền ambient toàn app: sương gradient nhạt cố định sau nội dung.
// Thẻ trắng giữ nguyên nên chữ/số vẫn đọc rõ. Máy yếu tắt chuyển động
// hoặc WebGL hỏng thì còn lớp CSS tĩnh bên dưới.
export function AmbientBackground() {
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();
  return (
    <div aria-hidden="true" className="fixed inset-0" style={{ pointerEvents: "none", zIndex: 0 }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 15% 0%, #D9FBE8 0%, transparent 70%), radial-gradient(55% 40% at 90% 20%, #D1FAE5 0%, transparent 70%), radial-gradient(70% 55% at 50% 110%, #E8F5E9 0%, transparent 70%), #F4F7F4",
        }}
      />
      {!reduced && (
        <div className="absolute inset-0" style={{ opacity: 0.55 }}>
          <ShaderFallback>
            <ShaderGradientCanvas pixelDensity={1} style={{ position: "absolute", inset: 0 }}>
              <ShaderGradient
                type="plane"
                animate={visible ? "on" : "off"}
                uSpeed={0.1}
                uStrength={1.6}
                uDensity={1}
                uFrequency={3.5}
                uAmplitude={1}
                range="disabled"
                grain="off"
                brightness={1.1}
                color1="#BBF7D0"
                color2="#D9FBE8"
                color3="#F4F7F4"
              />
            </ShaderGradientCanvas>
          </ShaderFallback>
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "red" | "dark" | "plain";
}) {
  if (tone === "dark") {
    return <HeroCard label={label} value={value} />;
  }
  const edge = tone === "green" ? "border-l-[#16A34A]" : "border-l-[#DC2626]";
  const num =
    tone === "green" ? "text-green-700" : tone === "red" ? "text-red-700" : "text-[#111827]";
  return (
    <div className={`rounded-xl border border-[#E2E8E0] border-l-4 ${tone === "plain" ? "border-l-[#111827]" : edge} bg-white px-4 py-3`}>
      <div className="text-sm text-[#64748B]">{label}</div>
      <div
        className={`mt-0.5 text-xl font-bold tabular-nums ${num}`}
        style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif' }}
      >
        {formatVND(value)}
      </div>
    </div>
  );
}

function HeroCard({ label, value }: { label: string; value: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white"
      style={{ background: "linear-gradient(135deg, #16A34A 0%, #14532D 48%, #111827 100%)" }}
    >
      {!reducedMotion && <HeroShader paused={!pageVisible} />}
      <div className="relative">
        <div className="text-sm text-slate-300">{label}</div>
        <div
          className="mt-1 font-bold tabular-nums"
          style={{ fontFamily: '"Be Vietnam Pro", Inter, system-ui, sans-serif', fontSize: "2rem", lineHeight: 1.1 }}
        >
          {formatVND(value)}
        </div>
      </div>
    </div>
  );
}

export function OverdueBadge() {
  return (
    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
      Quá hạn
    </span>
  );
}
