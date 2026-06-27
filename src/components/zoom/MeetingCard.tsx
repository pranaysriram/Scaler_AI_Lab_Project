import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Copy, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Meeting {
  id: string;
  meeting_code: string;
  title: string;
  description: string | null;
  start_time: string | null;
  duration_minutes: number;
  is_instant: boolean;
}

function formatStart(iso: string | null) {
  if (!iso) return "Anytime";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MeetingCard({ meeting, variant = "upcoming" }: { meeting: Meeting; variant?: "upcoming" | "recent" }) {
  const isRecent = variant === "recent";
  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/room/${encodeURIComponent(meeting.meeting_code)}`
    : `/room/${meeting.meeting_code}`;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-card-foreground">{meeting.title}</h3>
          {meeting.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{meeting.description}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {meeting.duration_minutes} min
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-4 w-4" /> {formatStart(meeting.start_time)}
        </span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          <Clock className="h-4 w-4" /> ID: {meeting.meeting_code}
        </span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {!isRecent ? (
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/room/$code" params={{ code: meeting.meeting_code }}>
              <Video className="mr-1.5 h-4 w-4" /> Start
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/room/$code" params={{ code: meeting.meeting_code }}>
              <Video className="mr-1.5 h-4 w-4" /> Rejoin
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={copyInvite}>
          <Copy className="mr-1.5 h-4 w-4" /> Copy invite
        </Button>
      </div>
    </div>
  );
}
