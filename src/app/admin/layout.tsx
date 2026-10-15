import { Logo } from "@/components/shell/logo";

// Internal ops console (S21). Served only on the admin host once ADMIN_HOST is set (see src/proxy.ts); staff SSO,
// two-factor login and the IP allow-list arrive in Part 10.
export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center gap-3 bg-[#1b2421] px-4 py-3.5 sm:px-6">
        <Logo tone="light" href="/admin" />
        <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-[#1b2421]">Internal</span>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
