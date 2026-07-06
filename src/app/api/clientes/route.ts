import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";
import {
  formatarTelefone,
  normalizarEmailCliente,
  validarEmailCliente,
  validarTelefone,
} from "../../../../lib/validarCliente";

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");

  try {
    const where = search
      ? {
          usuarioId: session.user.id,
          ativo: true,
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { telefone: { contains: search } }
          ]
        }
      : { usuarioId: session.user.id, ativo: true };

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        _count: {
          select: {
            agendamentos: true
          }
        }
      },
      orderBy: { nome: "asc" }
    });

    return NextResponse.json(clientes);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json(
      { error: "Erro ao buscar clientes" },
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
    const { nome, telefone, email } = body;

    if (!nome || !telefone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    if (!validarTelefone(telefone)) {
      return NextResponse.json(
        { error: "Telefone deve ter DDD e 10 ou 11 digitos" },
        { status: 400 }
      );
    }

    if (!validarEmailCliente(email)) {
      return NextResponse.json(
        { error: "Email invalido" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: nome.trim(),
        telefone: formatarTelefone(telefone),
        email: normalizarEmailCliente(email),
        usuarioId: session.user.id
      }
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
