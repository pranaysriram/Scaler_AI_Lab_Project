import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { Video } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
});

function Index() {
  const { ready, userId } = useEnsureSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && userId) navigate({ to: "/dashboard" });
  }, [ready, userId, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Video className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">Setting up your meeting space…</p>
      </div>
    </div>
  );
}
