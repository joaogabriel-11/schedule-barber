import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAdminSession } from "../../../../../lib/auth-helper";

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            agendamentos: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 },
    );
  }
}
