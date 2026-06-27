import { Link } from "@tanstack/react-router";
import { Video, Bell, Settings, Check, Mic, Camera, Monitor, Shield, HelpCircle, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const initialNotifications: Notification[] = [
  { id: "1", title: "Meeting starting soon", body: "Weekly team sync starts in 10 minutes.", time: "Just now", unread: true },
  { id: "2", title: "New participant joined", body: "Alex Morgan joined your scheduled meeting.", time: "1h ago", unread: true },
  { id: "3", title: "Recording ready", body: "Your meeting recording from yesterday is available.", time: "Yesterday", unread: false },
];

export function Navbar({ userName = "Guest" }: { userName?: string }) {
  const initials = userName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "G";
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.success("All notifications marked as read");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-accent">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105">
            <Video className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">Zoom</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/dashboard"
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3"
            activeProps={{ className: "rounded-md px-2 py-2 text-sm font-semibold text-foreground bg-accent sm:px-3" }}
          >
            Home
          </Link>
          <Link
            to="/meetings"
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3"
            activeProps={{ className: "rounded-md px-2 py-2 text-sm font-semibold text-foreground bg-accent sm:px-3" }}
          >
            Meetings
          </Link>
          <Link
            to="/contacts"
            className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:px-3"
            activeProps={{ className: "rounded-md px-2 py-2 text-sm font-semibold text-foreground bg-accent sm:px-3" }}
          >
            Contacts
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative transition-colors hover:bg-accent hover:text-foreground">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zoom-orange px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {unreadCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{unreadCount} new</Badge>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead} disabled={unreadCount === 0}>
                  <Check className="mr-1 h-3 w-3" /> Mark all
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex gap-3 px-4 py-3 hover:bg-accent/50">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-zoom-orange" : "bg-transparent"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings" className="transition-colors hover:bg-accent hover:text-foreground">
                <Settings className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" search={{ tab: "audio" }}>
                  <Mic className="mr-2 h-4 w-4" /> Audio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" search={{ tab: "video" }}>
                  <Camera className="mr-2 h-4 w-4" /> Video
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" search={{ tab: "share" }}>
                  <Monitor className="mr-2 h-4 w-4" /> Share Screen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" search={{ tab: "privacy" }}>
                  <Shield className="mr-2 h-4 w-4" /> Privacy
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help">
                  <HelpCircle className="mr-2 h-4 w-4" /> Help
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 transition-shadow hover:shadow-md">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile"><User className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" search={{ tab: "audio" }}>
                  <Settings className="mr-2 h-4 w-4" /> Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help"><HelpCircle className="mr-2 h-4 w-4" /> Help</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

