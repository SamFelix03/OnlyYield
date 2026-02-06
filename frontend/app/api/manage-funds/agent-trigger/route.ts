import { NextResponse } from "next/server";

const AGENT_URL = "https://yieldagent-739298578243.us-central1.run.app/analyze";

export async function POST() {
  try {
    const res = await fetch(AGENT_URL, { method: "POST" });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, body: text }, { status: 500 });
    }
    return NextResponse.json({ ok: true, status: res.status, body: text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

