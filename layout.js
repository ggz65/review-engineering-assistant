export const metadata = {
  title: "Review Engineering Assistant",
  description: "Turn a real client experience into a thoughtful, specific review request."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
