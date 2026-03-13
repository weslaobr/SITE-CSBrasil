import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

let cache: { rate: number; bcbRate: number; updatedAt: string; timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 min

export async function GET(req: NextRequest) {
    // Retorna cache se válido
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        return NextResponse.json(cache);
    }

    try {
        // 1. AwesomeAPI — taxa em tempo real
        const awesomeRes = await axios.get('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
            timeout: 6000
        });
        const awesomeData = awesomeRes.data?.USDBRL;
        const realTimeRate = parseFloat(awesomeData?.bid || '0');
        const createDate = awesomeData?.create_date || new Date().toISOString();

        // 2. BCB/PTAX — taxa oficial do último dia útil (fallback ou referência)
        let bcbRate = 0;
        try {
            // Tentar os últimos 3 dias úteis
            for (let daysBack = 1; daysBack <= 5; daysBack++) {
                const d = new Date();
                d.setDate(d.getDate() - daysBack);
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const yyyy = d.getFullYear();
                const bcbUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${mm}-${dd}-${yyyy}'&$format=json`;
                const bcbRes = await axios.get(bcbUrl, { timeout: 5000 });
                const values = bcbRes.data?.value;
                if (values && values.length > 0) {
                    bcbRate = values[values.length - 1].cotacaoVenda;
                    break;
                }
            }
        } catch (_) { /* silencioso */ }

        const result = {
            rate: realTimeRate || bcbRate,
            bcbRate,
            updatedAt: createDate,
            timestamp: Date.now()
        };

        cache = result;
        return NextResponse.json(result);
    } catch (error: any) {
        // Fallback: BCB apenas
        try {
            for (let daysBack = 1; daysBack <= 5; daysBack++) {
                const d = new Date();
                d.setDate(d.getDate() - daysBack);
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const yyyy = d.getFullYear();
                const bcbUrl = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${mm}-${dd}-${yyyy}'&$format=json`;
                const bcbRes = await axios.get(bcbUrl, { timeout: 5000 });
                const values = bcbRes.data?.value;
                if (values && values.length > 0) {
                    const r = values[values.length - 1].cotacaoVenda;
                    const result = { rate: r, bcbRate: r, updatedAt: new Date().toISOString(), timestamp: Date.now() };
                    cache = result;
                    return NextResponse.json(result);
                }
            }
        } catch (_) {}

        return NextResponse.json({ rate: 5.2, bcbRate: 5.2, updatedAt: new Date().toISOString(), timestamp: Date.now() }, { status: 503 });
    }
}
