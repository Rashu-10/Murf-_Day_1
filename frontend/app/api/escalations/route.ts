import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BACKEND_DIR = path.join(process.cwd(), '../backend');
const ESCALATIONS_JSON_PATH = path.join(BACKEND_DIR, 'escalations.json');

export const revalidate = 0;

export async function GET() {
  try {
    if (!fs.existsSync(ESCALATIONS_JSON_PATH)) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const fileContent = fs.readFileSync(ESCALATIONS_JSON_PATH, 'utf-8');
    const escalations = JSON.parse(fileContent || '[]');
    return NextResponse.json(escalations, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Error reading escalations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    // 1. Update SQLite via a Python one-liner (running uv run python)
    try {
      const pythonCommand = `uv run python -c "import sys; sys.path.append('src'); import database; database.update_escalation_status('${id}', '${status}')"`;
      execSync(pythonCommand, { cwd: BACKEND_DIR });
      console.log(`Successfully updated escalation ${id} to ${status} in SQLite database.`);
    } catch (dbError) {
      console.error('Failed to update SQLite database, falling back to JSON-only update:', dbError);
    }

    // 2. Fallback/Sync JSON directly in case DB update failed or needs immediate update
    if (fs.existsSync(ESCALATIONS_JSON_PATH)) {
      const fileContent = fs.readFileSync(ESCALATIONS_JSON_PATH, 'utf-8');
      const escalations = JSON.parse(fileContent || '[]');
      
      const updated = escalations.map((esc: any) => {
        if (esc.id === id) {
          return { ...esc, status };
        }
        return esc;
      });

      fs.writeFileSync(ESCALATIONS_JSON_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error('Error updating escalation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
