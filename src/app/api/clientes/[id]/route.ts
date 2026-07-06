import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../lib/auth-helper";
import {
  formatarTelefone,
  normalizarEmailCliente,
  validarEmailCliente,
  validarTelefone,
} from "../../../../../lib/validarCliente";

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
    const cliente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (cliente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
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
    const { nome, telefone, email } = body;

    if (!nome || !telefone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (clienteExistente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
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

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nome: nome.trim(),
        telefone: formatarTelefone(telefone),
        email: normalizarEmailCliente(email)
      }
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
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
    const clienteExistente = await prisma.cliente.findUnique({
      where: { id }
    });

    if (!clienteExistente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (clienteExistente.usuarioId !== session.user.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: { ativo: false }
    });

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao deletar cliente" },
      { status: 500 }
    );
  }
}
