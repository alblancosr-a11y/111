import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Tajawal, Amiri, Reem_Kufi } from 'next/font/google';
import "./globals.css";

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800'],
  variable: '--font-tajawal',
});

const amiri = Amiri({
  subsets: ['arabic'],
  weight: ['400', '700'],
  variable: '--font-amiri',
});

const reemKufi = Reem_Kufi({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-reem-kufi',
});

export const metadata: Metadata = {
  title: "مَدَارِج — حفظ القصائد العربية",
  description: "تطبيق حفظ القصائد العربية بالتكرار المتباعد",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مَدَارِج",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${amiri.variable} ${reemKufi.variable}`}>
      <body className="app-bg">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
