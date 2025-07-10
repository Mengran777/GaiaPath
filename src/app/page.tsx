"use client"; // This directive marks the file as a Client Component

import React from "react";
import App from "./App"; // Adjust the import path based on where your App.tsx is located

/**
 * This is the main page component for your Next.js application.
 * It serves as the entry point for the root route ('/').
 * It renders the core 'App' component which contains your travel assistant UI and logic.
 */
const HomePage: React.FC = () => {
  return (
    // The App component contains all your main UI and application logic.
    // Ensure your App.tsx is correctly set up and exported as default.
    <App />
  );
};

export default HomePage;
