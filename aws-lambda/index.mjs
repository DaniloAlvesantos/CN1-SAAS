const activityLevels = new Set([1.2, 1.375, 1.55, 1.725, 1.9]);

// Parâmetros de simulação acadêmica, não uma prescrição nutricional.
const adjustments = new Map([
  ["deficit", 0.85],
  ["maintenance", 1],
  ["hypertrophy", 1.10],
]);

const json = (statusCode, value, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8", ...headers },
  body: JSON.stringify(value),
});

export async function handler(event) {
  try {
    if (event?.requestContext?.http?.method !== "POST") {
      return json(405, { error: "Use o método POST." }, { allow: "POST" });
    }

    let input;
    try {
      const body = event.isBase64Encoded
        ? Buffer.from(event.body ?? "", "base64").toString("utf8")
        : event.body;
      input = JSON.parse(body);
    } catch {
      return json(400, { error: "Envie um corpo JSON válido." });
    }

    const { tmb, activity_level, objective } = input ?? {};
    if (!Number.isFinite(tmb) || tmb <= 0 || tmb > 10000) {
      return json(400, { error: "tmb deve ser um número maior que 0 e até 10000." });
    }
    if (!activityLevels.has(activity_level)) {
      return json(400, { error: "activity_level não corresponde a um fator disponível." });
    }
    if (!adjustments.has(objective)) {
      return json(400, { error: "objective deve ser deficit, maintenance ou hypertrophy." });
    }

    const calories = Math.round(tmb * activity_level * adjustments.get(objective));
    return json(200, {
      calories,
      proteins: Math.round(calories * 0.25 / 4),
      carbs: Math.round(calories * 0.50 / 4),
      fats: Math.round(calories * 0.25 / 9),
    });
  } catch {
    console.error("Falha interna no cálculo de metas.");
    return json(500, { error: "Não foi possível calcular as metas." });
  }
}
