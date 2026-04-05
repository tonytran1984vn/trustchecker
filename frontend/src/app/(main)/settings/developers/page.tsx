"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Key, Shield, Copy, Check, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetcher } from "@/lib/fetcher";

export default function DevelopersPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [ips, setIps] = useState<string[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isLoadingIps, setIsLoadingIps] = useState(true);

  // Modals & States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [ipInput, setIpInput] = useState("");
  const [isSavingIp, setIsSavingIp] = useState(false);

  // We don't need getHeaders anymore because fetcher does it automatically.

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const data = await fetcher("/api/v1/developers/keys");
      setKeys(data.api_keys || []);
    } catch (e) {
      console.error(e);
    }
    setIsLoadingKeys(false);
  };

  const loadIps = async () => {
    setIsLoadingIps(true);
    try {
      const data = await fetcher("/api/v1/developers/ip-whitelist");
      setIps(data.ips || []);
      setIpInput((data.ips || []).join(", "));
    } catch (e) {
      console.error(e);
    }
    setIsLoadingIps(false);
  };

  useEffect(() => {
    loadKeys();
    loadIps();
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetcher("/api/v1/developers/keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName }),
      });
      setGeneratedKey(data.api_key);
      setNewKeyName("");
      loadKeys();
    } catch (e) {
      alert("Error generating key.");
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;
    try {
      await fetcher(`/api/v1/developers/keys/${id}`, {
        method: "DELETE",
      });
      loadKeys();
    } catch (e) {
      alert("Error revoking key.");
    }
  };

  const handleSaveIps = async () => {
    setIsSavingIp(true);
    try {
      // split by comma, newline or space
      const parsedIps = ipInput.split(/[\s,]+/).map(ip => ip.trim()).filter(ip => ip.length > 0);
      await fetcher("/api/v1/developers/ip-whitelist", {
        method: "PUT",
        body: JSON.stringify({ ips: parsedIps }),
      });
      setIps(parsedIps);
      alert("Network policy updated successfully.");
    } catch (e) {
      alert("Error saving IP list.");
    }
    setIsSavingIp(false);
  };

  const copyToClipboard = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGeneratedKey(null);
  };

  return (
    <div className="space-y-10 pb-20 max-w-6xl">
      {/* ---------- API KEYS SECTION ---------- */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-500" />
              Machine-to-Machine Tokens
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Generate permanent API keys for integrating your backend services with TrustChecker.
            </p>
          </div>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate New Token
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-950 font-medium text-slate-900 dark:text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Prefix</th>
                <th className="px-6 py-4">Rate Limit</th>
                <th className="px-6 py-4">Last Used</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingKeys ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">Loading keys...</td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No active API keys found. Generate one to get started.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{k.name}</td>
                    <td className="px-6 py-4 font-mono text-xs">{k.key_prefix}...</td>
                    <td className="px-6 py-4">{k.rate_limit || 60} req/s</td>
                    <td className="px-6 py-4">
                      {k.last_used_at ? formatDistanceToNow(new Date(k.last_used_at), { addSuffix: true }) : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- IP ALLOW-LISTING SECTION ---------- */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            IP Allow-Listing (Firewall)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Restrict API and dashboard access to specific IPv4 addresses or CIDR blocks. Leave empty to allow global access.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          {isLoadingIps ? (
             <div className="text-sm text-slate-500">Loading network policies...</div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Allowed IP Addresses
                </label>
                <textarea
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="e.g. 192.168.1.1, 10.0.0.0/24"
                  className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Separate multiple IPs by comma, space, or newline.
                </p>
              </div>
              <button
                onClick={handleSaveIps}
                disabled={isSavingIp}
                className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {isSavingIp ? "Saving..." : "Save Network Policy"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ---------- MODALS ---------- */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-6">
            {!generatedKey ? (
              <form onSubmit={handleGenerateKey}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Generate API Key</h3>
                <p className="text-sm text-slate-500 mb-6">Give your key a descriptive name to track its usage.</p>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Name</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. ERP Integration Prod"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeGenerateModal}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                  <p className="text-sm font-medium">Please copy this API key now. For your security, it will never be shown again.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Your API Key</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey.token}
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={closeGenerateModal}
                    className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium rounded-lg w-full"
                  >
                    I have saved my key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
