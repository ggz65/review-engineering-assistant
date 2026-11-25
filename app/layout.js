import "./dashboard.css";

export const metadata = {
  title: "Review Engineering Assistant",
  description: "Turn a real client experience into a thoughtful, specific review request.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/review-engineering-logo.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }]
  },
  appleWebApp: { title: "Review Assistant" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
