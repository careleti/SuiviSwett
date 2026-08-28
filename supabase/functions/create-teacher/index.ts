import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, password, schoolId, createdByUserId } = await req.json();

    if (!firstName || !lastName || !email || !password || !schoolId || !createdByUserId) {
      return new Response(
        JSON.stringify({ error: "Tous les champs sont requis (prénom, nom, email, mot de passe, école)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is a school admin for this school
    const { data: callerProfile, error: callerError } = await adminClient
      .from("user_profiles")
      .select("role, school_id")
      .eq("id", createdByUserId)
      .maybeSingle();

    if (callerError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Impossible de vérifier vos permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSuperAdmin = callerProfile.role === "super_admin";
    const isSchoolAdmin = callerProfile.role === "admin_ecole" && callerProfile.school_id === schoolId;

    if (!isSuperAdmin && !isSchoolAdmin) {
      return new Response(
        JSON.stringify({ error: "Vous n'avez pas les permissions pour créer un enseignant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a user with this email already exists
    const { data: existingProfile } = await adminClient
      .from("user_profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Un compte existe déjà avec cet email" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the auth user
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user_profile
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        role: "enseignant",
        school_id: schoolId,
        is_active: true,
      });

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création du profil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        teacherId: authData.user.id,
        teacherName: fullName,
        teacherEmail: email.toLowerCase(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
