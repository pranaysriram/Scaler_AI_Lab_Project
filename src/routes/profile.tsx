import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/zoom/Navbar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({ meta: [{ title: "Profile — Zoom Clone" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [name, setName] = useState("You");
  const [email, setEmail] = useState("guest@zoom.local");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const initials = (name || "G").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName={name} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">How others see you in meetings.</p>

        <div className="mt-8 flex items-center gap-5 rounded-2xl border border-border bg-card p-5">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{name || "Your name"}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            {title && <p className="mt-0.5 text-xs text-muted-foreground">{title}</p>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <Field id="p-name" label="Display name" value={name} onChange={setName} />
          <Field id="p-email" label="Email" type="email" value={email} onChange={setEmail} />
          <Field id="p-title" label="Job title" placeholder="e.g. Product Designer" value={title} onChange={setTitle} />
          <Field id="p-phone" label="Phone" placeholder="+1 555 123 4567" value={phone} onChange={setPhone} />
          <div className="sm:col-span-2">
            <Field id="p-loc" label="Location" placeholder="City, Country" value={location} onChange={setLocation} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setTitle(""); setPhone(""); setLocation(""); }}>Reset</Button>
          <Button onClick={() => toast.success("Profile updated")}>Save changes</Button>
        </div>
      </main>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
