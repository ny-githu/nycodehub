import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "inchtonekevin@gmail.com";
const ADMIN_PASSWORD = "admin123";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      GET: async () => {
        // Idempotent: find existing user by email, otherwise create.
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
        if (listErr) return new Response(listErr.message, { status: 500 });

        let user = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

        if (!user) {
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { display_name: "Kevin (Admin)" },
          });
          if (error) return new Response(error.message, { status: 500 });
          user = created.user!;
        } else {
          // Ensure password is set as requested
          await supabaseAdmin.auth.admin.updateUserById(user.id, {
            password: ADMIN_PASSWORD,
            email_confirm: true,
          });
        }

        // Ensure admin role exists for that user
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!existingRole) {
          const { error: roleErr } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: user.id, role: "admin" });
          if (roleErr) return new Response(roleErr.message, { status: 500 });
        }

        return Response.json({ ok: true, userId: user.id, email: user.email });
      },
    },
  },
});
