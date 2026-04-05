"use client";

import React, { useState, useEffect } from 'react';
import { GitCompare, CheckCircle2, XCircle, Loader2, AlertTriangle, Layers } from "lucide-react";
import { fetcher } from '@/lib/fetcher';

export default function DiffEnginePage() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
  const [verifyText, setVerifyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    setIsLoading(true);
    try {
      const res = await fetcher("/api/platform/diff-engine/models");
      setModels(res.models || []);
    } catch (err) {
      console.error("Failed to fetch pending models:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !modalAction) return;
    
    if (verifyText !== modalAction.toUpperCase()) {
      setErrorMsg(`Please type ${modalAction.toUpperCase()} to confirm.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await fetcher("/api/platform/diff-engine/approve", {
        method: 'POST',
        body: JSON.stringify({ modelId: selectedModel.id, decision: modalAction })
      });
      fetchModels();
      setModalAction(null);
      setSelectedModel(null);
      setVerifyText('');
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to ${modalAction}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto mb-10">
      <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Diff Engine (Algorithm Evaluation)
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Signature AI Model Ops. Monitor algorithmic drift and securely promote or reject pending machine learning model versions before they hit production traffic.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden mt-6 text-slate-600 dark:text-slate-300">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <GitCompare className="h-5 w-5" />
            </div>
            <h2 className="font-bold text-lg text-slate-900 dark:text-white">Pending Algorithm Pipeline</h2>
          </div>
          <span className="text-sm px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full border border-slate-200 dark:border-slate-700 font-bold">
            {isLoading ? 'Fetching...' : `${models.length} Pending`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Algorithmic Model</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Accuracy Validation</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Compute Latency</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-center">Institutional Risk</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Key Deltas</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-right">Human Judgment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">No pending algorithms stuck in staging.</td>
                </tr>
              ) : (
                models.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-200">{m.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{m.id}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-xs border border-emerald-100 dark:border-emerald-900/50 font-bold">
                        {m.accuracy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded text-xs border border-amber-100 dark:border-amber-900/50 font-bold">
                        {m.latency}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">
                      <span className={m.risk === 'High' ? 'text-red-600 dark:text-red-400' : m.risk === 'Medium' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {m.risk}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={m.changes}>
                        {m.changes}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedModel(m); setModalAction('approve'); setVerifyText(''); setErrorMsg(''); }}
                          className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-500 transition-colors"
                          title="Approve Promotion"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => { setSelectedModel(m); setModalAction('reject'); setVerifyText(''); setErrorMsg(''); }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-500 transition-colors"
                          title="Reject Model"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAction && selectedModel && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-6 border-b ${modalAction === 'approve' ? 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20' : 'border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20'}`}>
              <h3 className={`font-bold text-lg flex items-center gap-2 ${modalAction === 'approve' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                <AlertTriangle className="w-5 h-5" />
                Confirm Model {modalAction === 'approve' ? 'Promotion' : 'Rejection'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                You are about to <strong className="text-slate-900 dark:text-white uppercase">{modalAction}</strong> 
                <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 mx-1 rounded text-slate-800 dark:text-white font-semibold">{selectedModel.id}</span> 
                affecting live institutional traffic.
              </p>
            </div>
            <form onSubmit={handleProcess} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400 text-sm font-semibold">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  To proceed, type <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-800 dark:text-white font-semibold">{modalAction.toUpperCase()}</span> below:
                </label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  value={verifyText}
                  onChange={e => setVerifyText(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-indigo-500 rounded-lg text-sm text-slate-900 dark:text-white outline-none font-mono tracking-widest text-center"
                  placeholder={modalAction.toUpperCase()}
                  autoComplete="off"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setModalAction(null)} 
                  disabled={isSubmitting}
                  className="flex-1 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`flex-1 flex justify-center items-center py-2 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${modalAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Execute Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
