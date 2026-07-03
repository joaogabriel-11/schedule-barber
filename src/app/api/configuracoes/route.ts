import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const configuracao = await prisma.configuracao.findUnique({
      where: { usuarioId: session.user.id }
    });

    return NextResponse.json(configuracao);
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { horarioInicio, horarioFim } = body;

    if (!horarioInicio || !horarioFim) {
      return NextResponse.json(
        { error: "Horário de início e término são obrigatórios" },
        { status: 400 }
      );
    }

    const configuracao = await prisma.configuracao.upsert({
      where: { usuarioId: session.user.id },
      update: { horarioInicio, horarioFim },
      create: {
        usuarioId: session.user.id,
        horarioInicio,
        horarioFim
      }
    });

    return NextResponse.json(configuracao);
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
