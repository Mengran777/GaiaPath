// RootLayout.tsx
// Location: src/app/layout.tsx
import "./globals.css";
// import "./styles/App.css"; // From extracted HTML template
import Header from "@/components/Header/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-indigo-400 to-purple-500 text-gray-800">
        {children}
      </body>
    </html>
  );
}
