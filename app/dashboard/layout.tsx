import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#eef8fc_0%,#ffffff_48%,#fff9e6_100%)]">
      <DashboardHeader />
      {children}
    </div>
  );
}
