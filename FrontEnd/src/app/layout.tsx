import "./globals.css";
import React from "react";

export const metadata = {
  title: "Shared List-Builder",
  description: "Collaborative Smart List Builder for Delivery",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
}
