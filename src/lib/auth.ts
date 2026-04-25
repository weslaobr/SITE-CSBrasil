import NextAuth, { getServerSession } from "next-auth";
import SteamProvider from "next-auth-steam";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthOptions } from "next-auth";
import { NextRequest } from "next/server";

export function getAuthOptions(req?: NextRequest): NextAuthOptions {
    const adapter = PrismaAdapter(prisma) as any;

    if (adapter.linkAccount) {
        const originalLinkAccount = adapter.linkAccount;
        adapter.linkAccount = async (account: any) => {
            if ('steamId' in account) {
                delete account.steamId;
            }
            return originalLinkAccount(account);
        };
    }

    return {
        adapter: adapter,
        providers: [
            {
                ...(() => {
                    // Na Vercel, o NEXTAUTH_URL nem sempre é necessário se as URLs de callback forem relativas
                    // ou se basearem no host da requisição.
                    const url = req ? new URL(req.url) : null;
                    const protocol = (url?.protocol === 'http:' && (url.hostname.includes('localhost') || url.hostname === '127.0.0.1')) ? 'http:' : 'https:';
                    const host = url ? url.host : (process.env.NEXTAUTH_URL?.replace('https://', '')?.replace('http://', '') || '');
                    const origin = host ? `${protocol}//${host}` : process.env.NEXTAUTH_URL;
                    
                    return SteamProvider(req || {} as any, {
                        clientSecret: process.env.STEAM_API_KEY!,
                        callbackUrl: `${origin}/api/auth/callback/steam`,
                        profile(profile: any) {
                            return {
                                id: profile.steamid,
                                name: profile.personaname,
                                email: `${profile.steamid}@steam.local`,
                                image: profile.avatarfull,
                                steamId: profile.steamid,
                            }
                        }
                    } as any);
                })(),
                allowDangerousEmailAccountLinking: true,
            },
        ],
        callbacks: {
            async session({ session, user }) {
                if (session.user) {
                    (session.user as any).id = user.id;
                    (session.user as any).steamId = (user as any).steamId;
                    (session.user as any).faceitNickname = (user as any).faceitNickname;
                    (session.user as any).isAdmin = (user as any).isAdmin || (user as any).steamId === process.env.ADMIN_STEAM_ID;
                }
                return session;
            },
            async signIn({ user, account, profile }) {
                if (account?.provider === "steam") {
                    // Garante que o steamId do perfil da Steam seja salvo no model User
                    const steamId = account.providerAccountId;
                    (user as any).steamId = steamId;
                    
                    // Se o usuário já existe no banco (login recorrente), garantimos que o steamId está lá
                    // Se for novo, o PrismaAdapter criará, mas o steamId pode não ser salvo automaticamente 
                    // se o adapter não estiver configurado para campos customizados.
                    // Esta atualização manual garante a consistência.
                    if (user.id) {
                        try {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { steamId: steamId }
                            });
                        } catch (e) {
                            console.error("Error updating steamId on signin:", e);
                        }
                    }
                }
                return true;
            },
        },
        events: {
            async createUser({ user }) {
                // Quando um novo usuário é criado via Steam, o profile() retorna steamId, 
                // mas o PrismaAdapter padrão pode não salvá-lo.
                // Aqui garantimos que ele seja salvo se estiver presente no objeto user
                if ((user as any).steamId && user.id) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { steamId: (user as any).steamId }
                    }).catch(e => console.error("Error setting steamId on user creation:", e));
                }
            },
        },
        secret: process.env.NEXTAUTH_SECRET,
        debug: process.env.NODE_ENV === 'development' || true, // Ativado temporariamente para debug em prod
        pages: {
            signIn: '/auth/signin',
            error: '/auth/error', // Se você tiver uma página de erro
        }
    };
}
