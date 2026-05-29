
-- Admins can manage objects in the course-videos bucket
CREATE POLICY "Admins manage course-videos objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'course-videos' AND public.has_role(auth.uid(), 'admin'));
