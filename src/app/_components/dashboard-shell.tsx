import Sidebar from "./sidebar";

export default function DashboardShell({
  children,
  leagueId,
}: {
  children: React.ReactNode;
  leagueId?: string;
}) {
  return (
    <div className="min-h-screen p-5 md:p-7">
      <div className="mx-auto flex max-w-[1600px] gap-6">
        <Sidebar leagueId={leagueId} />

        <main className="min-w-0 flex-1">
          {children}
        </main>

      </div>
    </div>
  );
}