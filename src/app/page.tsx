// src/app/page.tsx
// Important: Remove the "use client" directive! Make it a default Server Component

import App from "./App"; // Import the App component

/**
 * The planner. Open to everyone: signed-out visitors use it as guests and are
 * asked to create an account only when they save a trip.
 */
export default function HomePage() {
  return <App />;
}
