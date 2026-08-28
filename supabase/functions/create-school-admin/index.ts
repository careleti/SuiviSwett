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
    const { schoolName, city, address, contactName, contactEmail, adminPassword } = await req.json();

    if (!schoolName || !contactName || !contactEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: "Nom de l'école, nom du contact, email et mot de passe sont requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create the school
    const { data: schoolData, error: schoolError } = await adminClient
      .from("schools")
      .insert({
        name: schoolName,
        city: city || null,
        address: address || null,
        contact_name: contactName,
        contact_email: contactEmail,
        subscription_status: "active",
        renewal_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
      })
      .select()
      .single();

    if (schoolError) {
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création de l'école: ${schoolError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create the auth user for the admin école
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: contactEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      // Rollback: delete the school
      await adminClient.from("schools").delete().eq("id", schoolData.id);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création du compte: ${authError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create the user_profile linking auth user to school with role admin_ecole
    const { error: profileError } = await adminClient
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        email: contactEmail,
        full_name: contactName,
        role: "admin_ecole",
        school_id: schoolData.id,
      });

    if (profileError) {
      // Rollback: delete auth user and school
      await adminClient.auth.admin.deleteUser(authData.user.id);
      await adminClient.from("schools").delete().eq("id", schoolData.id);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création du profil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        school: schoolData,
        adminEmail: contactEmail,
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
