// src/lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// Define the JWT secret key.
// In a production environment, this should be a strong, randomly generated string
// stored securely in environment variables (e.g., process.env.JWT_SECRET).
const JWT_SECRET =
  process.env.JWT_SECRET || "your_super_secret_jwt_key_please_change_this";
const TOKEN_EXPIRATION = "1h"; // Token expiration time, e.g., 1 hour

/**
 * Hashes a plain text password.
 * @param password The plain text password.
 * @returns The hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
  return bcrypt.hash(password, salt); // Hash the password with the generated salt
}

/**
 * Compares a plain text password with a hashed password.
 * @param password The plain text password.
 * @param hashedPassword The hashed password to compare against.
 * @returns True if the passwords match, false otherwise.
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generates a JSON Web Token (JWT) for a given user ID.
 * @param userId The ID of the user for whom the token is generated.
 * @returns The generated JWT string.
 */
export function generateToken(userId: string): string {
  // Sign the token with the user ID payload and the secret key, setting an expiration time.
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
}

/**
 * Verifies a JWT token and extracts the user ID from its payload.
 * @param token The JWT string to verify.
 * @returns The user ID if the token is valid, otherwise null.
 */
export function verifyToken(token: string): string | null {
  try {
    // Verify the token using the secret key. The decoded payload is cast to an object with userId.
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId; // Return the user ID from the decoded token
  } catch (error) {
    // Log any errors during token verification (e.g., expired, invalid signature).
    console.error("Token verification failed:", error);
    return null; // Return null if verification fails
  }
}

/**
 * Authenticates an incoming request by verifying the Authorization header.
 * @param request The Next.js Request object.
 * @returns An object containing the userId if authentication is successful, otherwise null.
 */
export function authenticateRequest(
  request: Request
): { userId: string } | null {
  // Get the Authorization header from the request.
  const authHeader = request.headers.get("Authorization");

  // Check if the header exists and starts with 'Bearer '.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null; // If not, authentication fails.
  }

  // Extract the token part (after 'Bearer ').
  const token = authHeader.split(" ")[1];

  // Verify the token to get the user ID.
  const userId = verifyToken(token);

  // If userId is not obtained (token invalid or expired), authentication fails.
  if (!userId) {
    return null;
  }

  // If authentication is successful, return the userId.
  return { userId };
}
