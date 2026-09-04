import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { gateway, isStepCount, Output, tool, ToolLoopAgent } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z.object({
  market: z.string().max(80),
  region: z.string().max(120),
  offers: z.array(z.record(z.string(), z.unknown())).max(50),
  opportunities: z.array(z.record(z.string(), z.unknown())).max(50),
  signals: z.array(z.record(z.string(), z.unknown())).max(50),
  companies: z.array(z.record(z.string(), z.unknown())).max(50),
  focus: z.string().max(500).optional().default(""),
});

const resultSchema = z.object({
  title: z.string().min(3).max(120),
  segment: z.string().min(2).max(100),
  summary: z.string().min(10).max(700),
  evidence: z.array(z.string().min(2).max(180)).min(2).max(5),
  score: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  nextSteps: z.array(z.string().min(2).max(180)).min(2).max(5),
  compliance: z.string().min(5).max(300),
});

type Input = z.infer<typeof inputSchema>;

function fallback(input: Input) {
  const topSignal = String(input.signals[0]?.signal ?? "рост интереса к быстрым и прозрачным предложениям");
  const company = String(input.companies[0]?.company ?? "целевых компаний");
  const score = Math.min(92, 68 + input.signals.length * 3 + input.offers.length);
  return {
    title: input.market.includes("B2B") ? "Пакет быстрого запуска для растущих компаний" : "Прозрачное предложение с быстрым результатом",
    segment: `${input.market} · ${input.region}`,
    summary: `Сформировать проверяемое предложение вокруг сигнала «${topSignal}» и протестировать его на сегменте ${company}.`,
    evidence: [`${input.signals.length} корпоративных сигналов`, `${input.offers.length} предложений конкурентов`, `${input.opportunities.length} рассчитанных рыночных разрывов`],
    score,
    confidence: Math.min(89, 70 + input.signals.length * 2),
    nextSteps: ["Проверить источники и актуальность evidence", "Собрать лендинг или оффер для сегмента", "Запустить тест только по разрешённым каналам"],
    compliance: "Не превращать агрегированные сигналы в персональные лиды; контакт разрешён только после policy/consent проверки.",
  };
}

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные входные данные" }, { status: 400 });
  const input = parsed.data;

  const onVercel = Boolean(process.env.VERCEL);
  if (!process.env.OPENAI_API_KEY && !onVercel) return NextResponse.json({ result: fallback(input), mode: "demo" });

  try {
    const agent = new ToolLoopAgent({
      model: onVercel ? gateway("openai/gpt-5.4-mini") : openai("gpt-5.4-mini"),
      instructions: "Ты LeadScope Opportunity Agent. Анализируй только переданные агрегированные коммерческие данные. Сначала используй инструменты обзора рынка и compliance, затем предложи одну конкретную возможность. Не делай персональных выводов, не предлагай холодный B2C outreach и не выдумывай доказательства. Отвечай по-русски.",
      tools: {
        inspectMarket: tool({ description: "Получить агрегированные метрики и рыночные данные", inputSchema: z.object({}), execute: async () => ({ market: input.market, region: input.region, offers: input.offers, opportunities: input.opportunities, signals: input.signals, companies: input.companies }) }),
        checkCompliance: tool({ description: "Получить обязательные ограничения для использования результата", inputSchema: z.object({}), execute: async () => ({ allowed: ["агрегированный анализ спроса", "B2B-компании как юрлица", "first-party лиды с согласием"], blocked: ["идентификация посетителей чужих сайтов", "контакт без consent/policy gate", "чувствительные персональные выводы"] }) }),
      },
      stopWhen: isStepCount(6),
      output: Output.object({ schema: resultSchema }),
    });
    const response = await agent.generate({ prompt: `Найди лучшую новую возможность. Дополнительный фокус пользователя: ${input.focus || "без дополнительного фокуса"}.` });
    return NextResponse.json({ result: response.output, mode: "ai", model: "gpt-5.4-mini" });
  } catch (error) {
    console.error("Opportunity agent failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ result: fallback(input), mode: "fallback" });
  }
}
