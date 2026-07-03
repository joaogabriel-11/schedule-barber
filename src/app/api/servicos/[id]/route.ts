import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../lib/auth-helper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const servico = await prisma.servico.findUnique({
      where: { id }
    });

    if (!servico) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(servico);
  } catch (error) {
    console.error("Erro ao buscar serviço:", error);
    return NextResponse.json(
      { error: "Erro ao buscar serviço" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, descricao, preco, duracaoMin } = body;

    if (!nome || !preco || !duracaoMin) {
      return NextResponse.json(
        { error: "Nome, preço e duração são obrigatórios" },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.update({
      where: { id },
      data: {
        nome,
        descricao: descricao || null,
        preco: parseFloat(preco),
        duracaoMin: parseInt(duracaoMin)
      }
    });

    return NextResponse.json(servico);
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar serviço" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const servico = await prisma.servico.update({
      where: { id },
      data: { ativo: false }
    });

    return NextResponse.json(servico);
  } catch (error) {
    console.error("Erro ao deletar serviço:", error);
    return NextResponse.json(
      { error: "Erro ao deletar serviço" },
      { status: 500 }
    );
  }
}
