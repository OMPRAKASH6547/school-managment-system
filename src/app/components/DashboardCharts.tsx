"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#dc2626"]; // blue, red

export function DashboardCharts({
  classStrength,
  boys,
  girls,
}: {
  classStrength: { name: string; strength: number }[];
  boys: number;
  girls: number;
}) {
  const genderData = [
    { name: "Boys", value: boys, color: COLORS[0] },
    { name: "Girls", value: girls, color: COLORS[1] },
  ].filter((d) => d.value > 0);

  return (
    <div className="mt-8 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-primary-600 px-3 py-2 sm:px-4 sm:py-3">
          <h2 className="text-base sm:text-lg font-semibold text-white">Class Strength</h2>
        </div>
        <div className="p-2 sm:p-4 h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classStrength.length ? classStrength : [{ name: "No data", strength: 0 }]}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="strength" fill="#2563eb" radius={[4, 4, 0, 0]} name="Students" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-[#2563eb] px-3 py-2 sm:px-4 sm:py-3">
          <h2 className="text-base sm:text-lg font-semibold text-white">Gender Ratio</h2>
        </div>
        <div className="p-2 sm:p-4 h-64 sm:h-80">
          {genderData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {genderData.map((entry, index) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              No gender data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
