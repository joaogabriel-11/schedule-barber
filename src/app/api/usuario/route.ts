import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../lib/auth-helper";

export async function PATCH(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { nome, email } = body;

    if (!nome && !email) {
      return NextResponse.json(
        { error: "Pelo menos nome ou email deve ser fornecido" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (nome) {
      updateData.nome = nome;
    }

    if (email) {
      // Check if email is already in use by another user
      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "Este email já está em uso por outro usuário" },
          { status: 409 }
        );
      }

      updateData.email = email;
    }

    const usuario = await prisma.usuario.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}
