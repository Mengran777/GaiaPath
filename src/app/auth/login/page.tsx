"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Input from "@/components/UI/Input";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ─── Brand Panel Data ──────────────────────────────────────────────────────────

const destinations: {
  emoji: string; label: string; top: string;
  left?: string; right?: string; delay: string;
}[] = [
  { emoji: "🗼", label: "Paris, France",    top: "20%", left:  "5%",  delay: "0s"   },
  { emoji: "🏯", label: "Kyoto, Japan",     top: "40%", right: "5%",  delay: "2s"   },
  { emoji: "🌴", label: "Bali, Indonesia",  top: "62%", right: "5%",  delay: "1s"   },
  { emoji: "🏰", label: "Lisbon, Portugal", top: "80%", left:  "5%",  delay: "2.8s" },
  { emoji: "🗺️", label: "Cape Town, SA",   top: "30%", left:  "38%", delay: "1.6s" },
];

const features: { emoji: string; text: string }[] = [
  { emoji: "✈️", text: "AI-generated personalised routes"       },
  { emoji: "🗺️", text: "Interactive maps with real locations"   },
  { emoji: "⭐", text: "Save & revisit favourite itineraries"   },
  { emoji: "📷", text: "Real photos for every activity"         },
];

// ─── Brand Panel ──────────────────────────────────────────────────────────────

const BrandPanel = () => (
  <div className="hidden lg:flex flex-col justify-between h-full min-h-screen px-12 py-14 bg-gradient-to-br from-[#071f1a] to-[#0d3d30] relative overflow-hidden">

    {/* Floating destination tags */}
    {destinations.map((d) => (
      <div
        key={d.label}
        className="animate-float absolute text-[11px] px-3 py-1.5 rounded-full select-none pointer-events-none whitespace-nowrap"
        style={{
          top: d.top,
          ...(d.left ? { left: d.left } : { right: d.right }),
          animationDelay: d.delay,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.11)",
          color: "rgba(255,255,255,0.40)",
        }}
      >
        {d.emoji} {d.label}
      </div>
    ))}

    {/* ── Top: Logo ── */}
    <div className="relative z-10">
      <div className="text-[1.7rem] font-extrabold text-white flex items-center gap-2">
        <span>🌍</span>
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-emerald-200">
          Gaia
        </span>
      </div>
    </div>

    {/* ── Middle: Headline + Features ── */}
    <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
      <div className="space-y-7">
        <div>
          <h2 className="font-display text-[2.1rem] font-bold text-white leading-tight">
            Plan your journey,
            <br />
            <em className="text-[#c9a96e] italic font-display">effortlessly.</em>
          </h2>
          <p className="mt-3 text-slate-400 text-sm leading-relaxed">
            AI-powered travel itineraries tailored to you.
            <br />
            From hidden gems to iconic landmarks.
          </p>
        </div>

        <ul className="space-y-3">
          {features.map((f) => (
            <li key={f.text} className="flex items-center gap-3">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                {f.emoji}
              </span>
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>

  </div>
);

// ─── Login Page ───────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please fill all boxes");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.ok) {
        window.location.href = "/";
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError("Network error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1a17] p-6 lg:p-12">
      <div
        className="w-full max-w-5xl flex rounded-3xl overflow-hidden"
        style={{ boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }}
      >

      {/* Left brand panel */}
      <div className="lg:w-1/2">
        <BrandPanel />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center bg-[#f5f2ee] px-8 py-12">
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="text-3xl font-extrabold inline-flex items-center gap-2">
              <span>🌍</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-600">
                Gaia
              </span>
            </div>
          </div>

          {/* Heading + inline nav */}
          <div className="mb-7">
            <h1 className="font-display text-[1.9rem] font-bold text-gray-900 leading-tight">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => router.push("/auth/register")}
                className="text-teal-700 hover:text-teal-900 font-medium hover:underline transition-colors"
                disabled={loading}
              >
                Register now
              </button>
            </p>
          </div>

          {/* Google login */}
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-300/60" />
            <span className="text-xs text-gray-400">or continue with email</span>
            <div className="flex-1 h-px bg-gray-300/60" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                autoComplete="email"
                className="focus:!border-teal-500 focus:!ring-teal-500/15"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="pr-11 focus:!border-teal-500 focus:!ring-teal-500/15"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-teal-700 hover:text-teal-900 hover:underline transition-colors">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl text-white font-semibold text-base mt-1
                transition-all duration-200 ease-in-out shadow-sm
                focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2
                ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#0d3d30] hover:bg-[#0a3028] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>

        </div>
      </div>
      </div>  {/* card wrapper */}
    </div>
  );
};

export default LoginPage;
