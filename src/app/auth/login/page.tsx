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
      <h1 className="font-display text-[40px] leading-[1.06] text-ink uppercase">Welcome back</h1>
      <p className="mt-4 mb-10 text-sm text-ink-muted">
        New to Gaia?{" "}
        <Link href="/auth/register" className="text-ink underline underline-offset-4 decoration-ink/30 hover:decoration-ink transition-colors">
          Create an account
        </Link>
      </p>

      <GoogleButton disabled={loading} />

      <form onSubmit={handleLogin} className="space-y-6">
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
            placeholder="Your password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
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
          {loading ? "Logging in…" : "Log in"}
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

export default LoginPage;
