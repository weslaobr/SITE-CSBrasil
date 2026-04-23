import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const webhookUrl = process.env.DISCORD_TEAM_ANNOUNCE_WEBHOOK;

    if (!webhookUrl) {
        return NextResponse.json({ error: "Webhook não configurado. Adicione DISCORD_TEAM_ANNOUNCE_WEBHOOK no .env" }, { status: 503 });
    }

    const body = await req.json();
    const { teamA, teamB, avgA, avgB, balanceMode } = body;

    if (!teamA || !teamB) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ratingLabel = balanceMode === "resenha" ? "⭐ Resenha" : "📊 SR";

    const formatList = (players: { nickname: string; rating: number; resenhaRating?: number }[]) =>
        players
            .map((p, i) => {
                const rating = balanceMode === "resenha"
                    ? `${(p.resenhaRating || 5).toFixed(1)} ⭐`
                    : `${p.rating} SR`;
                return `\`${String(i + 1).padStart(2, "0")}\` **${p.nickname}** — ${rating}`;
            })
            .join("\n");

    const embed = {
        title: "🎮 Times Sorteados — CS Brasil",
        color: 0x9333ea,
        fields: [
            {
                name: `🟡 Time A — Média ${ratingLabel}: ${avgA}`,
                value: teamA.length > 0 ? formatList(teamA) : "_Nenhum jogador_",
                inline: true,
            },
            {
                name: `🔵 Time B — Média ${ratingLabel}: ${avgB}`,
                value: teamB.length > 0 ? formatList(teamB) : "_Nenhum jogador_",
                inline: true,
            },
        ],
        footer: {
            text: "Sorteador de Times • CS Brasil",
        },
        timestamp: new Date().toISOString(),
    };

    const discordRes = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
        const text = await discordRes.text();
        console.error("Discord webhook error:", text);
        return NextResponse.json({ error: "Falha ao enviar para o Discord", detail: text }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
