// Supabase Edge Function — Função 1 do Grupo D: IMC, classificação e TMB.
// Contrato com o frontend (frontend-app/src/app/page.jsx):
//   POST { weight (kg), height (m), age (anos), gender ("male" | "female") }
//   200  { imc, classification, tmb }
//   400  { error }   |   500  { error }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

export function classifyBmi(imc: number): string {
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  if (imc < 35) return "Obesidade grau I";
  if (imc < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

// Mifflin-St Jeor. height em metros -> converte para cm.
export function calcBmr(
  weight: number,
  heightM: number,
  age: number,
  gender: "male" | "female",
): number {
  const base = 10 * weight + 6.25 * (heightM * 100) - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function handler(input: Record<string, unknown>): Response {
  // Aceita chaves em inglês (frontend) e português (testes manuais).
  const weight = Number(input.weight ?? input.peso);
  let height = Number(input.height ?? input.altura);
  const age = Number(input.age ?? input.idade);
  const rawGender = String(input.gender ?? input.sexo ?? "").toLowerCase();
  const gender =
    rawGender === "male" || rawGender === "masculino"
      ? "male"
      : rawGender === "female" || rawGender === "feminino"
        ? "female"
        : null;

  // Se vier em centímetros (ex.: 175), converte para metros.
  if (height > 3 && height <= 250) height = height / 100;

  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    return json({ error: "Peso inválido (use 20 a 400 kg)." }, 400);
  }
  if (!Number.isFinite(height) || height < 0.5 || height > 2.5) {
    return json({ error: "Altura inválida (use metros, ex.: 1.75)." }, 400);
  }
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    return json({ error: "Idade inválida (use 1 a 120 anos)." }, 400);
  }
  if (!gender) {
    return json({ error: "Sexo inválido (use 'male' ou 'female')." }, 400);
  }

  const imc = weight / (height * height);
  return json({
    imc: Math.round(imc * 100) / 100,
    classification: classifyBmi(imc),
    tmb: Math.round(calcBmr(weight, height, age, gender) * 100) / 100,
  });
}

// Só inicia o servidor dentro do runtime do Supabase (Deno).
// deno-lint-ignore no-explicit-any
const deno = (globalThis as any).Deno;
if (deno?.serve) {
  deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Método não permitido." }, 405);
    }
    try {
      const body = await req.json();
      return handler(body && typeof body === "object" ? body : {});
    } catch (err) {
      if (err instanceof SyntaxError) {
        return json({ error: "JSON inválido." }, 400);
      }
      return json({ error: "Erro interno." }, 500);
    }
  });
}
