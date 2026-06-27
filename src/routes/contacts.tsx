import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/zoom/Navbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Video } from "lucide-react";

export const Route = createFileRoute("/contacts")({
  ssr: false,
  head: () => ({ meta: [{ title: "Contacts — Zoom Clone" }] }),
  component: ContactsPage,
});

const contacts = [
  { name: "Alex Morgan", email: "alex.morgan@example.com", status: "Available" },
  { name: "Priya Patel", email: "priya.patel@example.com", status: "In a meeting" },
  { name: "Jordan Lee", email: "jordan.lee@example.com", status: "Away" },
  { name: "Sam Rivera", email: "sam.rivera@example.com", status: "Available" },
  { name: "Taylor Chen", email: "taylor.chen@example.com", status: "Do not disturb" },
  { name: "Morgan Davis", email: "morgan.davis@example.com", status: "Available" },
];

const statusColor: Record<string, string> = {
  "Available": "bg-emerald-500",
  "In a meeting": "bg-zoom-orange",
  "Away": "bg-amber-500",
  "Do not disturb": "bg-rose-500",
};

function ContactsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar userName="You" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">People you can invite or meet with.</p>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => {
            const initials = c.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
            return (
              <li key={c.email} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">{initials}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card ${statusColor[c.status] ?? "bg-muted"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-card-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.status}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="icon" variant="ghost" aria-label={`Email ${c.name}`} asChild>
                    <a href={`mailto:${c.email}`}><Mail className="h-4 w-4" /></a>
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Meet ${c.name}`}>
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
