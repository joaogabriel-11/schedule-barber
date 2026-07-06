import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../lib/auth-helper";

function validarServico(preco: unknown, duracaoMin: unknown) {
  const precoNumero = Number(preco);
  const duracaoNumero = Number(duracaoMin);

  if (!Number.isFinite(precoNumero) || precoNumero < 0) {
    return { error: "Preco deve ser um numero maior ou igual a zero" };
  }

  if (
    !Number.isInteger(duracaoNumero) ||
    duracaoNumero <= 0 ||
    duracaoNumero > 1440
  ) {
    return { error: "Duracao deve ser um numero inteiro entre 1 e 1440 minutos" };
  }

  return {
    preco: precoNumero,
    duracaoMin: duracaoNumero
  };
}

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

    if (servico.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
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

    if (!nome || preco === undefined || duracaoMin === undefined) {
      return NextResponse.json(
        { error: "Nome, preço e duração são obrigatórios" },
        { status: 400 }
      );
    }

    const servicoExistente = await prisma.servico.findUnique({
      where: { id }
    });

    if (!servicoExistente) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    if (servicoExistente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const dadosValidados = validarServico(preco, duracaoMin);

    if ("error" in dadosValidados) {
      return NextResponse.json(
        { error: dadosValidados.error },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.update({
      where: { id },
      data: {
        nome,
        descricao: descricao || null,
        preco: dadosValidados.preco,
        duracaoMin: dadosValidados.duracaoMin
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
    const servicoExistente = await prisma.servico.findUnique({
      where: { id }
    });

    if (!servicoExistente) {
      return NextResponse.json(
        { error: "Serviço não encontrado" },
        { status: 404 }
      );
    }

    if (servicoExistente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

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
