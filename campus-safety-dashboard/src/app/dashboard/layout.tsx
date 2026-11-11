import DashboardHeader from "@/components/layout/DashboardHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative">
      <DashboardHeader />
      <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 w-full">
        {children}
      </main>
    </div>
  );
}
