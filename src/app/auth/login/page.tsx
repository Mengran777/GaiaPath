"use client"; // 这是一个客户端组件

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/auth-client"; // 导入客户端认证辅助函数
import Input from "@/components/UI/Input"; // 导入 Input 组件
import Section from "@/components/Layout/Section"; // 导入 Section 组件

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

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthToken(data.token, data.user.id); // 存储 Token 和用户ID
        router.refresh();
        router.push("/"); // 登录成功后跳转到主页
      } else {
        setError(
          data.error || "Login failed. Please check your email and password."
        );
      }
    } catch (err) {
      console.error("登录请求失败:", err);
      setError("网络错误或服务器无响应。");
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
            {loading ? "login..." : "login"}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600 text-sm">
          Have not got an account?
          <button
            onClick={() => router.push("/auth/register")}
            className="text-blue-600 hover:underline ml-1"
          >
            register now!
          </button>
        </p>
      </Section>
    </div>
  );
};

export default LoginPage;
