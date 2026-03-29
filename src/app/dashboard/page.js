"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Toast from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";

export default function Dashboard() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState("dev");
  const [payAsYouGo, setPayAsYouGo] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editKeyName, setEditKeyName] = useState("");
  const [editKeyType, setEditKeyType] = useState("dev");
  const [editLimitUsage, setEditLimitUsage] = useState(false);
  const [editUsageLimit, setEditUsageLimit] = useState("1000");
  const [editPiiRestrictions, setEditPiiRestrictions] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const supabase = createClient();

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 2000);
  };

  const mapApiKeyFromDb = (row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    usage: row.usage ?? 0,
    key: row.key,
    created: row.created_at?.split?.("T")?.[0] ?? row.created_at,
    limitUsage: row.limit_usage ?? false,
    usageLimit: row.usage_limit?.toString() ?? "1000",
    piiRestrictions: row.pii_restrictions ?? false,
  });

  useEffect(() => {
    async function fetchApiKeys() {
      try {
        const { data, error } = await supabase.from("api_keys").select("*").order("id", { ascending: false });
        if (error) throw error;
        setApiKeys((data ?? []).map(mapApiKeyFromDb));
      } catch (err) {
        console.error("Failed to fetch API keys:", err);
        showToast("Failed to load API keys");
      } finally {
        setLoading(false);
      }
    }
    fetchApiKeys();
  }, []);

  const generateApiKey = (type) => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let key = `tvly-${type}-`;
    for (let i = 0; i < 20; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    const keyValue = generateApiKey(newKeyType);
    try {
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          name: newKeyName.trim(),
          type: newKeyType,
          key: keyValue,
          usage: 0,
        })
        .select()
        .single();
      if (error) throw error;
      setApiKeys((prev) => [mapApiKeyFromDb(data), ...prev]);
      setNewKeyName("");
      setNewKeyType("dev");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create API key:", err);
      showToast("Failed to create API key");
    }
  };

  const handleDeleteKey = async (id) => {
    try {
      const { error } = await supabase.from("api_keys").delete().eq("id", id);
      if (error) throw error;
      setApiKeys((prev) => prev.filter((key) => key.id !== id));
    } catch (err) {
      console.error("Failed to delete API key:", err);
      showToast("Failed to delete API key");
    }
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts or unsupported browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      showToast("Copied API Key to clipboard");
    } catch (err) {
      console.error("Failed to copy text: ", err);
      showToast("Failed to copy");
    }
  };

  const maskKey = (key) => {
    const parts = key.split("-");
    return `${parts[0]}-${parts[1]}-${"*".repeat(20)}`;
  };

  const toggleKeyVisibility = (id) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openEditModal = (apiKey) => {
    setEditingKey(apiKey);
    setEditKeyName(apiKey.name);
    setEditKeyType(apiKey.type);
    setEditLimitUsage(apiKey.limitUsage || false);
    setEditUsageLimit(apiKey.usageLimit || "1000");
    setEditPiiRestrictions(apiKey.piiRestrictions || false);
    setShowEditModal(true);
  };

  const handleEditKey = async () => {
    if (!editKeyName.trim() || !editingKey) return;

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .update({
          name: editKeyName.trim(),
          type: editKeyType,
          limit_usage: editLimitUsage,
          usage_limit: editUsageLimit ? parseInt(editUsageLimit, 10) : null,
          pii_restrictions: editPiiRestrictions,
        })
        .eq("id", editingKey.id)
        .select()
        .single();
      if (error) throw error;
      setApiKeys((prev) =>
        prev.map((key) => (key.id === editingKey.id ? mapApiKeyFromDb(data) : key))
      );
      setShowEditModal(false);
      setEditingKey(null);
    } catch (err) {
      console.error("Failed to update API key:", err);
      showToast("Failed to update API key");
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingKey(null);
    setEditKeyName("");
    setEditKeyType("dev");
    setEditLimitUsage(false);
    setEditUsageLimit("1000");
    setEditPiiRestrictions(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Pages</span>
            <span>/</span>
            <span className="text-gray-900">Overview</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-sm text-gray-600">Operational</span>
            </div>
            <a href="#" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {/* Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-blue-800">
              <a href="#" className="font-medium underline">Official Agent Skills for Claude Code are now available</a>
              {" "}- enabling real-time search, research, and content extraction directly in your terminal.
            </p>
          </div>

          {/* Plan Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8 relative overflow-hidden">
            {/* Background gradient decoration */}
            <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-bl from-teal-100/50 via-cyan-100/30 to-transparent rounded-bl-full"></div>
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  CURRENT PLAN
                </span>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Manage Plan
                </button>
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-6">Researcher</h1>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">API Usage</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monthly plan</span>
                  <span className="text-sm font-medium text-gray-900">0 / 1,000 Credits</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "0%" }}></div>
                </div>

                <label className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setPayAsYouGo(!payAsYouGo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      payAsYouGo ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        payAsYouGo ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-600">Pay as you go</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
              </div>
            </div>
          </div>

          {/* API Keys Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* API Keys Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Options
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((apiKey) => (
                    <tr key={apiKey.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4 text-sm text-gray-900">{apiKey.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{apiKey.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{apiKey.usage}</td>
                      <td className="px-6 py-4">
                        <code className="text-sm text-gray-600 font-mono">
                          {visibleKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleKeyVisibility(apiKey.id)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title={visibleKeys[apiKey.id] ? "Hide" : "View"}
                          >
                            {visibleKeys[apiKey.id] ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(apiKey.key)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Copy"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditModal(apiKey)}
                            className="p-2 text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteKey(apiKey.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && apiKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No API keys yet. Click + to create your first one.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., default, production"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Type</label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="dev">Development</option>
                  <option value="prod">Production</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewKeyName("");
                  setNewKeyType("dev");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
              >
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast({ show: false, message: "" })}
      />

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Edit API key</h2>
            <p className="text-gray-500 text-center mb-8">
              Enter a new limit for the API key and configure PII restrictions.
            </p>

            <div className="space-y-6">
              {/* Key Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Key Name <span className="text-gray-400 font-normal">— A unique name to identify this key</span>
                </label>
                <input
                  type="text"
                  value={editKeyName}
                  onChange={(e) => setEditKeyName(e.target.value)}
                  placeholder="default"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Key Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Key Type <span className="text-gray-400 font-normal">— Environment for this key</span>
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setEditKeyType("dev")}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      editKeyType === "dev"
                        ? "border-teal-500 bg-teal-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-gray-400 text-lg">&lt;/&gt;</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Development</div>
                      <div className="text-sm text-gray-500">Rate limited to 100 requests/minute</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setEditKeyType("prod")}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      editKeyType === "prod"
                        ? "border-teal-500 bg-teal-50/50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-gray-400 text-lg">⚡</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Production</div>
                      <div className="text-sm text-gray-500">Rate limited to 1000 requests/minute</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Limit Monthly Usage */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editLimitUsage}
                    onChange={(e) => setEditLimitUsage(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Limit monthly usage<span className="text-red-500">*</span>
                  </span>
                </label>
                {editLimitUsage && (
                  <input
                    type="text"
                    value={editUsageLimit}
                    onChange={(e) => setEditUsageLimit(e.target.value)}
                    placeholder="1000"
                    className="mt-3 w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900"
                  />
                )}
              </div>

              {/* PII Restrictions */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPiiRestrictions}
                    onChange={(e) => setEditPiiRestrictions(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">Enable PII Restrictions</span>
                    <span className="text-gray-400"> — Configure how to handle Personal Identifiable Information (PII) in user queries</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handleEditKey}
                className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={closeEditModal}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
