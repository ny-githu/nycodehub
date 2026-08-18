import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getCourseBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {

    const { data: course, error } = await supabaseAdmin
      .from("courses").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!course) return null;
    const { data: videos } = await supabaseAdmin
      .from("course_videos").select("*").eq("course_id", course.id).order("sort_order").order("created_at");
    return { course, videos: videos ?? [] };
  });

export const listAdminCourses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("courses").select("id, slug, title, track").order("title");
    return data ?? [];
  });
