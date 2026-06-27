import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { joinMeeting } from "@/lib/meetings.functions";
import { toast } from "sonner";

export function JoinModal({ open, onOpenChange, defaultName }: { open: boolean; onOpenChange: (v: boolean) => void; defaultName?: string }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const join = useServerFn(joinMeeting);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setBusy(true);
    try {
      const result = await join({ data: { codeOrUrl: code.trim(), displayName: name.trim() } });
      onOpenChange(false);
      navigate({ to: "/room/$code", params: { code: result.meetingCode } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join meeting");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Join a meeting</DialogTitle>
            <DialogDescription>Enter a meeting ID or paste an invite link.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Meeting ID or link</Label>
              <Input id="code" placeholder="123 4567 890" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !code.trim() || !name.trim()}>
              {busy ? "Joining…" : "Join"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
