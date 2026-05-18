import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const guildId = process.env.DISCORD_GUILD_ID || "1148027793834258482";

    try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`, {
            next: { revalidate: 30 } // Cache for 30 seconds
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.code === 50004) {
                return NextResponse.json({ 
                    success: false, 
                    error: "widget_disabled", 
                    message: "Widget do Discord desabilitado. Ative-o nas configurações do servidor." 
                }, { status: 200 });
            }
            return NextResponse.json({ 
                success: false, 
                error: "unknown_guild", 
                message: `Discord API erro: ${data.message || response.statusText}` 
            }, { status: 200 });
        }

        // Return successful list of online members
        return NextResponse.json({
            success: true,
            guildName: data.name,
            instantInvite: data.instant_invite,
            members: data.members || []
        });

    } catch (error: any) {
        console.error("Failed to fetch Discord widget:", error);
        return NextResponse.json({ 
            success: false, 
            error: "fetch_failed", 
            message: "Falha na conexão com a API do Discord" 
        }, { status: 500 });
    }
}
