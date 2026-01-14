import { Sidebar } from "@/components/sidebar";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with user */}
        <header className="h-14 border-b border-border flex items-center justify-end px-6">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
