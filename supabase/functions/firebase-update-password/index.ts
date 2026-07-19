import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  apiKey: string;
  projectId: string;
  email: string;
  novaSenha: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, projectId, email, novaSenha } = await req.json() as RequestBody;

    if (!apiKey || !projectId || !email || !novaSenha) {
      return new Response(
        JSON.stringify({ error: "apiKey, projectId, email e novaSenha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (novaSenha.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter ao menos 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const emailLower = email.toLowerCase();

    // 1. Localizar o localId (uid) do usuário pelo e-mail
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: [emailLower] }),
      },
    );

    if (!lookupRes.ok) {
      const body = await lookupRes.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } })?.error?.message ?? "Erro ao buscar usuário";
      return new Response(
        JSON.stringify({ error: traduzErro(msg) }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lookupData = await lookupRes.json() as { users?: { localId: string }[] };
    const localId = lookupData.users?.[0]?.localId;

    if (!localId) {
      return new Response(
        JSON.stringify({ error: "Nenhum usuário encontrado com este e-mail." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Atualizar a senha do usuário
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localId,
          password: novaSenha,
          returnSecureToken: false,
        }),
      },
    );

    if (!updateRes.ok) {
      const body = await updateRes.json().catch(() => ({}));
      const msg = (body as { error?: { message?: string } })?.error?.message ?? "Erro ao atualizar senha";
      return new Response(
        JSON.stringify({ error: traduzErro(msg) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function traduzErro(code: string): string {
  if (code.includes("USER_NOT_FOUND") || code.includes("EMAIL_NOT_FOUND")) return "Nenhum usuário encontrado com este e-mail.";
  if (code.includes("WEAK_PASSWORD") || code.includes("weak-password")) return "A senha deve ter ao menos 6 caracteres.";
  if (code.includes("INVALID_EMAIL")) return "E-mail inválido.";
  if (code.includes("TOO_MANY_ATTEMPTS")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (code.includes("OPERATION_NOT_ALLOWED")) return "Operação não permitida. Verifique as configurações do Firebase.";
  return code;
}
