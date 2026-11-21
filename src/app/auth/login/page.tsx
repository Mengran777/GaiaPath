"use client";

import React, { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/Auth/AuthLayout";
import GoogleButton from "@/components/Auth/GoogleButton";
import Input from "@/components/UI/Input";
import PasswordInput from "@/components/UI/PasswordInput";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password.");
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
        setError("Invalid email or password.");
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold text-ink">Welcome back</h1>
      <p className="mt-2 mb-8 text-sm text-ink-muted">
        New to Gaia?{" "}
        <Link href="/auth/register" className="font-medium text-brand-700 hover:text-brand-900 hover:underline">
          Create an account
        </Link>
      </p>

      <GoogleButton disabled={loading} />

      <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="Your password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
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
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
