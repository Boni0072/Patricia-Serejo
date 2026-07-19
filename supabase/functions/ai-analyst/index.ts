import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `Você é um analista financeiro sênior brasileiro, especialista em contabilidade, controladoria e gestão financeira corporativa. Você está analisando os dados de um dashboard executivo em tempo real.

Sua expertise inclui:
- Análise de demonstrações financeiras (DRE, balanço patrimonial, fluxo de caixa)
- Controladoria: budget vs realizado, forecast, aderência orçamentária
- Indicadores de performance: EBITDA, margens, ROI, ROIC, capital de giro
- Gestão de fluxo de caixa, CAPEX e OPEX
- Identificação de riscos, tendências e oportunidades

Ao responder:
1. Identifique PONTOS FORTES — métricas que estão performando bem, com evidências numéricas
2. Identifique PONTOS FRACOS — métricas em deterioração ou abaixo do esperado
3. Indique o que PRECISA DE ATENÇÃO — alertas críticos, tendências preocupantes, desvios significativos
4. Quando relevante, sugira AÇÕES RECOMENDADAS baseadas nos dados

Seja objetivo, claro e profissional. Use formatação com:
- **negrito** para destacar números e conceitos-chave
- Bullet points (-) para listas
- Quebras de linha para separar seções
- Cite sempre os números específicos dos dados fornecidos

Responda sempre em português brasileiro. Se os dados parecerem incompletos ou zerados, mencione isso e explique o que pode estar faltando.`;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: secret, error: secretErr } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("id", "gemini_api_key")
      .maybeSingle();

    if (secretErr || !secret?.value) {
      return new Response(
        JSON.stringify({ error: "Chave da API Gemini não configurada no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = secret.value;
    const body = await req.json();
    const context: string | undefined = body.context;
    const messages: ChatMessage[] = body.messages ?? [];

    if (!messages.length) {
      return new Response(
        JSON.stringify({ error: "Nenhuma mensagem fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (context) {
      contents.push({
        role: "user",
        parts: [{ text: `[DADOS DO DASHBOARD]\n${context}\n[/DADOS DO DASHBOARD]\n\nRecebi estes dados do dashboard executivo. Estou pronto para analisar.` }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Recebi os dados do dashboard. Estou pronto para ajudar na análise financeira. O que gostaria de saber?" }],
      });
    }

    for (const msg of messages) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }],
      });
    }

    const PREFERRED = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-flash-latest",
    ];

    const requestPayload = JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.95 },
    });

    let geminiRes: Response | null = null;
    let lastError = "";

    for (const model of PREFERRED) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestPayload,
        },
      );

      // Any non-2xx (404 model não existe, 429 quota, 403 sem acesso) → tenta próximo
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        lastError = (errBody as { error?: { message?: string } })?.error?.message ?? `Erro ${res.status} para ${model}`;
        continue;
      }
      geminiRes = res;
      break;
    }

    // Se todos os preferidos falharam, descobre os modelos disponíveis na chave
    // e tenta o primeiro que suporte generateContent
    if (!geminiRes) {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (listRes.ok) {
        const listData = await listRes.json().catch(() => ({}));
        const available: string[] = (listData as { models?: Array<{ name: string; supportedGenerationMethods?: string[] }> })
          ?.models ?? [];
        const fallback = available.find(
          (m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/i.test(m.name),
        ) ?? available.find((m) => m.supportedGenerationMethods?.includes("generateContent"));
        const fallbackName = fallback?.name?.replace(/^models\//, "");
        if (fallbackName) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${fallbackName}:streamGenerateContent?alt=sse&key=${apiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: requestPayload },
          );
          if (res.ok) geminiRes = res;
        }
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const errMsg = lastError || `Erro ${geminiRes?.status ?? 0} na API Gemini`;
      return new Response(
        JSON.stringify({ error: errMsg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = geminiRes.body!.getReader();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;
              const jsonStr = trimmed.slice(6);
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro no streaming";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
