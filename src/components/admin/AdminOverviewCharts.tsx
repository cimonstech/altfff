"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAdminOverviewChartData,
  type AdminOverviewChartData,
  type ChartCountRow,
} from "@/lib/adminOverviewCharts";
import { ADMIN_CHART_COLORS, ADMIN_CHART_SERIES } from "@/lib/adminChartColors";

const CHANNEL_NAME = "admin-overview-charts";
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 30000;

const INTEREST_SHORT_LABELS: Record<string, string> = {
  materials: "Materials & innovation",
  leaders: "Industry leaders",
  learning: "Learning from experts",
  business: "Business opportunities",
  other: "Other",
};

const tooltipStyle = {
  backgroundColor: ADMIN_CHART_COLORS.surface,
  border: `1px solid ${ADMIN_CHART_COLORS.hairline}`,
  borderRadius: 8,
  color: ADMIN_CHART_COLORS.ink,
  fontSize: 12,
};

function ChartPanel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-md border border-hairline bg-surface p-4 sm:p-5 ${className}`}
      aria-label={title}
    >
      <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">{title}</h3>
      {subtitle ? <p className="mt-1 text-xs text-ink/55">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChartNote({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-md border border-dashed border-hairline bg-paper/60 px-4 text-center text-sm text-ink/50">
      {message}
    </div>
  );
}

function totalValue(rows: ChartCountRow[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}

function VerticalBarBreakdown({
  data,
  emptyMessage,
  color = ADMIN_CHART_COLORS.forest,
}: {
  data: ChartCountRow[];
  emptyMessage: string;
  color?: string;
}) {
  const total = totalValue(data);
  if (total === 0) {
    return <EmptyChartNote message={emptyMessage} />;
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={ADMIN_CHART_COLORS.hairline} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: 11 }}
            axisLine={{ stroke: ADMIN_CHART_COLORS.hairline }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(0,117,99,0.08)" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InterestBarBreakdown({ data }: { data: ChartCountRow[] }) {
  const chartData = data.map((row) => ({
    ...row,
    label: INTEREST_SHORT_LABELS[row.key] ?? row.label,
  }));
  const total = totalValue(chartData);

  if (total === 0) {
    return <EmptyChartNote message="No visitor interest responses yet." />;
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke={ADMIN_CHART_COLORS.hairline} horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: 11 }}
            axisLine={{ stroke: ADMIN_CHART_COLORS.hairline }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={132}
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(218,142,6,0.08)" }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={ADMIN_CHART_COLORS.gold}>
            {chartData.map((row, index) => (
              <Cell key={row.key} fill={ADMIN_CHART_SERIES[index % ADMIN_CHART_SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CheckInProgressChart({
  data,
  compact = false,
}: {
  data: AdminOverviewChartData["checkInProgress"];
  compact?: boolean;
}) {
  const peak = data.reduce((max, point) => Math.max(max, point.cumulative), 0);
  const yMax = Math.max(peak, 1);

  return (
    <div className={compact ? "h-[240px] w-full" : "h-[min(52vw,320px)] min-h-[240px] w-full"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="checkInAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ADMIN_CHART_COLORS.forest} stopOpacity={0.45} />
              <stop offset="100%" stopColor={ADMIN_CHART_COLORS.forest} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={ADMIN_CHART_COLORS.hairline} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: compact ? 10 : 11 }}
            axisLine={{ stroke: ADMIN_CHART_COLORS.hairline }}
            tickLine={false}
            minTickGap={compact ? 16 : 24}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            domain={[0, yMax]}
            tick={{ fill: ADMIN_CHART_COLORS.ink, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value ?? 0);
              return [`${n} checked in`, "Cumulative"];
            }}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={ADMIN_CHART_COLORS.forest}
            strokeWidth={2.5}
            fill="url(#checkInAreaFill)"
            dot={{ r: peak <= 8 ? 4 : 2, fill: ADMIN_CHART_COLORS.forest, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ADMIN_CHART_COLORS.gold }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {peak === 0 && (
        <p className="mt-2 text-center text-xs text-ink/50">
          Check-ins will plot here live as pre-registered visitors are scanned in.
        </p>
      )}
    </div>
  );
}

export default function AdminOverviewCharts({
  initialData,
}: {
  initialData: AdminOverviewChartData;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState(initialData);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const refetchCharts = useCallback(async () => {
    try {
      const next = await fetchAdminOverviewChartData(supabase);
      setData(next);
    } catch (err) {
      console.error("[AdminOverviewCharts] refetch failed", err);
    }
  }, [supabase]);

  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refetchCharts();
    }, 150);
  }, [refetchCharts]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempt = 0;
    let connecting = false;
    let intentionalTeardown = false;

    const syncRealtimeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await supabase.realtime.setAuth(session?.access_token ?? null);
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const teardownChannel = async () => {
      if (!channel) return;
      intentionalTeardown = true;
      const existing = channel;
      channel = null;
      await supabase.removeChannel(existing);
      intentionalTeardown = false;
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void subscribeChannel();
      }, delay);
    };

    const subscribeChannel = async () => {
      if (cancelled || connecting) return;
      connecting = true;
      clearReconnectTimer();

      try {
        await teardownChannel();
        await syncRealtimeAuth();
        if (cancelled) return;

        const nextChannel = supabase
          .channel(CHANNEL_NAME)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "visitor_registrations" },
            () => scheduleRefetch(),
          );

        channel = nextChannel;
        nextChannel.subscribe((status) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            return;
          }
          if (intentionalTeardown) return;
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            queueMicrotask(() => scheduleReconnect());
          }
        });
      } finally {
        connecting = false;
      }
    };

    void subscribeChannel();

    return () => {
      cancelled = true;
      clearReconnectTimer();
      void teardownChannel();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [supabase, scheduleRefetch]);

  return (
    <div className="mt-8 space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel title="Visitor interest" subtitle="Five fixed registration options">
          <InterestBarBreakdown data={data.visitorInterest} />
        </ChartPanel>

        <ChartPanel
          title="Live check-in progress"
          subtitle="Cumulative pre-registered check-ins · updates live"
          className="border-t-4 border-t-forest"
        >
          <CheckInProgressChart data={data.checkInProgress} compact />
        </ChartPanel>
      </div>

      <ChartPanel title="Visitor countries" subtitle="Top countries · remainder grouped as Other">
        <VerticalBarBreakdown
          data={data.country}
          emptyMessage="No country responses yet."
          color={ADMIN_CHART_COLORS.ink}
        />
      </ChartPanel>
    </div>
  );
}
