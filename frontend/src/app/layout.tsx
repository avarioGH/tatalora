import type { Metadata } from"next";
import { Inter } from"next/font/google";
import"./globals.css";
import { ThemeProvider } from"@/components/theme-provider";
import { AuthWrapper } from"@/components/auth-wrapper";
import { LanguageProvider } from"@/contexts/LanguageContext";
import { Toaster } from "sonner";
import AiAssistant from"@/components/AiAssistant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
 title:"TATALORA",
 description:"Enterprise SaaS ERP",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning>
 <body className={inter.className} suppressHydrationWarning>
 <ThemeProvider
 attribute="class"
 defaultTheme="system"
 enableSystem
 disableTransitionOnChange
 >
 <LanguageProvider>
 <AuthWrapper>
 {children}
 <AiAssistant />
 </AuthWrapper>
<Toaster richColors position="top-right" />
 </LanguageProvider>
 </ThemeProvider>
 </body>
 </html>
 );
}

