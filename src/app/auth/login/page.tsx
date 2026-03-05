"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/UI/Input";
import Section from "@/components/Layout/Section";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic frontend validation
    if (!email || !password) {
      setError("Please fill all boxes");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Note: No need to call setAuthToken now, server already sets cookies
        console.log("Login succeed, user info:", data.user);

        // Force page reload to update auth state
        window.location.href = "/";
      } else {
        setError(
          data.error || "Login failed, please check your email and password"
        );
      }
    } catch (err) {
      console.error("Login request failed:", err);
      setError("Internet server error, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4">
      <Section title="Login" className="w-full max-w-md">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Please enter your email address"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Please enter your password"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold text-lg
              transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed transform-none"
                  : "bg-gradient-to-br from-blue-600 to-purple-600 hover:scale-[1.01] active:scale-[0.99]"
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600 text-sm">
          Don't have an account?
          <button
            onClick={() => router.push("/auth/register")}
            className="text-blue-600 hover:text-blue-800 hover:underline ml-1 font-medium transition-colors"
            disabled={loading}
          >
            Register now
          </button>
        </p>
      </Section>
    </div>
  );
};

export default LoginPage;
