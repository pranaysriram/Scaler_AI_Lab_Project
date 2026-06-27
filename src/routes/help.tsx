import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/zoom/Navbar";
import { Input } from "@/components/ui/input";
import { BookOpen, LifeBuoy, Keyboard, Video, MessageCircle, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/help")({
  ssr: false,
  head: () => ({ meta: [{ title: "Help — Zoom Clone" }] }),
  component: HelpPage,
});

const articles = [
  { icon: Video, title: "Getting started with meetings", desc: "Schedule, start and join your first meeting." },
  { icon: BookOpen, title: "Audio & video troubleshooting", desc: "Fix common mic, speaker and camera issues." },
  { icon: Keyboard, title: "Keyboard shortcuts", desc: "Speed up your workflow with handy shortcuts." },
  { icon: LifeBuoy, title: "Account & billing", desc: "Manage your plan, invoices and subscription." },
  { icon: MessageCircle, title: "In-meeting chat & reactions", desc: "Use chat, emoji reactions and raise hand." },
  { icon: Video, title: "Recording meetings", desc: "Record locally or to the cloud and share." },
];

function HelpPage() {
  const [q, setQ] = useState("");
  const filtered = articles.filter((a) => a.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="You" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Help center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Browse articles or contact support.</p>

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help articles…" className="pl-9" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <a key={a.title} href="#" className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                <a.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-semibold group-hover:text-primary">{a.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              No articles match "{q}".
            </p>
          )}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Still need help?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Our team typically replies within a few hours.</p>
          </div>
          <a href="mailto:support@zoom.local" className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:mt-0">
            Contact support
          </a>
        </div>
      </main>
    </div>
  );
}
