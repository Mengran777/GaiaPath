"use client"; // This is a client-side component because it handles user interaction and state

import React, { useState } from "react";
import { useRouter } from "next/navigation"; // Import Next.js router
import { setAuthToken } from "@/lib/auth-client"; // Import client-side auth helper
import Input from "@/components/UI/Input"; // Import Input component
import Section from "@/components/Layout/Section"; // Import Section component

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter(); // Initialize the router

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setError(null); // Clear previous errors
    setLoading(true); // Enable loading state

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // After successful registration, auto-login
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
          setAuthToken(loginData.token, loginData.user.id); // Store token and user ID
          alert("Registration successful and logged in!");
          router.push("/"); // Redirect to home page
        } else {
          setError(
            loginData.error ||
              "Automatic login failed. Please try logging in manually."
          );
        }
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch (err) {
      console.error("Registration request failed:", err);
      setError("Network error or server is not responding.");
    } finally {
      setLoading(false); // Disable loading state
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4">
      <Section title="Register a new account" className="w-full max-w-md">
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
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
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold text-lg
              transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl
              ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-blue-600 to-purple-600 hover:scale-[1.01]"
              }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600 text-sm">
          Already have an account?
          <button
            onClick={() => router.push("/auth/login")}
            className="text-blue-600 hover:underline ml-1"
          >
            Log in now
          </button>
        </p>
      </Section>
    </div>
  );
};

export default RegisterPage;
