// src/lib/auth-client.ts

// Define the localStorage key for storing the JWT Token
const AUTH_TOKEN_KEY = "authToken";
const USER_ID_KEY = "userId"; // Store user ID for frontend use

/**
 * Stores the JWT Token and user ID in localStorage.
 * @param token JWT Token string
 * @param userId User ID string
 */
export function setAuthToken(token: string, userId: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_ID_KEY, userId);
    console.log("Auth Token and User ID saved to localStorage.");
  } catch (error) {
    console.error("Error saving auth token to localStorage:", error);
    // You might want to add more user-friendly error handling here
  }
}

/**
 * Retrieves the JWT Token from localStorage.
 * @returns JWT Token string or null (if not found)
 */
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting auth token from localStorage:", error);
    return null;
  }
}

/**
 * Retrieves the user ID from localStorage.
 * @returns User ID string or null (if not found)
 */
export function getUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.error("Error getting user ID from localStorage:", error);
    return null;
  }
}

/**
 * Removes the JWT Token and user ID from localStorage (used for logout).
 */
export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    console.log("Auth Token and User ID removed from localStorage.");
  } catch (error) {
    console.error("Error removing auth token from localStorage:", error);
  }
}

/**
 * Checks if the user is authenticated (by checking for the presence of a Token).
 * @returns True if a Token exists, false otherwise
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}
