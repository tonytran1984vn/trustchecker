"use client";

import { useEffect, useState } from "react";
import BoardCommittees from "@/components/executive/BoardCommittees";

export default function Page() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("tc_token");
    fetch("/trustchecker/api/executive/board", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Board & Committees</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Structure the institutional board and assign policy oversight.</p>
        </div>
      </div>

      {error || !data ? (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-6 rounded-xl border border-red-200 dark:border-red-500/20 w-full text-center">
          <h2 className="font-semibold text-lg mb-2">Data Load Error</h2>
          <p className="text-sm">Cannot connect to the backend engine to retrieve configuration.</p>
        </div>
      ) : (
        <BoardCommittees data={data} />
      )}
    </div>
  );
}
