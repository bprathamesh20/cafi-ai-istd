import "@livekit/components-styles";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "../stack";
import "./globals.css";
import { Public_Sans } from "next/font/google";

const publicSans400 = Public_Sans({
  weight: "400",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark h-full ${publicSans400.className}`}>
      <body className="h-full"><StackProvider app={stackServerApp}><StackTheme>{children}</StackTheme></StackProvider></body>
    </html>
  );
}
