import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCourses from "./tools/list-courses";
import listCourseVideos from "./tools/list-course-videos";
import getMyProfile from "./tools/get-my-profile";
import askCodehelper from "./tools/ask-codehelper";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "nycodehub-mcp",
  title: "NYCODEHUB",
  version: "0.1.0",
  instructions:
    "Tools for NYCODEHUB, a Kinyarwanda coding-education site. Browse courses, list course videos, read your profile, and ask CODEHELPER coding questions (answers in Kinyarwanda).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCourses, listCourseVideos, getMyProfile, askCodehelper],
});
