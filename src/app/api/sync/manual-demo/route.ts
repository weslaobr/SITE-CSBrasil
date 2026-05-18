import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import axios from "axios";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(getAuthOptions(req));

        if (!session || !(session.user as any)?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const { url, filePath } = data;

        let finalUrl = url;

        if (filePath) {
            // Estratégia 1: URL de download DIRETO da DatHost REST API (quando API key disponível)
            const dathostEmail = process.env.DATHOST_EMAIL;
            const dathostApiKey = process.env.DATHOST_API_KEY;
            const dathostServerId = process.env.DATHOST_SERVER_ID;

            const dathostApiConfigured = 
                dathostEmail && 
                dathostApiKey && 
                dathostServerId && 
                dathostApiKey !== 'COLOQUE_SUA_API_KEY_DA_DATHOST_AQUI';

            if (dathostApiConfigured) {
                // URL direta da DatHost REST API com Basic Auth embutido
                const encodedEmail = encodeURIComponent(dathostEmail!);
                const encodedKey = encodeURIComponent(dathostApiKey!);
                const encodedPath = encodeURIComponent(filePath);
                finalUrl = `https://${encodedEmail}:${encodedKey}@dathost.net/api/0.1/game-servers/${dathostServerId}/files/${encodedPath}`;
                console.log(`[ManualSync] Usando URL direta da DatHost REST API`);
            } else {
                // Estratégia 2: URL FTP direta — o Discloud (servidor Go persistente) pode fazer FTP
                const ftpHost = process.env.FTP_HOST;
                const ftpUser = process.env.FTP_USER;
                const ftpPass = process.env.FTP_PASS;
                const ftpPort = process.env.FTP_PORT || '21';

                if (ftpHost && ftpUser && ftpPass) {
                    const encodedUser = encodeURIComponent(ftpUser);
                    const encodedPass = encodeURIComponent(ftpPass);
                    finalUrl = `ftp://${encodedUser}:${encodedPass}@${ftpHost}:${ftpPort}/${filePath}`;
                    console.log(`[ManualSync] Usando URL FTP direta para o Discloud`);
                } else {
                    // Último fallback: via endpoint do site
                    const siteUrl = process.env.SITE_URL || 'https://www.tropacs.com.br';
                    const secret = process.env.SYNC_SECRET_TOKEN;
                    finalUrl = `${siteUrl}/api/server/demos/download?file=${encodeURIComponent(filePath)}&token=${secret}`;
                    console.log(`[ManualSync] Fallback via endpoint do site`);
                }
            }
        }

        if (!finalUrl || (!finalUrl.startsWith('http') && !finalUrl.startsWith('CSGO-'))) {
            return NextResponse.json({ error: "URL, Caminho ou Código de compartilhamento inválido." }, { status: 400 });
        }

        const userId = (session.user as any).id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { steamId: true }
        });

        const pythonApiUrl = process.env.PYTHON_API_URL || 'https://tropacsdemos.discloud.app';
        
        console.log(`[ManualSync] Encaminhando demo para o analisador: ${pythonApiUrl}`);
        
        const response = await axios.post(`${pythonApiUrl}/api/importer/import-match`, {
            steamid: user?.steamId || "0",
            auth_code: "manual",
            share_code: finalUrl
        }, { timeout: 15000 });

        return NextResponse.json({ success: true, python_response: response.data });
    } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.response?.data || error.message;
        console.error("Manual demo import error:", errorMsg);
        return NextResponse.json({ 
            error: "Falha ao comunicar com o servidor de processamento.",
            details: errorMsg
        }, { status: 500 });
    }
}
