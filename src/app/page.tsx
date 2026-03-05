// src/app/page.tsx
// Important: Remove the "use client" directive! Make it a default Server Component

import App from "./App"; // Import the App component

/**
 * This is the main page component for the Next.js application.
 * After middleware handles authentication and redirects, this component always renders <App />.
 */
export default function HomePage() {
  // Logic here runs server-side, not dependent on client-specific localStorage or window objects
  // Since auth redirects are handled by middleware, no need to worry about unauthenticated users here
  return <App />;
}
