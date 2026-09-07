import DashboardShell from "src/app/_components/dashboard-shell";
import Card from "src/app/_components/ui/card";

type RouteLoadingProps = {
  leagueId?: string;
  title?: string;
  description?: string;
};

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={["animate-pulse rounded-full bg-white/10", className].join(" ")} />;
}

function LoadingContent({ title = "Caricamento", description = "Sto preparando i dati della pagina." }: Omit<RouteLoadingProps, "leagueId">) {
  return (
    <div className="space-y-5 pb-8 pt-2">
      <Card>
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--accent)]">{title}</p>
          <SkeletonLine className="h-8 w-2/3 max-w-[420px]" />
          <p className="max-w-md text-sm text-[var(--muted)]">{description}</p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <Card key={item} variant="inner">
            <SkeletonLine className="h-5 w-24" />
            <SkeletonLine className="mt-4 h-9 w-3/4" />
            <SkeletonLine className="mt-3 h-4 w-full" />
            <SkeletonLine className="mt-2 h-4 w-5/6" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function RouteLoading(props: RouteLoadingProps) {
  if (props.leagueId) {
    return (
      <DashboardShell leagueId={props.leagueId}>
        <LoadingContent title={props.title} description={props.description} />
      </DashboardShell>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <LoadingContent title={props.title} description={props.description} />
    </div>
  );
}
