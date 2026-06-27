import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEnsureSession } from "@/hooks/use-ensure-session";
import { getMeetingByCode } from "@/lib/meetings.functions";

export const Route = createFileRoute("/room/$code")({
  ssr: false,
  component: Room,
});

type Peer = { id: string; stream: MediaStream; name: string };
type Signal =
  | { kind: "hello"; from: string; name: string }
  | { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit; name: string }
  | { kind: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { kind: "bye"; from: string };

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function Room() {
  const { code } = Route.useParams();
  const { ready, userId } = useEnsureSession();
  const navigate = useNavigate();
  const getMeetingFn = useServerFn(getMeetingByCode);

  const { data: meeting } = useQuery({
    queryKey: ["meeting", code],
    queryFn: () => getMeetingFn({ data: { code } }),
    enabled: ready && !!userId,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).slice(2, 10));
  const myNameRef = useRef<string>("You");

  const [peers, setPeers] = useState<Peer[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const upsertPeer = (id: string, patch: Partial<Peer>) => {
    setPeers((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return [...prev, { id, stream: new MediaStream(), name: "Guest", ...patch } as Peer];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };
  const removePeer = (id: string) => setPeers((prev) => prev.filter((p) => p.id !== id));

  // Initialize media + signaling
  useEffect(() => {
    if (!ready || !userId || !code) return;
    let cancelled = false;

    (async () => {
      // 1) Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        setMediaError(err instanceof Error ? err.message : "Camera/mic unavailable");
      }

      // 2) Join signaling channel
      const channelName = `room:${code.replace(/\s+/g, "")}`;
      const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } });
      channelRef.current = channel;

      const send = (payload: Signal) => channel.send({ type: "broadcast", event: "signal", payload });

      const createPeer = (remoteId: string, remoteName: string, isInitiator: boolean) => {
        const existing = peersRef.current.get(remoteId);
        if (existing) return existing;
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peersRef.current.set(remoteId, pc);
        upsertPeer(remoteId, { name: remoteName });

        localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));

        pc.onicecandidate = (e) => {
          if (e.candidate) send({ kind: "ice", from: myIdRef.current, to: remoteId, candidate: e.candidate.toJSON() });
        };
        pc.ontrack = (e) => {
          const stream = e.streams[0] ?? new MediaStream([e.track]);
          upsertPeer(remoteId, { stream });
        };
        pc.onconnectionstatechange = () => {
          if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
            pc.close();
            peersRef.current.delete(remoteId);
            removePeer(remoteId);
          }
        };

        if (isInitiator) {
          (async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ kind: "offer", from: myIdRef.current, to: remoteId, sdp: offer, name: myNameRef.current });
          })();
        }
        return pc;
      };

      channel
        .on("broadcast", { event: "signal" }, async ({ payload }) => {
          const msg = payload as Signal;
          if ("to" in msg && msg.to !== myIdRef.current) return;
          if (msg.from === myIdRef.current) return;

          if (msg.kind === "hello") {
            // someone new joined → initiate offer to them
            createPeer(msg.from, msg.name, true);
          } else if (msg.kind === "offer") {
            const pc = createPeer(msg.from, msg.name, false);
            await pc.setRemoteDescription(msg.sdp);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            send({ kind: "answer", from: myIdRef.current, to: msg.from, sdp: answer });
          } else if (msg.kind === "answer") {
            const pc = peersRef.current.get(msg.from);
            if (pc) await pc.setRemoteDescription(msg.sdp);
          } else if (msg.kind === "ice") {
            const pc = peersRef.current.get(msg.from);
            if (pc) {
              try { await pc.addIceCandidate(msg.candidate); } catch (e) { console.warn("ICE add failed", e); }
            }
          } else if (msg.kind === "bye") {
            const pc = peersRef.current.get(msg.from);
            if (pc) pc.close();
            peersRef.current.delete(msg.from);
            removePeer(msg.from);
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            send({ kind: "hello", from: myIdRef.current, name: myNameRef.current });
          }
        });
    })();

    return () => {
      cancelled = true;
      const ch = channelRef.current;
      if (ch) {
        ch.send({ type: "broadcast", event: "signal", payload: { kind: "bye", from: myIdRef.current } });
        supabase.removeChannel(ch);
      }
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [ready, userId, code]);

  const toggleMic = () => {
    const tracks = localStreamRef.current?.getAudioTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  };
  const toggleCam = () => {
    const tracks = localStreamRef.current?.getVideoTracks() ?? [];
    tracks.forEach((t) => (t.enabled = !t.enabled));
    setCamOn((v) => !v);
  };
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Invite link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  };
  const leave = () => navigate({ to: "/dashboard" });

  const totalTiles = 1 + peers.length;
  const gridCols = totalTiles <= 1 ? "grid-cols-1" : totalTiles <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="flex min-h-screen flex-col bg-zoom-dark text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <Link to="/dashboard" className="text-sm font-medium text-white/70 hover:text-white">← Back</Link>
        <div className="text-center">
          <h1 className="text-sm font-semibold sm:text-base">{meeting?.title ?? "Meeting"}</h1>
          <p className="font-mono text-xs text-white/60">ID: {code}</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-white/70">
          <Users className="h-4 w-4" /> {totalTiles}
        </div>
      </header>

      {/* Tiles */}
      <main className="flex-1 p-3 sm:p-6">
        <div className={`grid h-full gap-3 ${gridCols}`}>
          <Tile name="You (You)" muted videoRef={localVideoRef} cameraOff={!camOn} placeholder={mediaError ?? undefined} />
          {peers.map((p) => (
            <RemoteTile key={p.id} peer={p} />
          ))}
        </div>
      </main>

      {/* Controls */}
      <footer className="border-t border-white/10 bg-zoom-tile px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-3">
          <ControlBtn onClick={toggleMic} active={micOn} label={micOn ? "Mute" : "Unmute"}>
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </ControlBtn>
          <ControlBtn onClick={toggleCam} active={camOn} label={camOn ? "Stop video" : "Start video"}>
            {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </ControlBtn>
          <ControlBtn onClick={copyInvite} active label="Copy invite">
            <Copy className="h-5 w-5" />
          </ControlBtn>
          <Button onClick={leave} className="ml-4 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <PhoneOff className="mr-2 h-4 w-4" /> Leave
          </Button>
        </div>
      </footer>
    </div>
  );
}

function ControlBtn({ children, onClick, active, label }: { children: React.ReactNode; onClick: () => void; active: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${active ? "bg-white/10 text-white hover:bg-white/20" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}`}
    >
      {children}
    </button>
  );
}

function Tile({ name, videoRef, cameraOff, muted, placeholder }: {
  name: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraOff?: boolean;
  muted?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black/60 shadow">
      <video ref={videoRef} autoPlay playsInline muted={muted} className={`h-full w-full object-cover ${cameraOff ? "opacity-0" : ""}`} />
      {(cameraOff || placeholder) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zoom-tile text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {name[0]?.toUpperCase() ?? "?"}
          </div>
          {placeholder && <p className="mt-3 max-w-xs text-xs text-white/60">{placeholder}</p>}
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">{name}</div>
    </div>
  );
}

function RemoteTile({ peer }: { peer: Peer }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = peer.stream;
  }, [peer.stream]);
  return <Tile name={peer.name} videoRef={ref} />;
}
