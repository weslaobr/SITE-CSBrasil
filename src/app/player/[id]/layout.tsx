import type { Metadata, ResolvingMetadata } from "next";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const player = await prisma.player.findUnique({
      where: { steamId: id }
    });

    if (!player) {
      return {
        title: "Jogador Não Encontrado | TropaCS",
      };
    }

    const title = `${player.name} - Stats & Análise | TropaCS`;
    const description = `Confira as estatísticas completas, rating e histórico de partidas de ${player.name} no CS2 pela TropaCS.`;
    const ogImage = player.avatar || '/favicon.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: ogImage }],
        type: 'profile'
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [ogImage],
      }
    };
  } catch (error) {
    return {
      title: "Perfil de Jogador | TropaCS",
    };
  }
}

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
