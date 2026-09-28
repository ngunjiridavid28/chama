/** Quiet drifting frosted panels used as the app background on every screen. */
export function GlassField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="a1 absolute -left-24 -top-16 h-80 w-60 rotate-[18deg] rounded-[2.5rem] border border-card/70 bg-card/40 shadow-[0_30px_80px_-30px_rgba(14,124,90,0.45)] backdrop-blur-md" />
      <div className="a2 absolute -right-16 top-24 h-72 w-52 rotate-[-14deg] rounded-[2.5rem] border border-card/70 bg-gradient-to-br from-card/45 to-accent/10 shadow-[0_30px_80px_-30px_rgba(17,211,160,0.35)] backdrop-blur-md" />
      <div className="a3 absolute -left-10 bottom-10 h-72 w-64 rotate-[28deg] rounded-[2.5rem] border border-card/70 bg-gradient-to-tr from-brand/10 to-card/40 shadow-[0_30px_80px_-30px_rgba(7,54,43,0.35)] backdrop-blur-md" />
      <div className="absolute right-6 top-2 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
    </div>
  );
}
