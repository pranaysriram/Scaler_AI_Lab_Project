import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Extract a 10-digit meeting code from raw input (URL or "123 456 7890"). */
function parseMeetingCode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 12) return null;
  // Normalize to "XXX XXXX XXX"
  const d = digits.slice(0, 10).padStart(10, "0");
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 10)}`;
}

/** POST /api/meetings/instant */
export const createInstantMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: codeData, error: codeErr } = await context.supabase.rpc("generate_meeting_code" as never);
    // RPC is revoked; generate code in JS instead.
    void codeData; void codeErr;
    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
    const code = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 10)}`;

    const { data, error } = await context.supabase
      .from("meetings")
      .insert({
        meeting_code: code,
        title: "Instant Meeting",
        description: null,
        start_time: new Date().toISOString(),
        duration_minutes: 60,
        host_id: context.userId,
        is_instant: true,
      })
      .select("id, meeting_code")
      .single();
    if (error) throw new Error(error.message);
    return { meetingCode: data.meeting_code, id: data.id };
  });

/** POST /api/meetings/schedule */
export const scheduleMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      title: z.string().min(1).max(120),
      description: z.string().max(2000).optional().default(""),
      startTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
      durationMinutes: z.number().int().min(5).max(480),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join("");
    const code = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 10)}`;
    const { data: row, error } = await context.supabase
      .from("meetings")
      .insert({
        meeting_code: code,
        title: data.title,
        description: data.description || null,
        start_time: new Date(data.startTime).toISOString(),
        duration_minutes: data.durationMinutes,
        host_id: context.userId,
        is_instant: false,
      })
      .select("id, meeting_code, title, start_time, duration_minutes")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** POST /api/meetings/join */
export const joinMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      codeOrUrl: z.string().min(1),
      displayName: z.string().min(1).max(64),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const code = parseMeetingCode(data.codeOrUrl);
    if (!code) throw new Error("Invalid meeting ID. Use a 10-digit code or a meeting link.");

    const { data: meeting, error } = await context.supabase
      .from("meetings")
      .select("id, meeting_code, title")
      .eq("meeting_code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!meeting) throw new Error("Meeting not found. Double-check the code.");

    await context.supabase.from("participants").insert({
      meeting_id: meeting.id,
      user_id: context.userId,
      display_name: data.displayName,
    });

    return { meetingCode: meeting.meeting_code, title: meeting.title };
  });

/** GET /api/meetings/dashboard */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const nowIso = new Date().toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [upcoming, recent] = await Promise.all([
      context.supabase
        .from("meetings")
        .select("id, meeting_code, title, description, start_time, duration_minutes, is_instant")
        .eq("host_id", context.userId)
        .gte("start_time", nowIso)
        .order("start_time", { ascending: true })
        .limit(20),
      context.supabase
        .from("meetings")
        .select("id, meeting_code, title, description, start_time, duration_minutes, is_instant")
        .eq("host_id", context.userId)
        .lt("start_time", nowIso)
        .gte("start_time", weekAgo)
        .order("start_time", { ascending: false })
        .limit(20),
    ]);

    if (upcoming.error) throw new Error(upcoming.error.message);
    if (recent.error) throw new Error(recent.error.message);

    return { upcoming: upcoming.data ?? [], recent: recent.data ?? [] };
  });

/** Load a single meeting by code (for the room page header). */
export const getMeetingByCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const code = parseMeetingCode(data.code) ?? data.code;
    const { data: meeting, error } = await context.supabase
      .from("meetings")
      .select("id, meeting_code, title, description, start_time, duration_minutes, host_id, is_instant")
      .eq("meeting_code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!meeting) throw new Error("Meeting not found");
    return meeting;
  });
