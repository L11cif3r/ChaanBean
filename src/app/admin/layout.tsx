import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-switch";

// Internal ops console (S21). Served only on the admin host once ADMIN_HOST is set (see src/proxy.ts); staff SSO,
// two-factor login and the IP allow-list arrive in Part 10.
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center gap-3 border-b border-border bg-[var(--nav-bg)] px-4 backdrop-blur-md sm:px-6">
        <Logo href="/admin" tagline={false} />
        <span className="rounded-full border border-primary-line bg-primary-soft px-2.5 py-0.5 font-mono text-xs font-bold text-primary-text">Internal</span>
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
