import { NextRequest, NextResponse } from 'next/server';

const TRACKER_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  try {
    const res = await fetch(`${TRACKER_API}/api/match/${matchId}/ticks`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ ticks: [] }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Backend offline — retorna array vazio, o viewer mostrará o mapa sem jogadores
    return NextResponse.json({ ticks: [] });
  }
}
