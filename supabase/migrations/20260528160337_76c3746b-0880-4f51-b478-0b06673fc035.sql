
-- 1. Disabled flag on profiles (admin can disable an account)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Course videos table (file upload via storage_path OR external video_url)
CREATE TABLE IF NOT EXISTS public.course_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic TEXT NOT NULL DEFAULT 'General',
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  storage_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_videos TO authenticated;
GRANT ALL ON public.course_videos TO service_role;

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read course videos"
  ON public.course_videos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins manage course videos"
  ON public.course_videos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_course_videos_course ON public.course_videos(course_id, sort_order);

CREATE TRIGGER set_updated_at_course_videos
  BEFORE UPDATE ON public.course_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Storage bucket for video files (public read so iframe/<video> can play)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Course videos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-videos');

CREATE POLICY "Admins upload course videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'course-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update course videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'course-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete course videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'course-videos' AND has_role(auth.uid(), 'admin'::app_role));
