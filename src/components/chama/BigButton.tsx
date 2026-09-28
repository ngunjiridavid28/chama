import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  icon: string;
  title: string;
  subtitle?: string;
  to?: string;
  onClick?: () => void;
  tone?: "brand" | "plain" | "dark";
  wide?: boolean;
  disabled?: boolean;
};

const tones = {
  brand: "bg-brand text-cream shadow-[0_20px_44px_-18px_rgba(14,124,90,0.75)]",
  plain: "border border-card/70 bg-card/70 text-foreground backdrop-blur-md",
  dark: "bg-ink text-cream",
};

/** Very large tap target: icon + Kiswahili word + small English word. */
export function BigButton({
  icon,
  title,
  subtitle,
  to,
  onClick,
  tone = "plain",
  wide,
  disabled,
}: Props) {
  const inner: ReactNode = wide ? (
    <span className="flex w-full items-center justify-between">
      <span className="flex items-center gap-4">
        <span
          className="grid size-14 place-items-center rounded-2xl bg-cream/15 text-3xl"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="text-left">
          <span className="block font-display text-xl font-extrabold leading-none">{title}</span>
          {subtitle ? <span className="mt-1 block text-sm opacity-80">{subtitle}</span> : null}
        </span>
      </span>
      <span className="text-2xl" aria-hidden="true">
        →
      </span>
    </span>
  ) : (
    <span className="flex flex-col items-start gap-3">
      <span
        className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-2xl"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="font-display text-lg font-bold leading-tight">
        {title}
        {subtitle ? (
          <span className="block text-xs font-medium text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );

  const cls = `flex min-h-24 items-center rounded-3xl p-4 text-left disabled:opacity-50 ${tones[tone]} ${
    wide ? "col-span-2 px-5 py-5" : ""
  }`;

  if (to && !disabled) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
