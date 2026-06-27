import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/zoom/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Mic, Camera, Monitor, Shield } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  tab: z.enum(["audio", "video", "share", "privacy"]).optional(),
});

export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({ meta: [{ title: "Settings — Zoom Clone" }] }),
  validateSearch: searchSchema,
  component: SettingsPage,
});

function SettingsPage() {
  const { tab } = useSearch({ from: "/settings" });
  const [micEnabled, setMicEnabled] = useState(true);
  const [micVolume, setMicVolume] = useState([75]);
  const [speakerVolume, setSpeakerVolume] = useState([60]);
  const [hdVideo, setHdVideo] = useState(true);
  const [mirror, setMirror] = useState(true);
  const [touchUp, setTouchUp] = useState(false);
  const [shareSound, setShareSound] = useState(false);
  const [optimizeVideo, setOptimizeVideo] = useState(true);
  const [waitingRoom, setWaitingRoom] = useState(true);
  const [requirePassword, setRequirePassword] = useState(true);
  const [camera, setCamera] = useState("default");

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="You" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your meeting preferences.</p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <Tabs defaultValue={tab ?? "audio"}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="audio"><Mic className="mr-1 h-3.5 w-3.5" />Audio</TabsTrigger>
              <TabsTrigger value="video"><Camera className="mr-1 h-3.5 w-3.5" />Video</TabsTrigger>
              <TabsTrigger value="share"><Monitor className="mr-1 h-3.5 w-3.5" />Share</TabsTrigger>
              <TabsTrigger value="privacy"><Shield className="mr-1 h-3.5 w-3.5" />Privacy</TabsTrigger>
            </TabsList>

            <TabsContent value="audio" className="space-y-6 pt-6">
              <Row label="Microphone" desc="Enable mic on join">
                <Switch checked={micEnabled} onCheckedChange={setMicEnabled} />
              </Row>
              <div className="space-y-2">
                <Label className="text-sm">Microphone volume</Label>
                <Slider value={micVolume} onValueChange={setMicVolume} max={100} step={1} />
                <p className="text-xs text-muted-foreground">{micVolume[0]}%</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Speaker volume</Label>
                <Slider value={speakerVolume} onValueChange={setSpeakerVolume} max={100} step={1} />
                <p className="text-xs text-muted-foreground">{speakerVolume[0]}%</p>
              </div>
            </TabsContent>

            <TabsContent value="video" className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label className="text-sm">Camera</Label>
                <Select value={camera} onValueChange={setCamera}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default camera</SelectItem>
                    <SelectItem value="external">External webcam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Row label="HD video" desc="Use 720p when available">
                <Switch checked={hdVideo} onCheckedChange={setHdVideo} />
              </Row>
              <Row label="Mirror my video" desc="Flip horizontally in preview">
                <Switch checked={mirror} onCheckedChange={setMirror} />
              </Row>
              <Row label="Touch up appearance" desc="Soften skin tones">
                <Switch checked={touchUp} onCheckedChange={setTouchUp} />
              </Row>
            </TabsContent>

            <TabsContent value="share" className="space-y-6 pt-6">
              <Row label="Share computer sound" desc="Include audio when sharing">
                <Switch checked={shareSound} onCheckedChange={setShareSound} />
              </Row>
              <Row label="Optimize for video clips" desc="Better motion quality">
                <Switch checked={optimizeVideo} onCheckedChange={setOptimizeVideo} />
              </Row>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-6 pt-6">
              <Row label="Enable waiting room" desc="Admit participants manually">
                <Switch checked={waitingRoom} onCheckedChange={setWaitingRoom} />
              </Row>
              <Row label="Require meeting password" desc="Stronger access control">
                <Switch checked={requirePassword} onCheckedChange={setRequirePassword} />
              </Row>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => toast.success("Settings saved")}>Save changes</Button>
        </div>
      </main>
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
