// src/lib/auth-client.ts

/**
 * 获取指定 cookie 的值
 */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift() || null;
    try {
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    } catch (e) {
      console.error(`Error decoding cookie ${name}:`, e);
      return null;
    }
  }
  return null;
}

/**
 * 设置 cookie
 */
function setCookie(name: string, value: string, maxAge: number = 3600): void {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax; ${
    process.env.NODE_ENV === "production" ? "Secure;" : ""
  }`;
}

/**
 * 删除指定的 cookie
 */
function removeCookie(name: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; ${
    process.env.NODE_ENV === "production" ? "Secure;" : ""
  }`;
}

/**
 * 存储认证信息（现在使用 cookies 而不是 localStorage）
 */
export function setAuthToken(token: string, userId: string): void {
  try {
    setCookie("authToken", token);
    setCookie("userId", userId);
    console.log("Auth Token and User ID saved to cookies.");
  } catch (error) {
    console.error("Error saving auth token to cookies:", error);
  }
}

/**
 * 获取认证 token
 */
export function getAuthToken(): string | null {
  try {
    return getCookie("authToken");
  } catch (error) {
    console.error("Error getting auth token from cookies:", error);
    return null;
  }
}

/**
 * 获取用户 ID
 */
export function getUserId(): string | null {
  try {
    return getCookie("userId");
  } catch (error) {
    console.error("Error getting user ID from cookies:", error);
    return null;
  }
}

/**
 * 清除认证信息（登出）
 */
// auth-client.ts
export function removeAuthToken(): void {
  try {
    removeCookie("authToken");
    removeCookie("userId");
    removeCookie("isLoggedIn"); // 添加这行
    console.log("Auth Token and User ID removed from cookies.");
  } catch (error) {
    console.error("Error removing auth token from cookies:", error);
  }
}

/**
 * 检查用户是否已认证
 */
export function isAuthenticated(): boolean {
  return getCookie("isLoggedIn") === "true";
}
