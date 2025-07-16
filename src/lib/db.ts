// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

// Declare a global variable to store the PrismaClient instance.
// This prevents multiple PrismaClient instances from being created in development mode
// due to Next.js's Fast Refresh, which can lead to connection issues.
declare global {
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

// In production, create a new PrismaClient instance.
// In development, reuse the global instance if it already exists to prevent excessive connections.
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma; // This line is crucial for it to be recognized as a module
