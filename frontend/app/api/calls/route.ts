import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKEND_DIR = path.join(process.cwd(), '../backend');
const CALLS_JSON_PATH = path.join(BACKEND_DIR, 'calls.json');

export const revalidate = 0;

const DEFAULT_CALLS = [
  {
    id: "CALL-1001",
    caller_id: "sip:rashu@sip.linphone.org",
    caller_name: "Rashu",
    status: "successful",
    duration_seconds: 145,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    notes: "Medication reminder confirmed",
    channel: "sip",
    language: "English",
    triage_level: "Routine",
    agent_latency_ms: 780
  },
  {
    id: "CALL-1002",
    caller_id: "sip:john@sip.linphone.org",
    caller_name: "John Doe",
    status: "successful",
    duration_seconds: 98,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    notes: "General wellness inquiry answered",
    channel: "browser",
    language: "Hindi",
    triage_level: "Routine",
    agent_latency_ms: 820
  },
  {
    id: "CALL-1003",
    caller_id: "sip:priya@sip.linphone.org",
    caller_name: "Priya Sharma",
    status: "failed",
    duration_seconds: 12,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    notes: "Call disconnected unexpectedly",
    channel: "browser",
    language: "Telugu",
    triage_level: "Urgent",
    agent_latency_ms: 910,
    failure_reason: "Incomplete Task"
  },
  {
    id: "CALL-1004",
    caller_id: "sip:rashu@sip.linphone.org",
    caller_name: "Rashu",
    status: "successful",
    duration_seconds: 210,
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    notes: "Triage symptom check completed",
    channel: "sip",
    language: "English",
    triage_level: "Emergency",
    agent_latency_ms: 750
  },
  {
    id: "CALL-1005",
    caller_id: "sip:alex@sip.linphone.org",
    caller_name: "Alex Smith",
    status: "failed",
    duration_seconds: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    notes: "Network connection timeout",
    channel: "browser",
    language: "English",
    triage_level: "Routine",
    agent_latency_ms: 1200,
    failure_reason: "Incomplete Task"
  }
];

function getCallsFromJSON() {
  if (!fs.existsSync(CALLS_JSON_PATH)) {
    try {
      fs.writeFileSync(CALLS_JSON_PATH, JSON.stringify(DEFAULT_CALLS, null, 2), 'utf-8');
    } catch (e) {}
    return DEFAULT_CALLS;
  }
  try {
    const data = fs.readFileSync(CALLS_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(data || '[]');
    return parsed.length > 0 ? parsed : DEFAULT_CALLS;
  } catch (e) {
    return DEFAULT_CALLS;
  }
}

function calculateStats(calls: any[]) {
  const total_calls = calls.length;
  const successful_calls = calls.filter((c: any) => c.status === 'successful').length;
  const failed_calls = calls.filter((c: any) => c.status === 'failed').length;
  const success_rate = total_calls > 0 ? Number(((successful_calls / total_calls) * 100).toFixed(1)) : 0.0;
  
  const total_latency = calls.reduce((acc, c) => acc + (c.agent_latency_ms || 850), 0);
  const avg_latency = total_calls > 0 ? Number((total_latency / total_calls / 1000).toFixed(2)) : 0.85;

  return {
    total_calls,
    successful_calls,
    failed_calls,
    success_rate,
    avg_latency
  };
}

export async function GET() {
  const calls = getCallsFromJSON();
  const stats = calculateStats(calls);

  return NextResponse.json({
    ...stats,
    calls
  }, {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const status = body.status === 'failed' ? 'failed' : 'successful';
    const caller_name = body.caller_name || 'Rashu';
    const caller_id = body.caller_id || `sip:${caller_name.toLowerCase()}@sip.linphone.org`;
    const duration_seconds = typeof body.duration_seconds === 'number' ? body.duration_seconds : Math.floor(Math.random() * 120) + 30;
    const notes = body.notes || (status === 'successful' ? 'Call completed successfully' : 'Connection dropped or error');

    const call_id = `CALL-${Math.floor(1000 + Math.random() * 9000)}`;
    const created_at = new Date().toISOString();

    const calls = getCallsFromJSON();
    const newCall = {
      id: call_id,
      caller_id,
      caller_name,
      status,
      duration_seconds,
      created_at,
      notes,
      channel: body.channel || 'browser',
      language: body.language || 'English',
      triage_level: body.triage_level || 'Routine',
      agent_latency_ms: body.agent_latency_ms || Math.floor(Math.random() * 300) + 650
    };
    calls.unshift(newCall);

    try {
      fs.writeFileSync(CALLS_JSON_PATH, JSON.stringify(calls, null, 2), 'utf-8');
    } catch (e) {}

    const stats = calculateStats(calls);

    return NextResponse.json({
      success: true,
      new_call: newCall,
      ...stats,
      calls
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
