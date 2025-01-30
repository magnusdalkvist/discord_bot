import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
// import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discord Soundboard",
  description: "An overview of the sounds available on the Discord soundboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <SidebarProvider>
            <AppSidebar user={session?.user} />
            <SidebarInset>
              <header className="flex justify-between h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  {/* {breadcrumbs && (
                                <>
                                <Separator orientation="vertical" className="mr-2 h-4" />
                                <Breadcrumb>
                                <BreadcrumbList>
                                {breadcrumbs[0] && (
                                  <BreadcrumbItem className="hidden md:block">
                                  <BreadcrumbLink href={`/${breadcrumbs[0]}`}>
                                  {breadcrumbs[0]}
                                  </BreadcrumbLink>
                                  </BreadcrumbItem>
                                  )}
                                  {breadcrumbs[1] && (
                                    <>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                    <BreadcrumbPage>{breadcrumbs[1]}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                    </>
                                    )}
                                    </BreadcrumbList>
                                    </Breadcrumb>
                                    </>
                                    )} */}
                </div>
              </header>
              <div className="flex flex-1 flex-col p-4 pt-0 container mx-auto">
                {children}
                <Toaster />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
