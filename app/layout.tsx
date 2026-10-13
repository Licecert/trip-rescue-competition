import "./globals.css";

export const metadata = {
  title: "Trip Rescue",
  description: "Real-time travel recovery agent for disrupted trips in China"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
