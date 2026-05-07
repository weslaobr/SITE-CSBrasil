import asyncio
import logging
import sys
import os

# Adiciona o diretório atual ao sys.path para importar os módulos da app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import AsyncSessionLocal
from app.services.faceit_service import FaceitService
from sqlalchemy import text
from dotenv import load_dotenv

# Carrega o .env da raiz do projeto
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root_path, '.env'))

# Configuração de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def update_all_users_faceit():
    logger.info("Iniciando atualização global de níveis FACEIT...")
    
    async with AsyncSessionLocal() as db:
        # 1. Busca todos os usuários com SteamID - Especificando o schema public
        result = await db.execute(text('SELECT id, "steamId", "name" FROM public."User" WHERE "steamId" IS NOT NULL'))
        users = result.fetchall()
        
        logger.info(f"Encontrados {len(users)} usuários para verificar.")
        
        updated_count = 0
        not_found_count = 0
        
        for user_id, steam_id, name in users:
            logger.info(f"Verificando FACEIT para {name} ({steam_id})...")
            
            faceit_info = FaceitService.get_player_info(steam_id)
            
            if faceit_info:
                # 2. Atualiza os dados na tabela User
                update_user_stmt = text("""
                    UPDATE public."User" 
                    SET "faceitLevel" = :level, 
                        "faceitElo" = :elo, 
                        "faceitNickname" = :nickname
                    WHERE id = :user_id
                """)
                
                await db.execute(update_user_stmt, {
                    "level": faceit_info["faceit_level"],
                    "elo": faceit_info["faceit_elo"],
                    "nickname": faceit_info["faceit_nickname"],
                    "user_id": user_id
                })

                # 3. Atualiza os dados na tabela Stats (usada pelo Ranking)
                # Primeiro precisamos encontrar o playerId vinculado a esse steamId
                player_result = await db.execute(text('SELECT id FROM public."Player" WHERE "steamId" = :steam_id'), {"steam_id": steam_id})
                player = player_result.fetchone()
                
                if player:
                    player_id = player[0]
                    update_stats_stmt = text("""
                        UPDATE public."Stats" 
                        SET "faceitLevel" = :level, 
                            "faceitElo" = :elo
                        WHERE "playerId" = :player_id
                    """)
                    await db.execute(update_stats_stmt, {
                        "level": faceit_info["faceit_level"],
                        "elo": faceit_info["faceit_elo"],
                        "player_id": player_id
                    })
                    logger.info(f"   -> Stats atualizado para Player ID: {player_id}")
                
                logger.info(f"✅ Atualizado: {name} -> Level {faceit_info['faceit_level']} ({faceit_info['faceit_elo']} Elo)")
                updated_count += 1
            else:
                logger.info(f"ℹ️ {name} não possui conta FACEIT vinculada ou erro na API.")
                not_found_count += 1
            
            # Pequeno delay para evitar rate limit agressivo (opcional, FACEIT permite bastante)
            await asyncio.sleep(0.2)
            
        await db.commit()
        
    logger.info(f"Fim da atualização. Atualizados: {updated_count}, Não encontrados/erro: {not_found_count}")

if __name__ == "__main__":
    asyncio.run(update_all_users_faceit())
