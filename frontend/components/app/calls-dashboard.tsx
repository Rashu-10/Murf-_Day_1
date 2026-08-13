'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PhoneCall, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Mic, 
  Search,
  AlertCircle,
  Radio
} from 'lucide-react';
import { NavbarHeader } from '@/components/app/navbar-header';

interface CallRecord {
  id: string;
  caller_id: string;
  caller_name: string;
  status: 'successful' | 'failed';
  duration_seconds: number;
  created_at: string;
  notes: string;
  channel?: 'browser' | 'sip';
  language?: string;
  triage_level?: 'Emergency' | 'Urgent' | 'Routine';
  agent_latency_ms?: number;
  failure_reason?: string | null;
}

interface CallStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  success_rate: number;
  avg_latency?: number;
  channel_breakdown?: {
    browser: number;
    sip: number;
  };
  failure_categories?: {
    user_declined: number;
    incomplete_task: number;
    technical_error: number;
    escalation_timeout: number;
  };
  calls: CallRecord[];
}

export function CallsDashboard() {
  const [data, setData] = useState<CallStats>({
    total_calls: 3,
    successful_calls: 1,
    failed_calls: 2,
    success_rate: 33.3,
    avg_latency: 0.85,
    channel_breakdown: { browser: 2, sip: 1 },
    failure_categories: {
      user_declined: 0,
      incomplete_task: 2,
      technical_error: 0,
      escalation_timeout: 0
    },
    calls: []
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [channelFilter, setChannelFilter] = useState<'all' | 'browser' | 'sip'>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [mounted, setMounted] = useState<boolean>(false);

  const fetchCallMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calls', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load call metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCallMetrics();
    const interval = setInterval(fetchCallMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateCall = async (status: 'successful' | 'failed', channelOverride?: 'browser' | 'sip') => {
    setSimulating(true);
    try {
      const callerNames = ['Rashu', 'Anita Rao', 'Vikram Patel', 'Suresh Kumar', 'Deepa Reddy', 'Sunil Verma'];
      const languages = ['English', 'Hindi', 'Telugu', 'Kannada', 'Tamil', 'Bengali'];
      const triages: ('Emergency' | 'Urgent' | 'Routine')[] = ['Routine', 'Urgent', 'Emergency'];

      const randomCaller = callerNames[Math.floor(Math.random() * callerNames.length)];
      const randomLang = languages[Math.floor(Math.random() * languages.length)];
      const randomTriage = triages[Math.floor(Math.random() * triages.length)];
      const channel = channelOverride || (Math.random() > 0.5 ? 'browser' : 'sip');

      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          caller_name: randomCaller,
          channel,
          language: randomLang,
          triage_level: randomTriage,
          duration_seconds: status === 'successful' ? Math.floor(Math.random() * 180) + 45 : Math.floor(Math.random() * 15) + 3,
          agent_latency_ms: Math.floor(Math.random() * 300) + 650,
          failure_reason: status === 'failed' ? 'Incomplete Task' : null,
          notes: status === 'successful' 
            ? `${randomTriage} triage & health consultation completed` 
            : 'Call ended before success criteria'
        })
      });

      if (res.ok) {
        await fetchCallMetrics();
      }
    } catch (err) {
      console.error('Failed to record simulated call:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleClearLog = async () => {
    if (confirm('Are you sure you want to clear call history log?')) {
      setData(prev => ({
        ...prev,
        calls: [],
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        success_rate: 0
      }));
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formatDate = (isoString: string) => {
    if (!mounted) return isoString;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + date.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  const filteredCalls = (data.calls || []).filter((call) => {
    const callChannel = (call.channel || 'browser').toLowerCase();
    const matchesChannel = channelFilter === 'all' || callChannel === channelFilter;
    const matchesLanguage = languageFilter === 'all' || (call.language || 'English') === languageFilter;
    const matchesSearch = 
      call.caller_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChannel && matchesLanguage && matchesSearch;
  });

  const successPercentage = data.success_rate || 0;
  const failureCount = data.failure_categories?.incomplete_task || data.failed_calls || 0;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div className="h-20 bg-white rounded-lg animate-pulse border border-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-white rounded-lg animate-pulse border border-slate-200" />
            <div className="h-32 bg-white rounded-lg animate-pulse border border-slate-200" />
            <div className="h-32 bg-white rounded-lg animate-pulse border border-slate-200" />
            <div className="h-32 bg-white rounded-lg animate-pulse border border-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 font-sans pb-16">
      {/* Top Header & Dark Navy Navigation Bar */}
      <NavbarHeader 
        activeTab="dashboard" 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Title & Action Buttons Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📈</span>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Call Performance Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time statistics of successful MediBuddy health consultations, symptom triages, and support escalations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleClearLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              Clear Log
            </button>

            <button
              onClick={fetchCallMetrics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white shadow-2xs transition-all cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              Start Call
            </Link>
          </div>
        </div>

        {/* Filters Bar: Channel & Language */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center gap-6 text-xs">
          {/* Channel Filters */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Channel:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                onClick={() => setChannelFilter('all')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  channelFilter === 'all' 
                    ? 'bg-[#003B73] text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter('browser')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  channelFilter === 'browser' 
                    ? 'bg-[#003B73] text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Browser
              </button>
              <button
                onClick={() => setChannelFilter('sip')}
                className={`px-3 py-1 rounded font-semibold transition-all ${
                  channelFilter === 'sip' 
                    ? 'bg-[#003B73] text-white shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sip
              </button>
            </div>
          </div>

          {/* Language Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-600">Language:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {['all', 'English', 'Hindi', 'Telugu', 'Kannada', 'Tamil', 'Bengali'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-2.5 py-1 rounded font-semibold border transition-all capitalize ${
                    languageFilter === lang
                      ? 'bg-[#003B73] text-white border-[#003B73]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 KPI Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL CALLS (Blue Accent) */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs border-t-4 border-t-[#0284C7] relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TOTAL CALLS</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{data.total_calls}</h3>
                <p className="text-[11px] text-slate-500 mt-1">All connected calls</p>
              </div>
              <div className="p-3 rounded-full bg-sky-50 text-sky-600">
                <PhoneCall className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 2: SUCCESSFUL CALLS (Green Accent) */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs border-t-4 border-t-[#16A34A] relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SUCCESSFUL CALLS</p>
                <h3 className="text-3xl font-extrabold text-[#16A34A] mt-1">{data.successful_calls}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Checks / escalations completed</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-50 text-[#16A34A]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 3: FAILED CALLS (Red Accent) */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs border-t-4 border-t-[#E11D48] relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">FAILED CALLS</p>
                <h3 className="text-3xl font-extrabold text-[#E11D48] mt-1">{data.failed_calls}</h3>
                <p className="text-[11px] text-slate-500 mt-1">Ended before success criteria</p>
              </div>
              <div className="p-3 rounded-full bg-rose-50 text-[#E11D48]">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Card 4: AVG AGENT LATENCY (Yellow Accent) */}
          <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-2xs border-t-4 border-t-[#D97706] relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">AVG AGENT LATENCY</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                  {data.avg_latency ? `${data.avg_latency}s` : '0s'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">Avg speech response time</p>
              </div>
              <div className="p-3 rounded-full bg-amber-50 text-[#D97706]">
                <Radio className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Analytics Row: Donut Chart & Failure Categories Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Box: SUCCESS RATE & CHANNEL */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              SUCCESS RATE & CHANNEL
            </h3>

            <div className="flex flex-col items-center justify-center py-4">
              {/* Semi-Circle / Gauge SVG */}
              <div className="relative w-48 h-28 flex items-center justify-center">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E2E8F0"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Progress Circle Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#16A34A"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * successPercentage) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center mt-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {successPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Overall Rate</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#16A34A]"></span>
                  <span>Successful ({data.successful_calls})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#E11D48]"></span>
                  <span>Failed ({data.failed_calls})</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-around text-xs text-slate-500">
                <div>
                  <span className="font-bold text-slate-800">Browser:</span> {data.channel_breakdown?.browser || 0} calls
                </div>
                <div>
                  <span className="font-bold text-slate-800">SIP:</span> {data.channel_breakdown?.sip || 0} calls
                </div>
              </div>
            </div>
          </div>

          {/* Right Box: FAILURE CATEGORIES BREAKDOWN */}
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                FAILURE CATEGORIES BREAKDOWN
              </h3>

              <div className="space-y-5 py-2">
                {/* Category 1: User Declined */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>User Declined</span>
                    <span className="text-slate-500">
                      {data.failure_categories?.user_declined || 0} calls (0%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full" 
                      style={{ width: `${data.failed_calls > 0 ? ((data.failure_categories?.user_declined || 0) / data.failed_calls) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Category 2: Incomplete Task */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Incomplete Task</span>
                    <span className="text-slate-500">
                      {failureCount} calls ({data.failed_calls > 0 ? Math.round((failureCount / data.failed_calls) * 100) : 100}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full" 
                      style={{ width: `${data.failed_calls > 0 ? (failureCount / data.failed_calls) * 100 : (data.failed_calls > 0 ? 100 : 0)}%` }}
                    />
                  </div>
                </div>

                {/* Category 3: Technical Error */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Technical Error / Carrier Timeout</span>
                    <span className="text-slate-500">
                      {data.failure_categories?.technical_error || 0} calls (0%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${data.failed_calls > 0 ? ((data.failure_categories?.technical_error || 0) / data.failed_calls) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Category 4: Escalation Timeout */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Human Escalation Timeout</span>
                    <span className="text-slate-500">
                      {data.failure_categories?.escalation_timeout || 0} calls (0%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${data.failed_calls > 0 ? ((data.failure_categories?.escalation_timeout || 0) / data.failed_calls) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic border-t border-slate-100 pt-3 mt-4">
              Failure categories are updated automatically based on post-call triage resolution and LiveKit session completion.
            </p>
          </div>
        </div>

        {/* Live Simulation Action Banner & Call Log Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          {/* Header Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search caller, ID, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Showing {filteredCalls.length} of {data.calls?.length || 0} calls
              </span>
            </div>

            {/* Simulation Quick Buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Test Simulation:</span>
              <button
                onClick={() => handleSimulateCall('successful', 'browser')}
                disabled={simulating}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all cursor-pointer"
              >
                + Browser Call
              </button>

              <button
                onClick={() => handleSimulateCall('successful', 'sip')}
                disabled={simulating}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 transition-all cursor-pointer"
              >
                + SIP Trunk Call
              </button>

              <button
                onClick={() => handleSimulateCall('failed')}
                disabled={simulating}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all cursor-pointer"
              >
                + Failed Call
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Call ID</th>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4">Triage Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4">Notes / Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No calls matching filters found.
                    </td>
                  </tr>
                ) : (
                  filteredCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {call.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {call.caller_name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (call.channel || 'browser') === 'sip' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {call.channel || 'browser'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {call.language || 'English'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          call.triage_level === 'Emergency' 
                            ? 'bg-rose-100 text-rose-800'
                            : call.triage_level === 'Urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {call.triage_level || 'Routine'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          call.status === 'successful'
                            ? 'bg-emerald-100 text-[#16A34A]'
                            : 'bg-rose-100 text-[#E11D48]'
                        }`}>
                          {call.status === 'successful' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Successful
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {formatDuration(call.duration_seconds)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(call.created_at)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs truncate" title={call.notes}>
                        {call.notes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
