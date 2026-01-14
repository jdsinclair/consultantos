// Minimal layout for shareable/embeddable pages (no navigation, no sidebar)
export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
