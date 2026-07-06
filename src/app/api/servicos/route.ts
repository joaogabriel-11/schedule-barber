import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

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

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const servicos = await prisma.servico.findMany({
      where: { usuarioId: session.user.id, ativo: true },
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

    if (!nome || preco === undefined || duracaoMin === undefined) {
      return NextResponse.json(
        { error: "Nome, preço e duração são obrigatórios" },
        { status: 400 }
      );
    }

    const dadosValidados = validarServico(preco, duracaoMin);

    if ("error" in dadosValidados) {
      return NextResponse.json(
        { error: dadosValidados.error },
        { status: 400 }
      );
    }

    const servico = await prisma.servico.create({
      data: {
        nome,
        descricao: descricao || null,
        preco: dadosValidados.preco,
        duracaoMin: dadosValidados.duracaoMin,
        usuarioId: session.user.id
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
