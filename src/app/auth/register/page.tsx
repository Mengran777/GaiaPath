"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import Lozenge from "@/components/UI/Lozenge";
import AuthLayout from "@/components/Auth/AuthLayout";
import GoogleButton from "@/components/Auth/GoogleButton";
import Input from "@/components/UI/Input";
import PasswordInput from "@/components/UI/PasswordInput";

// Mirrors the server-side checks in /api/auth/register
const passwordRules: { label: string; test: (pwd: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "Upper and lowercase letters", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

const PasswordRules = ({ password }: { password: string }) => (
  <ul className="mt-2 space-y-1">
    {passwordRules.map(({ label, test }) => {
      const met = test(password);
      return (
        <li
          key={label}
          className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-ink" : "text-ink-muted"}`}
        >
          <Lozenge outline={!met} className="w-[8px] h-[8px] flex-none" />
          {label}
        </li>
      );
    })}
  </ul>
);

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        const result = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
        });
        if (result?.ok) {
          window.location.href = "/";
        } else {
          window.location.href = "/auth/login";
        }
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration request failed:", err);
      setError("Network error or server is not responding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-[40px] leading-[1.06] text-ink uppercase">Create your account</h1>
      <p className="mt-4 mb-10 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink transition-colors">
          Log in
        </Link>
      </p>

      <GoogleButton disabled={loading} />

      <form onSubmit={handleRegister} className="space-y-6">
        <div>
          <label htmlFor="username" className="eyebrow block">
            Username
          </label>
          <Input
            id="username"
            name="username"
            type="text"
            spellCheck={false}
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="mona_travels"
            required
            disabled={loading}
            autoComplete="username"
          />
          <p className="mt-2 text-xs text-ink-muted">3–20 characters: letters, numbers or underscores.</p>
        </div>

        <div>
          <label htmlFor="email" className="eyebrow block">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="eyebrow block">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <PasswordRules password={password} />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-ink w-full mt-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-center">
        <Link href="/" className="link-quiet text-[13px]">
          Continue without an account
        </Link>
      </p>
    </AuthLayout>
  );
};

export default RegisterPage;
