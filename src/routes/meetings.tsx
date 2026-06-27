import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { Navbar } from "@/components/zoom/Navbar";
import { MeetingCard, type Meeting } from "@/components/zoom/MeetingCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/meetings.functions";

export const Route = createFileRoute("/meetings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meetings — Zoom Clone" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
  const { ready, userId } = useEnsureSession();
  const dashboardFn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => dashboardFn(),
    enabled: ready && !!userId,
  });

  const all: Meeting[] = [...(data?.upcoming ?? []), ...(data?.recent ?? [])] as Meeting[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="You" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">All your upcoming and recent meetings.</p>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Upcoming</h2>
          {isLoading ? (
            <Grid><SkelCards /></Grid>
          ) : (data?.upcoming ?? []).length === 0 ? (
            <Empty text="No upcoming meetings." />
          ) : (
            <Grid>
              {(data!.upcoming as Meeting[]).map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="upcoming" />
              ))}
            </Grid>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Recent</h2>
          {isLoading ? (
            <Grid><SkelCards /></Grid>
          ) : (data?.recent ?? []).length === 0 ? (
            <Empty text="No recent meetings yet." />
          ) : (
            <Grid>
              {(data!.recent as Meeting[]).map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="recent" />
              ))}
            </Grid>
          )}
        </section>

        {!isLoading && all.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">Start or schedule one from the Home page.</p>
        )}
      </main>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
function SkelCards() {
  return <>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}</>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">{text}</div>;
}
