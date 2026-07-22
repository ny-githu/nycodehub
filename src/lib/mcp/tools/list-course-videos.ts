import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_course_videos",
  title: "List course videos",
  description: "List videos for a course by slug, grouped by topic and ordered.",
  inputSchema: {
    slug: z.string().describe("Course slug."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: course, error: cErr } = await supabase
      .from("courses").select("id,title,slug").eq("slug", slug).maybeSingle();
    if (cErr) return { content: [{ type: "text", text: cErr.message }], isError: true };
    if (!course) return { content: [{ type: "text", text: "Course not found" }], isError: true };
    const { data: videos, error: vErr } = await supabase
      .from("course_videos")
      .select("id,title,topic,description,video_url,storage_path,sort_order")
      .eq("course_id", course.id)
      .order("topic").order("sort_order").order("created_at");
    if (vErr) return { content: [{ type: "text", text: vErr.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ course, videos }) }],
      structuredContent: { course, videos: videos ?? [] },
    };
  },
});
