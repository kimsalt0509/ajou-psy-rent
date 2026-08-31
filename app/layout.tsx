import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "심리학과 학생회 대여",
  description: "과방 물품 남은 수량 확인, 대여·반납 기록",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${noto.className} h-full antialiased`}>
      <body className="min-h-full bg-[#f3f3f3] text-black">
        <FirebaseAuthProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
            {children}
          </main>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
