import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminListCourseVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ courseId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: videos } = await supabaseAdmin
      .from("course_videos").select("*").eq("course_id", data.courseId).order("sort_order").order("created_at");
    return videos ?? [];
  });

export const adminCreateCourseVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      courseId: z.string().uuid(),
      topic: z.string().min(1).max(120),
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      videoUrl: z.string().url().max(500).optional(),
      storagePath: z.string().max(500).optional(),
      sortOrder: z.number().int().default(0),
    }).refine((v) => !!v.videoUrl || !!v.storagePath, { message: "Provide a URL or upload a file" }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("course_videos").insert({
      course_id: data.courseId,
      topic: data.topic,
      title: data.title,
      description: data.description ?? null,
      video_url: data.videoUrl ?? null,
      storage_path: data.storagePath ?? null,
      sort_order: data.sortOrder,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCourseVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: v } = await supabaseAdmin.from("course_videos").select("storage_path").eq("id", data.id).maybeSingle();
    if (v?.storage_path) {
      await supabaseAdmin.storage.from("course-videos").remove([v.storage_path]);
    }
    const { error } = await supabaseAdmin.from("course_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
