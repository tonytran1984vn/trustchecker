"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Leaf, Award, BarChart3, Users } from "lucide-react";

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800";
  if (s >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800";
  if (s >= 40) return "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800";
  return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800";
}

function scoreTextColor(s: number) {
  if (s >= 80) return "text-emerald-500 font-bold";
  if (s >= 60) return "text-yellow-500 font-bold";
  if (s >= 40) return "text-orange-500 font-bold";
  return "text-red-500 font-bold";
}

function gradeBadge(g: string) {
  const isA = g === 'A+' || g === 'A';
  const isB = g === 'B';
  const isC = g === 'C';
  let color = isA ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
              isB ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
              isC ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                    "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${color}`}>{g}</span>;
}

export default function ImpactDashboard({ initialData }: { initialData: any }) {
  const s = initialData.stats || {};
  const scores = initialData.leaderboard || [];

  const kpis = [
    { label: 'Products Assessed', value: s.products_assessed || 0, color: 'text-slate-900 dark:text-white', dot: 'bg-indigo-500', icon: <BarChart3 className="w-5 h-5 text-indigo-500" /> },
    { label: 'Avg Score', value: Number(s.avg_score || 0).toFixed(1), color: 'text-emerald-600', dot: 'bg-emerald-500', icon: <Award className="w-5 h-5 text-emerald-500" /> },
    { label: 'Green Certs', value: s.certifications_issued || 0, color: 'text-purple-600', dot: 'bg-purple-500', icon: <Award className="w-5 h-5 text-purple-500" /> },
    { label: 'Avg Carbon', value: `${Number(s.avg_carbon_footprint || 0).toFixed(1)} kg`, color: 'text-orange-500', dot: 'bg-orange-500', icon: <Leaf className="w-5 h-5 text-orange-500" /> },
    { label: 'Platform Grade', value: s.platform_grade || '—', color: s.platform_grade === 'A' ? 'text-emerald-600' : 'text-yellow-600', dot: s.platform_grade === 'A' ? 'bg-emerald-500' : 'bg-yellow-500', icon: <Award className="w-5 h-5 text-emerald-500" /> },
  ];

  return (
    <div className="space-y-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((k, i) => (
          <Card key={i} className="relative overflow-hidden border-border shadow-sm group hover:shadow-md transition-all">
            <div className={`absolute top-0 w-full h-1 ${k.dot}`}></div>
            <CardContent className="p-6 flex flex-col items-center justify-center pt-6">
              <div className="mb-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-full">{k.icon}</div>
              <div className={`text-2xl font-black mb-1 ${k.color}`}>{k.value}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grade Distribution */}
      {s.grade_distribution && s.grade_distribution.length > 0 && (
        <Card className="border-border shadow-sm relative overflow-hidden">
          <CardHeader className="p-4 border-b bg-slate-50/50 pb-4">
             <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
               <BarChart3 className="w-5 h-5 text-indigo-600" /> Grade Distribution
             </CardTitle>
          </CardHeader>
          <CardContent className="p-6 flex flex-wrap gap-4 justify-center sm:justify-start">
            {s.grade_distribution.map((g: any, i: number) => {
              const isA = g.grade === 'A+' || g.grade === 'A';
              const isB = g.grade === 'B';
              const isC = g.grade === 'C';
              let cBg = isA ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" :
                        isB ? "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800" :
                        isC ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-800" :
                              "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800";
              let cText = isA ? "text-emerald-600" : isB ? "text-blue-600" : isC ? "text-yellow-600" : "text-red-600";
              
              return (
                <div key={i} className={`flex flex-col items-center justify-center px-6 py-4 border rounded-xl min-w-[90px] shadow-sm ${cBg}`}>
                  <div className={`text-3xl font-black mb-1 ${cText}`}>{g.count}</div>
                  <div className={`font-bold text-[10px] uppercase tracking-wider ${cText}`}>Grade {g.grade}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="border-border shadow-sm flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="p-4 border-b bg-slate-50/50 pb-4">
           <CardTitle className="font-bold flex items-center gap-2 text-base text-slate-900 dark:text-slate-100">
             <Users className="w-5 h-5 text-indigo-600" /> Sustainability Leaderboard
           </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {scores.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center w-12">#</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider">Product</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Carbon</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Water</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Recycl.</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Ethical</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Overall</TableHead>
                  <TableHead className="px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((r: any, i: number) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center font-bold text-muted-foreground">{r.rank}</TableCell>
                    <TableCell className="font-bold text-foreground">
                      {r.product_name || (r.product_id ? r.product_id.slice(0, 12) : '—')}
                    </TableCell>
                    <TableCell className={`text-center ${scoreTextColor(r.carbon_footprint)}`}>{r.carbon_footprint}</TableCell>
                    <TableCell className={`text-center ${scoreTextColor(r.water_usage)}`}>{r.water_usage}</TableCell>
                    <TableCell className={`text-center ${scoreTextColor(r.recyclability)}`}>{r.recyclability}</TableCell>
                    <TableCell className={`text-center ${scoreTextColor(r.ethical_sourcing)}`}>{r.ethical_sourcing}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 border rounded-md font-black text-xs ${scoreColor(r.overall_score)}`}>
                        {r.overall_score}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{gradeBadge(r.grade)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8 text-muted-foreground text-sm">No sustainability data available in the current environment.</div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}
