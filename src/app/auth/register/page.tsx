"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Check, Loader2 } from "lucide-react";
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
          className={`flex items-center gap-1.5 text-xs transition-colors ${met ? "text-brand-700" : "text-ink-muted"}`}
        >
          <Check size={13} strokeWidth={2.5} className={met ? "opacity-100" : "opacity-25"} aria-hidden="true" />
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
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (result?.ok) {
          window.location.href = "/";
        } else {
          setError("Account created. Please log in.");
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
      <h1 className="font-display text-3xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 mb-8 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-brand-700 hover:text-brand-900 hover:underline">
          Log in
        </Link>
      </p>

      <GoogleButton disabled={loading} />

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-ink-soft mb-1.5">
            Username
          </label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. mona_travels"
            required
            disabled={loading}
            autoComplete="username"
          />
          <p className="mt-1.5 text-xs text-ink-muted">3–20 characters: letters, numbers or underscores.</p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink-soft mb-1.5">
            Email
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
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-1.5">
            Password
          </label>
          <PasswordInput
            id="password"
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
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-brand-900 text-white font-semibold
                     hover:bg-brand-700 transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterPage;
