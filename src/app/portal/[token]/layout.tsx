// Minimal layout for client portal - no navigation, no authentication required
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
