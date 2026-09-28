import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { GlassField } from "@/components/chama/GlassField";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({
    mode: z.enum(["signin", "signup", "forgot"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Ingia — ChamaMkononi" },
      { name: "description", content: "Ingia kwenye chama chako. Sign in to your chama." },
      { property: "og:title", content: "Ingia — ChamaMkononi" },
      { property: "og:description", content: "Ingia kwenye chama chako." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const [authView, setAuthView] = useState<"signin" | "signup" | "forgot">(
    mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [sentConfirmEmail, setSentConfirmEmail] = useState(false);
  const [sentResetEmail, setSentResetEmail] = useState(false);

  async function handleGoogleSignIn() {
    setOauthBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/nyumbani`,
        },
      });
      if (error) throw error;
      // In web/mock environments or redirects:
      navigate({ to: "/nyumbani" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Imeshindikana kuingia na Google. Jaribu tena.",
      );
    } finally {
      setOauthBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (authView === "forgot") {
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setSentResetEmail(true);
        toast.success("Kiungo cha kubadilisha nywila kimetumwa kwenye barua pepe yako.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Imeshindikana kutuma barua pepe.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (pin.length < 6) {
      toast.error(
        lang === "sw"
          ? "Nywila lazima iwe na herufi 6 au zaidi."
          : "Password must be at least 6 characters.",
      );
      return;
    }

    setBusy(true);
    try {
      if (authView === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pin,
          options: {
            emailRedirectTo: `${window.location.origin}/nyumbani`,
            data: {
              full_name: name.trim(),
              ...(phone.trim() ? { phone: phone.trim() } : {}),
            },
          },
        });
        if (error) throw error;

        // If email confirmation is required and session is null
        if (!data.session) {
          setSentConfirmEmail(true);
          return;
        }

        toast.success(
          lang === "sw" ? "Akaunti imeundwa kikamilifu!" : "Account created successfully!",
        );
        navigate({ to: "/nyumbani" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pin,
        });
        if (error) throw error;
        navigate({ to: "/nyumbani" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindikana. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResendConfirmation() {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      toast.success(
        lang === "sw"
          ? "Barua pepe ya uthibitisho imetumwa tena!"
          : "Confirmation email resent successfully!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kutuma tena.");
    } finally {
      setResending(false);
    }
  }

  async function quickLogin(demoEmail: string, demoPin: string = "123456") {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPin,
      });
      if (error) throw error;
      navigate({ to: "/nyumbani" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindikana. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  }

  // 1. View: Check Email Confirmation
  if (sentConfirmEmail) {
    return (
      <Shell>
        <div className="rounded-3xl border border-brand/20 bg-card p-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-extrabold text-foreground">
            {lang === "sw" ? "Angalia barua pepe yako" : "Check your email"}
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            {lang === "sw" ? (
              <>
                Tumekutumia kiungo cha uthibitisho kwa{" "}
                <span className="font-semibold text-foreground">{email}</span>. Bofya kiungo hicho
                kisha uingie.
              </>
            ) : (
              <>
                We sent a confirmation link to{" "}
                <span className="font-semibold text-foreground">{email}</span>. Please click it to
                verify your account.
              </>
            )}
          </p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full rounded-2xl border border-border bg-card py-4 font-display text-base font-bold text-foreground transition hover:bg-muted/50 disabled:opacity-50"
            >
              {resending
                ? "Inatuma..."
                : lang === "sw"
                  ? "Tuma kiungo tena · Resend Email"
                  : "Resend Confirmation Email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSentConfirmEmail(false);
                setAuthView("signin");
              }}
              className="w-full rounded-2xl bg-brand py-4 font-display text-base font-bold text-cream"
            >
              {lang === "sw" ? "Rudi kwenye Kuingia · Back to Sign In" : "Back to Sign In"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // 2. View: Password Reset Sent
  if (sentResetEmail) {
    return (
      <Shell>
        <div className="rounded-3xl border border-brand/20 bg-card p-6 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-extrabold text-foreground">
            {lang === "sw" ? "Kiungo Kimetumwa" : "Reset Link Sent"}
          </h1>
          <p className="mt-2 text-center text-muted-foreground">
            {lang === "sw" ? (
              <>
                Tumekutumia maagizo ya kurejesha nywila kwa{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </>
            ) : (
              <>
                We have sent password reset instructions to{" "}
                <span className="font-semibold text-foreground">{email}</span>.
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => {
              setSentResetEmail(false);
              setAuthView("signin");
            }}
            className="mt-6 w-full rounded-2xl bg-brand py-4 font-display text-base font-bold text-cream"
          >
            {lang === "sw" ? "Rudi kwenye Kuingia · Back to Sign In" : "Back to Sign In"}
          </button>
        </div>
      </Shell>
    );
  }

  // 3. View: Forgot Password Form
  if (authView === "forgot") {
    return (
      <Shell>
        <h1 className="font-display text-3xl font-extrabold">
          {lang === "sw" ? "Umesahau Nywila?" : "Forgot Password?"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {lang === "sw"
            ? "Weka barua pepe yako ili tukutumie kiungo cha kubadilisha nywila."
            : "Enter your email address and we will send you a password reset link."}
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <Field label={lang === "sw" ? "Barua pepe · Email" : "Email address"}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="w-full rounded-2xl border border-border bg-card px-4 py-5 text-xl placeholder:text-muted-foreground/50"
              placeholder="mfano@chama.co.ke"
            />
          </Field>

          <button
            type="submit"
            disabled={busy}
            className="rounded-3xl bg-brand py-5 font-display text-xl font-extrabold text-cream disabled:opacity-60"
          >
            {busy
              ? t("loading")
              : lang === "sw"
                ? "Tuma Kiungo · Send Reset Link"
                : "Send Reset Link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setAuthView("signin")}
          className="mt-6 w-full rounded-2xl border border-border bg-card py-4 text-base font-bold"
        >
          {lang === "sw" ? "Rudi kwenye Kuingia · Back to Sign In" : "Back to Sign In"}
        </button>
      </Shell>
    );
  }

  // 4. View: Sign In / Sign Up
  return (
    <Shell>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display font-black text-cream shadow-sm">
          CM
        </div>
        <div>
          <span className="font-display text-sm font-black uppercase tracking-wider text-brand">
            Chama Mkononi
          </span>
          <p className="text-xs text-muted-foreground">
            Smart Financial Transparency for Kenyan Chamas
          </p>
        </div>
      </div>

      <h1 className="mt-6 font-display text-3xl font-extrabold text-foreground">
        {authView === "signup" ? t("signUp") : t("signIn")}
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {authView === "signup"
          ? "Jaza majina yako na nambari ya simu kuanza. · Sign up to create or join a chama."
          : "Weka barua pepe na nywila yako ya siri. · Sign in to access your chama."}
      </p>

      {/* Google OAuth Button */}
      <div className="mt-6">
        <button
          type="button"
          disabled={oauthBusy || busy}
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 font-display text-base font-bold text-foreground shadow-sm transition hover:bg-muted/50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {oauthBusy
              ? "Inaunganisha na Google..."
              : lang === "sw"
                ? "Endelea na Google · Continue with Google"
                : "Continue with Google"}
          </span>
        </button>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-border"></div>
          <span className="absolute bg-background px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {lang === "sw" ? "au tumia barua pepe" : "or continue with email"}
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="grid gap-4">
        {authView === "signup" ? (
          <>
            <Field label="Jina lako kamili · Full name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
                placeholder="Mama Wanjiku"
              />
            </Field>
            <Field label="Nambari ya Simu (M-Pesa) · Phone (optional)">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                autoComplete="tel"
                className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
                placeholder="0722 000 000"
              />
            </Field>
          </>
        ) : null}

        <Field label="Barua pepe · Email">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg"
            placeholder="mwanachama@mfano.co.ke"
          />
        </Field>

        <Field label="Nywila ya siri · Secret password">
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            required
            minLength={6}
            autoComplete={authView === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-lg tracking-widest"
            placeholder="••••••"
          />
        </Field>

        {authView === "signin" ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAuthView("forgot")}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {lang === "sw" ? "Umesahau nywila? · Forgot password?" : "Forgot password?"}
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy || oauthBusy}
          className="mt-2 rounded-2xl bg-brand py-5 font-display text-xl font-extrabold text-cream shadow transition hover:opacity-95 disabled:opacity-60"
        >
          {busy ? t("loading") : authView === "signup" ? t("signUp") : t("signIn")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setAuthView((v) => (v === "signup" ? "signin" : "signup"))}
        className="mt-4 w-full rounded-2xl border border-border bg-card py-4 text-base font-bold text-foreground transition hover:bg-muted/50"
      >
        {authView === "signup"
          ? "Nina akaunti tayari — Ingia · Already have an account? Sign in"
          : "Sina akaunti — Jisajili · Don't have an account? Sign up"}
      </button>

      {/* Quick Demo Accounts */}
      <div className="mt-8 border-t border-border/80 pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Ingia kwa haraka · Quick Demo Logins
        </p>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={busy || oauthBusy}
            onClick={() => quickLogin("wanjiku@tupendane.ke")}
            className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand/5 px-4 py-3 text-left transition hover:bg-brand/10 disabled:opacity-50"
          >
            <div>
              <p className="font-bold text-foreground">Mama Wanjiku</p>
              <p className="text-xs text-muted-foreground">Mwenyekiti (Chairperson)</p>
            </div>
            <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-cream">
              Ingia
            </span>
          </button>
          <button
            type="button"
            disabled={busy || oauthBusy}
            onClick={() => quickLogin("akinyi@tupendane.ke")}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50 disabled:opacity-50"
          >
            <div>
              <p className="font-bold text-foreground">Mama Akinyi</p>
              <p className="text-xs text-muted-foreground">Mweka Hazina (Treasurer)</p>
            </div>
            <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-cream">
              Ingia
            </span>
          </button>
          <button
            type="button"
            disabled={busy || oauthBusy}
            onClick={() => quickLogin("wambui@tupendane.ke")}
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:bg-muted/50 disabled:opacity-50"
          >
            <div>
              <p className="font-bold text-foreground">Mama Wambui</p>
              <p className="text-xs text-muted-foreground">Mwanachama (Member)</p>
            </div>
            <span className="rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-cream">
              Ingia
            </span>
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <GlassField />
      <div className="relative mx-auto w-full max-w-md px-5 py-8">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-foreground">{label}</span>
      {children}
    </label>
  );
}
