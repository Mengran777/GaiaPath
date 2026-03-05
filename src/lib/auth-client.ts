// src/lib/auth-client.ts

/**
 * Remove a specified cookie
 */
function removeCookie(name: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; ${
    process.env.NODE_ENV === "production" ? "Secure;" : ""
  }`;
}

/**
 * Clear authentication cookies on client side (call after server logout)
 */
export function removeAuthToken(): void {
  try {
    removeCookie("authToken");
  } catch (error) {
    console.error("Error removing auth token from cookies:", error);
  }
}
