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
      // Email changes require confirmation by code sent to the new email.
      const emailNormalizado = String(email).trim().toLowerCase();

      if (emailNormalizado !== session.user.email?.toLowerCase()) {
        return NextResponse.json(
          { error: "Para alterar o email, solicite e confirme o codigo de verificacao" },
          { status: 400 }
        );
      }

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
