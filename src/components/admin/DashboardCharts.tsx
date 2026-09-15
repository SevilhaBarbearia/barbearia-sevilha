"use client";

import {
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  BarChart3,
  Clock3,
  CreditCard,
  TrendingUp,
} from "lucide-react";

import { formatarMoeda } from "@/lib/utils";

type Point = {
  label: string;
  value: number;
};

type BarberPerformance = {
  name: string;
  appointments: number;
  revenue: number;
};

type PaymentMethod = {
  key: string;
  label: string;
  count: number;
  amount: number;
};

function ChartShell({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ComponentType<{
    className?: string;
  }>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#1B2939] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-white sm:text-base">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>
        </div>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {children}
    </section>
  );
}

function AreaChart({
  data,
  money = false,
}: {
  data: Point[];
  money?: boolean;
}) {
  const [selected, setSelected] =
    useState<Point | null>(
      data.at(-1) ?? null,
    );

  const geometry = useMemo(() => {
    const width = 720;
    const height = 260;
    const left = 28;
    const right = 16;
    const top = 18;
    const bottom = 40;
    const chartWidth =
      width - left - right;
    const chartHeight =
      height - top - bottom;
    const max = Math.max(
      1,
      ...data.map(
        (item) => item.value,
      ),
    );

    const points = data.map(
      (item, index) => {
        const x =
          left +
          (data.length <= 1
            ? chartWidth / 2
            : (index /
                (data.length - 1)) *
              chartWidth);

        const y =
          top +
          chartHeight -
          (item.value / max) *
            chartHeight;

        return {
          ...item,
          x,
          y,
        };
      },
    );

    const line = points.length
      ? points
          .map(
            (point, index) =>
              `${index ? "L" : "M"} ${point.x.toFixed(
                2,
              )} ${point.y.toFixed(
                2,
              )}`,
          )
          .join(" ")
      : "";

    const area =
      points.length > 0
        ? `${line} L ${points.at(-1)!.x.toFixed(
            2,
          )} ${(height - bottom).toFixed(
            2,
          )} L ${points[0].x.toFixed(
            2,
          )} ${(height - bottom).toFixed(
            2,
          )} Z`
        : "";

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      max,
      points,
      line,
      area,
    };
  }, [data]);

  if (!data.length) {
    return (
      <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
        Ainda não há dados suficientes.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">
            Selecionado
          </p>

          <p className="mt-1 text-lg font-extrabold text-white">
            {selected
              ? money
                ? formatarMoeda(
                    selected.value,
                  )
                : selected.value
              : "—"}
          </p>
        </div>

        <p className="text-xs font-semibold text-amber-300">
          {selected?.label}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Gráfico interativo"
      >
        <defs>
          <linearGradient
            id="admin-area-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="currentColor"
              stopOpacity="0.36"
            />
            <stop
              offset="100%"
              stopColor="currentColor"
              stopOpacity="0.02"
            />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const y =
              geometry.top +
              (geometry.height -
                geometry.top -
                geometry.bottom) *
                ratio;

            return (
              <line
                key={ratio}
                x1={geometry.left}
                y1={y}
                x2={
                  geometry.width -
                  geometry.right
                }
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 5"
              />
            );
          },
        )}

        <path
          d={geometry.area}
          fill="url(#admin-area-gradient)"
          className="text-cyan-300"
        />

        <path
          d={geometry.line}
          fill="none"
          stroke="rgb(103 232 249)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {geometry.points.map(
          (point, index) => (
            <g
              key={`${point.label}-${index}`}
              tabIndex={0}
              role="button"
              aria-label={`${point.label}: ${
                money
                  ? formatarMoeda(
                      point.value,
                    )
                  : point.value
              }`}
              onClick={() =>
                setSelected(
                  point,
                )
              }
              onMouseEnter={() =>
                setSelected(
                  point,
                )
              }
              onFocus={() =>
                setSelected(
                  point,
                )
              }
              className="cursor-pointer outline-none"
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill="transparent"
              />

              <circle
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill="rgb(253 230 138)"
                stroke="rgb(23 34 49)"
                strokeWidth="3"
              >
                <title>
                  {point.label}:{" "}
                  {money
                    ? formatarMoeda(
                        point.value,
                      )
                    : point.value}
                </title>
              </circle>
            </g>
          ),
        )}

        {geometry.points
          .filter(
            (_point, index) =>
              index === 0 ||
              index ===
                geometry.points.length -
                  1 ||
              index %
                Math.max(
                  1,
                  Math.floor(
                    geometry.points.length /
                      5,
                  ),
                ) ===
                0,
          )
          .map((point) => (
            <text
              key={`label-${point.label}`}
              x={point.x}
              y={
                geometry.height - 10
              }
              textAnchor="middle"
              fontSize="10"
              fill="rgba(203,213,225,0.7)"
            >
              {point.label}
            </text>
          ))}
      </svg>
    </div>
  );
}

function BarberBars({
  data,
}: {
  data: BarberPerformance[];
}) {
  const [selected, setSelected] =
    useState(
      data[0] ?? null,
    );

  const max = Math.max(
    1,
    ...data.map(
      (item) => item.appointments,
    ),
  );

  if (!data.length) {
    return (
      <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
        Sem atendimentos concluídos no período.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((item) => (
        <button
          key={item.name}
          type="button"
          onClick={() =>
            setSelected(item)
          }
          className="group text-left"
        >
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-bold text-slate-200">
              {item.name}
            </span>

            <span className="font-extrabold text-amber-300">
              {item.appointments}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 transition-all duration-300 group-hover:brightness-110"
              style={{
                width: `${Math.max(
                  6,
                  (item.appointments /
                    max) *
                    100,
                )}%`,
              }}
            />
          </div>
        </button>
      ))}

      {selected && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="font-extrabold text-white">
            {selected.name}
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {
              selected.appointments
            }{" "}
            atendimentos concluídos
            •{" "}
            {formatarMoeda(
              selected.revenue,
            )}{" "}
            recebidos
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentDonut({
  data,
}: {
  data: PaymentMethod[];
}) {
  const total = data.reduce(
    (sum, item) =>
      sum + item.count,
    0,
  );

  const [selected, setSelected] =
    useState(
      data[0] ?? null,
    );

  const palette = [
    "#67e8f9",
    "#fde68a",
    "#94a3b8",
    "#34d399",
    "#c4b5fd",
  ];

  let cursor = 0;

  const gradient = data
    .map((item, index) => {
      const start =
        total > 0
          ? (cursor / total) *
            360
          : 0;

      cursor += item.count;

      const end =
        total > 0
          ? (cursor / total) *
            360
          : 0;

      return `${palette[index % palette.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  if (!data.length || total === 0) {
    return (
      <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
        Nenhum pagamento registrado.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-[170px_1fr] sm:items-center">
      <div
        className="mx-auto grid h-40 w-40 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${gradient})`,
        }}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-[#1B2939] text-center shadow-inner">
          <div>
            <strong className="block text-2xl text-white">
              {total}
            </strong>

            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
              pagamentos
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        {data.map(
          (item, index) => {
            const percent =
              total > 0
                ? Math.round(
                    (item.count /
                      total) *
                      100,
                  )
                : 0;

            return (
              <button
                type="button"
                key={item.key}
                onClick={() =>
                  setSelected(
                    item,
                  )
                }
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        palette[
                          index %
                            palette.length
                        ],
                    }}
                  />

                  <span className="truncate">
                    {item.label}
                  </span>
                </span>

                <strong className="text-xs text-white">
                  {percent}%
                </strong>
              </button>
            );
          },
        )}

        {selected && (
          <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-400">
            <strong className="text-white">
              {selected.label}
            </strong>
            : {selected.count}{" "}
            pagamentos •{" "}
            {formatarMoeda(
              selected.amount,
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export function DashboardCharts({
  revenue,
  barbers,
  payments,
  peakHours,
}: {
  revenue: Point[];
  barbers: BarberPerformance[];
  payments: PaymentMethod[];
  peakHours: Point[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <div className="xl:col-span-8">
        <ChartShell
          title="Faturamento dos últimos 30 dias"
          subtitle="Passe o mouse ou clique em um ponto para ver o valor do dia."
          icon={TrendingUp}
        >
          <AreaChart
            data={revenue}
            money
          />
        </ChartShell>
      </div>

      <div className="xl:col-span-4">
        <ChartShell
          title="Performance por barbeiro"
          subtitle="Atendimentos concluídos no período."
          icon={BarChart3}
        >
          <BarberBars
            data={barbers}
          />
        </ChartShell>
      </div>

      <div className="xl:col-span-5">
        <ChartShell
          title="Formas de pagamento"
          subtitle="Distribuição dos pagamentos concluídos."
          icon={CreditCard}
        >
          <PaymentDonut
            data={payments}
          />
        </ChartShell>
      </div>

      <div className="xl:col-span-7">
        <ChartShell
          title="Horários de maior pico"
          subtitle="Quantidade de atendimentos por horário."
          icon={Clock3}
        >
          <AreaChart
            data={peakHours}
          />
        </ChartShell>
      </div>
    </div>
  );
}
