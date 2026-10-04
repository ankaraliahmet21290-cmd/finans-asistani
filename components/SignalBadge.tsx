import type { Signal } from "@/lib/types";

const STYLES: Record<Signal, string> = {
  AL: "border-emerald-500/40 bg-emerald-500/15 text-emerald-500",
  SAT: "border-red-500/40 bg-red-500/15 text-red-500",
  TUT: "border-zinc-500/40 bg-zinc-500/15 text-zinc-400",
};

export default function SignalBadge({
  signal,
  size = "md",
}: {
  signal: Signal;
  size?: "sm" | "md" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "px-4 py-1.5 text-lg"
      : size === "sm"
        ? "px-2 py-0.5 text-xs"
        : "px-2.5 py-0.5 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizing} ${STYLES[signal]}`}
    >
      {signal}
    </span>
  );
}
