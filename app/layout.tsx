import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { AppHeader } from "@/components/AppHeader";
import { FirebaseAuthProvider } from "@/components/FirebaseAuthProvider";
import { isAdmin } from "@/lib/admin";
import { CONTACT } from "@/lib/config";
import "./globals.css";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "심리학과 학생회 대여",
  description: "과방 물품 남은 수량 확인, 대여·반납 기록",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const admin = await isAdmin();
  return (
    <html lang="ko" className={`${noto.className} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <FirebaseAuthProvider>
          <AppHeader isAdmin={admin} />
          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
          <footer className="w-full border-t border-black/8 bg-background px-4 py-4">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              사이트에 문제가 생기면 {CONTACT.label}{" "}
              <a href={`tel:${CONTACT.phone.replace(/\D/g, "")}`} className="underline hover:text-gray-600">
                {CONTACT.phone}
              </a>
              으로 연락 부탁드립니다.
            </p>
          </footer>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
