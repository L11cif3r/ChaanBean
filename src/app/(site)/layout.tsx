// The public landing page at / (the marketing look, .site), outside the signed-in portal.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className="site relative isolate flex min-h-dvh flex-col">{children}</div>;
}
