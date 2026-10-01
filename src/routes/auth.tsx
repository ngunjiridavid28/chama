import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
      { title: "Ingia / Jisajili — ChamaMkononi" },
      {
        name: "description",
        content: "Ingia kwenye chama chako au unda akaunti mpya salama. Sign in to your chama.",
      },
      { property: "og:title", content: "Ingia / Jisajili — ChamaMkononi" },
      { property: "og:description", content: "Ingia kwenye chama chako au unda akaunti mpya." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang, setLang } = useLang();

  const [authView, setAuthView] = useState<"signin" | "signup" | "forgot">(
    mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [sentConfirmEmail, setSentConfirmEmail] = useState(false);
  const [sentResetEmail, setSentResetEmail] = useState(false);

  // Password strength evaluation
  const passwordCriteria = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    };
  }, [password]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.minLength) score += 1;
    if (passwordCriteria.hasUpper && passwordCriteria.hasLower) score += 1;
    if (passwordCriteria.hasNumber) score += 1;
    if (passwordCriteria.hasSpecial) score += 1;
    return score;
  }, [passwordCriteria]);

  const isPasswordStrong = passwordScore >= 4;

  async function handleGoogleSignIn() {
    setOauthBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/nyumbani`,
        },
      });
      if (error) throw error;
      // In web applet environment with mock client or active session
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
        toast.success(
          lang === "sw"
            ? "Kiungo cha kubadilisha nywila kimetumwa kwenye barua pepe yako."
            : "Password reset link sent to your email.",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Imeshindikana kutuma barua pepe.");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (authView === "signup") {
      if (!isPasswordStrong) {
        toast.error(
          lang === "sw"
            ? "Tafadhali weka nywila imara inayokidhi vigezo vyote vilivyoorodheshwa."
            : "Please enter a strong password that meets all listed criteria.",
        );
        return;
      }

      if (password !== confirmPassword) {
        toast.error(lang === "sw" ? "Nywila hazilingani. Hakiki tena." : "Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (authView === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/nyumbani`,
            data: {
              full_name: name.trim(),
              ...(phone.trim() ? { phone: phone.trim() } : {}),
            },
          },
        });
        if (error) throw error;

        if (!data.session) {
          setSentConfirmEmail(true);
          return;
        }

        toast.success(
          lang === "sw"
            ? "Hongera! Akaunti imeundwa kikamilifu!"
            : "Account created successfully! Welcome.",
        );
        navigate({ to: "/nyumbani" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        toast.success(lang === "sw" ? "Umeingia kikamilifu!" : "Signed in successfully!");
        navigate({ to: "/nyumbani" });
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : lang === "sw"
            ? "Barua pepe au nywila si sahihi."
            : "Invalid email or password.",
      );
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
          ? "Barua pepe mpya ya uthibitisho imetumwa!"
          : "Verification email resent successfully!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Imeshindikana kutuma tena.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <GlassField />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-card/80 bg-card/95 p-6 shadow-xl backdrop-blur-xl sm:p-8">
          {/* Header Branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-display font-black text-cream shadow-sm">
                CM
              </div>
              <div>
                <span className="font-display text-sm font-black uppercase tracking-wider text-brand">
                  ChamaMkononi
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "sw" ? "Chama ya Kila Mkenya" : "Digital Chama for Everyone"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLang(lang === "sw" ? "en" : "sw")}
                className="rounded-full border border-brand/20 bg-card px-2.5 py-1 text-[11px] font-bold text-brand shadow-sm transition hover:bg-brand/10"
              >
                {lang === "sw" ? "English" : "Kiswahili"}
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: "/" })}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                {lang === "sw" ? "Mwanzo" : "Home"}
              </button>
            </div>
          </div>

          {/* Email Confirmation Screen */}
          {sentConfirmEmail ? (
            <div className="mt-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl">
                ✉️
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                {lang === "sw" ? "Thibitisha Barua Pepe Yako" : "Verify Your Email"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? `Tumetuma kiungo cha kuthibitisha kwa ${email}. Tafadhali fungua kikasha chako kubonyeza kiungo ili uingie kwenye chama chako.`
                  : `We sent a confirmation link to ${email}. Please check your inbox and click the link to activate your account.`}
              </p>

              <button
                type="button"
                disabled={resending}
                onClick={handleResendConfirmation}
                className="w-full rounded-2xl bg-brand py-3 text-xs font-bold text-cream"
              >
                {resending
                  ? "Inatuma tena..."
                  : lang === "sw"
                    ? "Tuma Barua Pepe Tena"
                    : "Resend Verification Email"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSentConfirmEmail(false);
                  setAuthView("signin");
                }}
                className="text-xs font-bold text-brand hover:underline"
              >
                {lang === "sw" ? "Rudi Kwenye Kuingia" : "Back to Sign In"}
              </button>
            </div>
          ) : sentResetEmail ? (
            /* Reset Password Confirmation Screen */
            <div className="mt-6 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl">
                🔑
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                {lang === "sw" ? "Kiungo Kimetumwa!" : "Reset Link Sent!"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lang === "sw"
                  ? `Tumetuma maagizo ya kubadilisha nywila kwa ${email}. Fungua kiungo hicho kuweka nywila mpya.`
                  : `We sent password reset instructions to ${email}. Follow the email link to set your new password.`}
              </p>

              <button
                type="button"
                onClick={() => {
                  setSentResetEmail(false);
                  setAuthView("signin");
                }}
                className="w-full rounded-2xl bg-brand py-3 text-xs font-bold text-cream"
              >
                {lang === "sw" ? "Rudi Kwenye Kuingia" : "Back to Sign In"}
              </button>
            </div>
          ) : (
            /* Main Sign In / Sign Up Form */
            <>
              <div className="mt-6">
                <h1 className="font-display text-2xl font-black text-foreground">
                  {authView === "signup"
                    ? lang === "sw"
                      ? "Unda Akaunti Mpya"
                      : "Create Your Account"
                    : authView === "forgot"
                      ? lang === "sw"
                        ? "Umesahau Nywila?"
                        : "Reset Password"
                      : lang === "sw"
                        ? "Karibu Tena Kwenye Chama"
                        : "Welcome Back"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {authView === "signup"
                    ? lang === "sw"
                      ? "Fungua akaunti salama kuanzisha au kujiunga na chama chako."
                      : "Create a secure account to join or manage your chama."
                    : authView === "forgot"
                      ? lang === "sw"
                        ? "Weka barua pepe yako kupokea kiungo cha kuweka nywila mpya."
                        : "Enter your registered email to receive a password reset link."
                      : lang === "sw"
                        ? "Weka barua pepe na nywila yako kuendelea."
                        : "Enter your email and password to access your dashboard."}
                </p>
              </div>

              {/* Google OAuth Option */}
              {authView !== "forgot" ? (
                <div className="mt-5">
                  <button
                    type="button"
                    disabled={oauthBusy || busy}
                    onClick={handleGoogleSignIn}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3.5 font-display text-sm font-bold text-foreground shadow-sm transition hover:bg-muted/40 disabled:opacity-50"
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
                        ? lang === "sw"
                          ? "Inaunganisha na Google..."
                          : "Connecting Google..."
                        : lang === "sw"
                          ? "Endelea na Google"
                          : "Continue with Google"}
                    </span>
                  </button>

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="w-full border-t border-border"></div>
                    <span className="absolute bg-card px-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {lang === "sw" ? "au kwa barua pepe" : "or with email"}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Email Form */}
              <form onSubmit={submit} className="grid gap-3.5">
                {authView === "signup" ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        {lang === "sw" ? "Jina Lako Kamili *" : "Full Name *"}
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        placeholder="David Kimani au Sarah Akinyi"
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                        {lang === "sw" ? "Nambari ya Simu (M-Pesa)" : "Phone Number (M-Pesa)"}
                      </label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        type="tel"
                        autoComplete="tel"
                        placeholder="0722 000 000"
                        className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-mono"
                      />
                    </div>
                  </>
                ) : null}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                    {lang === "sw" ? "Barua Pepe *" : "Email Address *"}
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="mwanachama@mfano.co.ke"
                    className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                  />
                </div>

                {authView !== "forgot" ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {lang === "sw" ? "Nywila ya Siri *" : "Password *"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-muted-foreground hover:text-foreground font-medium"
                      >
                        {showPassword ? "Ficha" : "Onyesha"}
                      </button>
                    </div>

                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={authView === "signup" ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                    />

                    {/* Strong Password Indicator on Signup */}
                    {authView === "signup" && password ? (
                      <div className="mt-2.5 space-y-2 rounded-2xl border border-border bg-muted/20 p-3">
                        {/* Strength Bar */}
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">
                            {lang === "sw" ? "Kiwango cha Nywila:" : "Password Strength:"}
                          </span>
                          <span
                            className={
                              passwordScore <= 1
                                ? "text-red-500"
                                : passwordScore === 2
                                  ? "text-amber-500"
                                  : passwordScore === 3
                                    ? "text-blue-500"
                                    : "text-emerald-600"
                            }
                          >
                            {passwordScore <= 1
                              ? lang === "sw"
                                ? "Dhaifu (Weak)"
                                : "Weak"
                              : passwordScore === 2
                                ? lang === "sw"
                                  ? "Wastani (Fair)"
                                  : "Fair"
                                : passwordScore === 3
                                  ? lang === "sw"
                                    ? "Nzuri (Good)"
                                    : "Good"
                                  : lang === "sw"
                                    ? "Imara Sana (Strong)"
                                    : "Strong"}
                          </span>
                        </div>

                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              passwordScore <= 1
                                ? "w-1/4 bg-red-500"
                                : passwordScore === 2
                                  ? "w-2/4 bg-amber-500"
                                  : passwordScore === 3
                                    ? "w-3/4 bg-blue-500"
                                    : "w-full bg-emerald-600"
                            }`}
                          />
                        </div>

                        {/* Checklist */}
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <span
                            className={
                              passwordCriteria.minLength
                                ? "text-emerald-700 font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {passwordCriteria.minLength ? "✓" : "○"} Herufi 8+ (8+ chars)
                          </span>
                          <span
                            className={
                              passwordCriteria.hasUpper && passwordCriteria.hasLower
                                ? "text-emerald-700 font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {passwordCriteria.hasUpper && passwordCriteria.hasLower ? "✓" : "○"}{" "}
                            Kubwa na ndogo (A-z)
                          </span>
                          <span
                            className={
                              passwordCriteria.hasNumber
                                ? "text-emerald-700 font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {passwordCriteria.hasNumber ? "✓" : "○"} Nambari (0-9)
                          </span>
                          <span
                            className={
                              passwordCriteria.hasSpecial
                                ? "text-emerald-700 font-bold"
                                : "text-muted-foreground"
                            }
                          >
                            {passwordCriteria.hasSpecial ? "✓" : "○"} Alama maalum (!@#$)
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {authView === "signup" ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1">
                      {lang === "sw" ? "Thibitisha Nywila *" : "Confirm Password *"}
                    </label>
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm"
                    />
                  </div>
                ) : null}

                {authView === "signin" ? (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setAuthView("forgot")}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      {lang === "sw" ? "Umesahau nywila?" : "Forgot password?"}
                    </button>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={busy || oauthBusy || (authView === "signup" && !isPasswordStrong)}
                  className="mt-2 w-full rounded-2xl bg-brand py-3.5 font-display text-sm font-extrabold text-cream shadow-md transition hover:opacity-95 disabled:opacity-50"
                >
                  {busy
                    ? lang === "sw"
                      ? "Inachakata..."
                      : "Processing..."
                    : authView === "signup"
                      ? lang === "sw"
                        ? "Unda Akaunti Yangu"
                        : "Create Account"
                      : authView === "forgot"
                        ? lang === "sw"
                          ? "Tuma Kiungo cha Nywila"
                          : "Send Reset Link"
                        : lang === "sw"
                          ? "Ingia Kwenye Chama"
                          : "Sign In"}
                </button>
              </form>

              {/* Mode Switcher */}
              <div className="mt-5 text-center">
                {authView === "signin" ? (
                  <p className="text-xs text-muted-foreground">
                    {lang === "sw" ? "Huna akaunti bado? " : "Don't have an account? "}
                    <button
                      type="button"
                      onClick={() => setAuthView("signup")}
                      className="font-bold text-brand hover:underline"
                    >
                      {lang === "sw" ? "Jisajili hapa" : "Sign up here"}
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {lang === "sw" ? "Una akaunti tayari? " : "Already have an account? "}
                    <button
                      type="button"
                      onClick={() => setAuthView("signin")}
                      className="font-bold text-brand hover:underline"
                    >
                      {lang === "sw" ? "Ingia hapa" : "Sign in here"}
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
