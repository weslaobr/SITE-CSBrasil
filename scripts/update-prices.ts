import { updatePricesFromSkinport } from '../src/services/price-service';

async function main() {
    console.log("=== SITE-CSBrasil: Atualizador de Preços ===");
    console.log("Objetivo: Buscar preços de referência na Skinport e salvar no Banco.");
    console.log("Isso resolve o problema de inventários sem valores.\n");

    const result = await updatePricesFromSkinport();

    if (result.success) {
        console.log("\n[SUCESSO] Preços atualizados!");
        console.log(`Total de itens processados: ${result.count}`);
    } else {
        console.log("\n[ERRO] Falha ao atualizar preços.");
    }

    process.exit(result.success ? 0 : 1);
}

main();
