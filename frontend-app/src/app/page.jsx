"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";
import { useState } from "react";

const SUPABASE_URL = process.env.SUPABASE || "";
const AWS_URL = process.env.AWS || "";
const GCLOUD_URL = process.env.GOOGLE_CLOUD || "";

const macroChartConfig = {
  carbs: {
    label: "Carboidratos",
    color: "#3b82f6", 
  },
  proteins: {
    label: "Proteínas",
    color: "#ef4444", 
  },
  fats: {
    label: "Gorduras",
    color: "#f59e0b", 
  },
};

const USE_MOCK = true;

export default function Dashboard() {
  const [formData, setFormData] = useState({
    weight: "",
    height: "",
    age: "",
    gender: "",
    activityLevel: "",
    objective: "",
    intensity: "",
  });

  const [results, setResults] = useState({
    supabase: null,
    aws: null,
    gcp: null,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    setResults({ supabase: null, aws: null, gcp: null });

    const weightNum = parseFloat(formData.weight);
    const heightNum = parseFloat(formData.height);
    const ageNum = parseInt(formData.age);

    if (USE_MOCK) {
      setTimeout(() => {
        setResults({
          supabase: {
            data: {
              imc: weightNum / (heightNum * heightNum),
              classification: "Peso Normal (Mock)",
              tmb: 1850,
            },
            latency: 125,
            fallback: false, 
          },
          aws: {
            data: {
              calories: 2400,
              carbs: 250,
              proteins: 160,
              fats: 85,
            },
            latency: 240,
            error: false, 
          },
          gcp: {
            data: {
              water_liters: 3.5,
              sleep_hours: 8,
              recommendation:
                "Mantenha a hidratação constante durante o dia. (Mock)",
            },
            latency: 180,
            error: false, 
          },
        });
        setLoading(false);
      }, 800);
      return; 
    }

    const startTimeParallel = performance.now();

    const supabasePromise = fetch(SUPABASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight: weightNum,
        height: heightNum,
        age: ageNum,
        gender: formData.gender,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Status: " + res.status);
        return {
          data: await res.json(),
          latency: performance.now() - startTimeParallel,
          fallback: false,
        };
      })
      .catch((err) => {
        console.warn("Supabase failed, fallback local ativado", err);
        let localTmb =
          88.362 +
          13.397 * weightNum +
          4.799 * (heightNum * 100) -
          5.677 * ageNum;
        if (formData.gender === "female") {
          localTmb =
            447.593 +
            9.247 * weightNum +
            3.098 * (heightNum * 100) -
            4.33 * ageNum;
        }
        return {
          data: {
            imc: weightNum / (heightNum * heightNum),
            classification: "Calculo Local (Falha)",
            tmb: localTmb,
          },
          latency: performance.now() - startTimeParallel,
          fallback: true,
        };
      });

    const gcpPromise = fetch(GCLOUD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weight: weightNum,
        intensity: formData.intensity,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return {
          data: await res.json(),
          latency: performance.now() - startTimeParallel,
          error: false,
        };
      })
      .catch(() => ({
        data: null,
        latency: performance.now() - startTimeParallel,
        error: true,
      }));

    const [supabaseRes, gcpRes] = await Promise.all([
      supabasePromise,
      gcpPromise,
    ]);

    setResults((prev) => ({ ...prev, supabase: supabaseRes, gcp: gcpRes }));

    const startTimeAws = performance.now();
    let awsRes = { data: null, latency: 0, error: false };

    try {
      const awsResponse = await fetch(AWS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmb: supabaseRes.data.tmb,
          activity_level: parseFloat(formData.activityLevel),
          objective: formData.objective,
        }),
      });
      if (!awsResponse.ok) throw new Error();
      awsRes = {
        data: await awsResponse.json(),
        latency: performance.now() - startTimeAws,
        error: false,
      };
    } catch (err) {
      awsRes = {
        data: null,
        latency: performance.now() - startTimeAws,
        error: true,
      };
    }

    setResults((prev) => ({ ...prev, aws: awsRes }));
    setLoading(false);
  };

  const macroData =
    results.aws && !results.aws.error
      ? [
          {
            macro: "carbs",
            value: results.aws.data.carbs,
            fill: "var(--color-carbs)",
          },
          {
            macro: "proteins",
            value: results.aws.data.proteins,
            fill: "var(--color-proteins)",
          },
          {
            macro: "fats",
            value: results.aws.data.fats,
            fill: "var(--color-fats)",
          },
        ]
      : [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="border-b pb-4 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
          SaaS de Saúde e Bem-Estar
        </h1>
        <p className="text-slate-500">
          Triagem Nutricional Integrada Multicloud (Grupo D)
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-card text-card-foreground border rounded-xl p-6 shadow-sm space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              inputMode="decimal"
              name="weight"
              placeholder="ex: 75.5"
              value={formData.weight}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Altura (m)</Label>
            <Input
              id="height"
              type="number"
              step="0.01"
              inputMode="decimal"
              name="height"
              placeholder="ex: 1.75"
              value={formData.height}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">Idade (anos)</Label>
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              name="age"
              placeholder="ex: 26"
              value={formData.age}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Sexo Biológico</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gender: value }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="female">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nível de Atividade</Label>
            <Select
              value={formData.activityLevel}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, activityLevel: value }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.2">Sedentário (Pouco/Nenhum)</SelectItem>
                <SelectItem value="1.375">Leve (1-3 dias/sem)</SelectItem>
                <SelectItem value="1.55">Moderado (3-5 dias/sem)</SelectItem>
                <SelectItem value="1.725">Ativo (6-7 dias/sem)</SelectItem>
                <SelectItem value="1.9">Muito Ativo (Físico)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Select
              value={formData.objective}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, objective: value }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deficit">Déficit Calórico</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
                <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Intensidade do Treino</Label>
            <Select
              value={formData.intensity}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, intensity: value }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Leve</SelectItem>
                <SelectItem value="moderate">Moderado</SelectItem>
                <SelectItem value="heavy">Pesado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto font-bold px-8 cursor-pointer"
          >
            {loading ? "Processando..." : "Calcular Métricas"}
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-start">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded">
              ⚡ Supabase Edge
            </span>
            {results.supabase && (
              <span className="text-xs text-gray-400 font-mono">
                {results.supabase.latency.toFixed(0)}ms
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">
            Índices Corporais
          </h3>
          {results.supabase && (
            <div className="text-sm space-y-2 text-slate-700 mt-2">
              <div className="flex justify-between border-b pb-1">
                <span>IMC</span>
                <strong>{results.supabase.data.imc.toFixed(1)}</strong>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Classificação</span>
                <strong>{results.supabase.data.classification}</strong>
              </div>
              <div className="flex justify-between pb-1">
                <span>TMB Base</span>
                <strong>{results.supabase.data.tmb.toFixed(0)} kcal</strong>
              </div>
            </div>
          )}
          {results.supabase?.fallback && (
            <div className="mt-4 bg-amber-50 text-amber-800 border border-amber-200 text-xs p-2 rounded">
              ⚠️ Usando TMB Contingencial
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-start">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-0.5 rounded">
              📦 AWS Lambda
            </span>
            {results.aws && !results.aws.error && (
              <span className="text-xs text-gray-400 font-mono">
                {results.aws.latency.toFixed(0)}ms
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">
            Metas & Macros
          </h3>
          {results.aws && !results.aws.error && (
            <>
              <p className="text-sm text-slate-700 mb-4 font-semibold">
                Meta Diária: {results.aws.data.calories} kcal
              </p>

              <ChartContainer
                config={macroChartConfig}
                className="h-[180px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={macroData}
                    dataKey="value"
                    nameKey="macro"
                    innerRadius={50}
                    strokeWidth={5}
                  />
                  <ChartLegend
                    content={<ChartLegendContent />}
                    className="flex-wrap"
                  />
                </PieChart>
              </ChartContainer>
            </>
          )}
          {results.aws?.error && (
            <div className="mt-4 bg-red-50 text-red-700 border border-red-200 text-xs p-2 rounded">
              ❌ Serviço Indisponível
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col justify-start">
          <div className="flex justify-between items-center mb-4">
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded">
              ☁️ Google Cloud
            </span>
            {results.gcp && !results.gcp.error && (
              <span className="text-xs text-gray-400 font-mono">
                {results.gcp.latency.toFixed(0)}ms
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">
            Hidratação & Sono
          </h3>
          {results.gcp && !results.gcp.error && (
            <div className="text-sm space-y-3 text-slate-700 mt-2">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-900 border border-blue-100">
                <span className="block text-xs uppercase tracking-wider mb-1">
                  Água Diária
                </span>
                <strong className="text-2xl">
                  {results.gcp.data.water_liters.toFixed(1)}L
                </strong>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-900 border border-indigo-100">
                <span className="block text-xs uppercase tracking-wider mb-1">
                  Descanso
                </span>
                <strong className="text-2xl">
                  {results.gcp.data.sleep_hours}h
                </strong>
              </div>
              <p className="italic text-xs text-slate-500 mt-2 leading-relaxed">
                &quot;{results.gcp.data.recommendation}&quot;
              </p>
            </div>
          )}
          {results.gcp?.error && (
            <div className="mt-4 bg-red-50 text-red-700 border border-red-200 text-xs p-2 rounded">
              ❌ Serviço Indisponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
