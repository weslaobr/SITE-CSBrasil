import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const webhookUrl = process.env.DISCORD_TEAM_ANNOUNCE_WEBHOOK;

    if (!webhookUrl) {
        return NextResponse.json({ error: "Webhook não configurado. Adicione DISCORD_TEAM_ANNOUNCE_WEBHOOK no .env" }, { status: 503 });
    }

    const body = await req.json();
    const { teamA, teamB, avgA, avgB, balanceMode, mapName, pickMethod } = body;

    if (!teamA || !teamB) {
        return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ratingLabel = balanceMode === "resenha" ? "⭐" : "SR";

    const formatList = (players: { nickname: string; rating: number; resenhaRating?: number }[]) =>
        players
            .map((p, i) => {
                const rating = balanceMode === "resenha"
                    ? `${(p.resenhaRating || 5).toFixed(1)}`
                    : `${p.rating}`;
                return `**${p.nickname}** (${rating})`;
            })
            .join(", ");

    const embed = {
        title: "🎮 Partida Gerada — CS Brasil",
        color: 0x9333ea,
        description: `🗺️ **Mapa:** ${mapName || "A definir"} (${pickMethod || "Manual"})\n\n🤖 **Bot:** [Adicionar TropaCS](https://steamcommunity.com/id/tropacs) (receba o time no privado)\n🎭 **Skins:** [Customizar Skins](https://inventory.cstrike.app/)`,
        fields: [
            {
                name: `🟡 TIME TR (Média ${ratingLabel}: ${avgA})`,
                value: teamA.length > 0 ? formatList(teamA) : "_Vazio_",
            },
            {
                name: `🔵 TIME CT (Média ${ratingLabel}: ${avgB})`,
                value: teamB.length > 0 ? formatList(teamB) : "_Vazio_",
            },
        ],
        footer: {
            text: "TropaCS • Sorteador de Times",
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
