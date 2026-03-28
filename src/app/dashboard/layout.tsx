import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { ChatWidget } from "@/components/chat/chat-widget";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="flex h-screen md:overflow-hidden" style={{ background: "var(--cream)" }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto w-full"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 100% 0%, rgba(248,170,64,0.18) 0%, transparent 60%)," +
            "radial-gradient(ellipse 60% 50% at 0% 100%, rgba(77,193,234,0.10) 0%, transparent 55%)," +
            "var(--cream)",
        }}
      >
        <div className="p-4 pb-24 md:p-8 md:pb-8">{children}</div>
      </main>
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
