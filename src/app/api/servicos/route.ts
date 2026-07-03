import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" }
    });

    return NextResponse.json(servicos);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviços" },
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
    const { nome, descricao, preco, duracaoMin } = body;

    if (!nome || !preco || !duracaoMin) {
      return NextResponse.json(
        { error: "Nome, preço e duração são obrigatórios" },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao: descricao || null,
        preco: parseFloat(preco),
        duracaoMin: parseInt(duracaoMin)
      }
    });

    return NextResponse.json(servico, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    return NextResponse.json(
      { error: "Erro ao criar serviço" },
      { status: 500 }
    );
  }
}
