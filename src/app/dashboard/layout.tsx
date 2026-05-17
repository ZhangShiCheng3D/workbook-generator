"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LogOut,
  User,
  Settings,
  PlusCircle,
  Menu,
  Sparkles,
  ChevronRight,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/auth/browser";
import { Sidebar, SidebarNav, SidebarBrand } from "@/components/dashboard/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/stores/user-store";

/** Map path segments to human-readable labels */
const pathLabelMap: Record<string, string> = {
  dashboard: "Dashboard",
  generate: "Generate New",
  workbook: "Workbook",
  settings: "Settings",
};

/** Build breadcrumb segments from the current pathname */
function useBreadcrumbs(): { label: string; href: string }[] {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = pathLabelMap[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);

    crumbs.push({ label, href });
  }

  return crumbs;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  // Hydrate user-store from Supabase session on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? '',
          name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? null,
          plan: 'free',
          role: 'teacher',
        });
      }
    });
  }, [setUser]);

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'User';
  const displayEmail = user?.email ?? '';
  const avatarInitial = (displayName[0] || 'U').toUpperCase();

  const breadcrumbs = useBreadcrumbs();
  const showBreadcrumbs = breadcrumbs.length > 1;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Determine page title from pathname
  const pageTitle = (() => {
    if (pathname === "/dashboard") return "My Workbooks";
    if (pathname.startsWith("/dashboard/generate")) return "Generate New Workbook";
    if (pathname.startsWith("/dashboard/workbook")) return "Workbook Viewer";
    if (pathname.startsWith("/dashboard/settings")) return "Settings";
    return "Dashboard";
  })();

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="left" className="w-64 p-0" showCloseButton>
          <SidebarBrand collapsed={false} />
          <SidebarNav collapsed={false} />
          {/* Quick action in mobile sidebar */}
          <div className="border-t p-3">
            <Link
              href="/dashboard/generate"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              onClick={() => setMobileSheetOpen(false)}
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              New Workbook
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMobileSheetOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          {/* Page title (hidden on mobile when breadcrumbs visible) */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate hidden sm:block">
              {pageTitle}
            </h1>
            <h1 className="text-base font-semibold text-foreground truncate sm:hidden">
              {pageTitle}
            </h1>
          </div>

          {/* New Workbook quick action */}
          <Button
            render={<Link href="/dashboard/generate" />}
            size="sm"
            className="hidden md:inline-flex shrink-0"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
            New Workbook
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  aria-label="User menu"
                />
              }
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {displayEmail}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/dashboard/settings" className="flex cursor-pointer items-center" />}
              >
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Breadcrumbs */}
        {showBreadcrumbs && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 px-4 pt-3 text-sm text-muted-foreground lg:px-6"
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={crumb.href} className="flex items-center gap-1.5">
                  {index > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {index === 0 && (
                    <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  )}
                  {isLast ? (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
