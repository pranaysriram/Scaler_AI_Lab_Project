import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, LogIn, CalendarPlus, ScreenShare, Video } from "lucide-react";

import { useEnsureSession } from "@/hooks/use-ensure-session";
import { Navbar } from "@/components/zoom/Navbar";
import { MeetingCard, type Meeting } from "@/components/zoom/MeetingCard";
import { JoinModal } from "@/components/zoom/JoinModal";
import { ScheduleModal } from "@/components/zoom/ScheduleModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createInstantMeeting, getDashboard } from "@/lib/meetings.functions";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Home — Zoom Clone" }, { name: "description", content: "Your meetings dashboard." }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { ready, userId } = useEnsureSession();
  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dashboardFn = useServerFn(getDashboard);
  const instantFn = useServerFn(createInstantMeeting);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => dashboardFn(),
    enabled: ready && !!userId,
  });

  const instant = useMutation({
    mutationFn: () => instantFn(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/room/$code", params: { code: res.meetingCode } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to start meeting"),
  });

  const tiles: Array<{ label: string; icon: typeof Plus; color: string; onClick: () => void }> = [
    { label: "New Meeting", icon: Video, color: "bg-zoom-orange hover:bg-zoom-orange-hover", onClick: () => instant.mutate() },
    { label: "Join", icon: LogIn, color: "bg-primary hover:bg-primary/90", onClick: () => setJoinOpen(true) },
    { label: "Schedule", icon: CalendarPlus, color: "bg-primary hover:bg-primary/90", onClick: () => setScheduleOpen(true) },
    { label: "Share Screen", icon: ScreenShare, color: "bg-primary hover:bg-primary/90", onClick: () => toast.info("Screen share is available inside a meeting.") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="You" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start, join, or schedule a meeting.</p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {tiles.map((t) => (
              <button
                key={t.label}
                onClick={t.onClick}
                disabled={t.label === "New Meeting" && instant.isPending}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition hover:shadow-md disabled:opacity-60 sm:p-8"
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow ${t.color}`}>
                  <t.icon className="h-7 w-7" />
                </span>
                <span className="text-sm font-medium text-card-foreground sm:text-base">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Upcoming */}
        <Section title="Upcoming meetings">
          {isLoading ? (
            <SkeletonGrid />
          ) : (data?.upcoming ?? []).length === 0 ? (
            <EmptyState text="No upcoming meetings. Schedule one to see it here." />
          ) : (
            <Grid>
              {(data!.upcoming as Meeting[]).map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="upcoming" />
              ))}
            </Grid>
          )}
        </Section>

        {/* Recent */}
        <Section title="Recent meetings">
          {isLoading ? (
            <SkeletonGrid />
          ) : (data?.recent ?? []).length === 0 ? (
            <EmptyState text="No recent meetings yet." />
          ) : (
            <Grid>
              {(data!.recent as Meeting[]).map((m) => (
                <MeetingCard key={m.id} meeting={m} variant="recent" />
              ))}
            </Grid>
          )}
        </Section>
      </main>

      <JoinModal open={joinOpen} onOpenChange={setJoinOpen} defaultName="You" />
      <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function SkeletonGrid() {
  return (
    <Grid>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-2xl" />
      ))}
    </Grid>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
