import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../../lib/auth-helper";

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
    const novoEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!codigo || !novoEmail) {
      return NextResponse.json(
        { error: "Email e codigo sao obrigatorios" },
        { status: 400 }
      );
    }

    const solicitacao = await prisma.emailAlteracao.findFirst({
      where: {
        usuarioId: session.user.id,
        novoEmail,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!solicitacao) {
      return NextResponse.json(
        { error: "Solicitacao de alteracao nao encontrada" },
        { status: 404 }
      );
    }

    if (new Date() > solicitacao.expiraEm) {
      await prisma.emailAlteracao.delete({
        where: { id: solicitacao.id },
      });
      return NextResponse.json(
        { error: "Codigo expirado. Solicite um novo codigo." },
        { status: 400 }
      );
    }

    if (solicitacao.tentativas >= 5) {
      await prisma.emailAlteracao.delete({
        where: { id: solicitacao.id },
      });
      return NextResponse.json(
        { error: "Muitas tentativas incorretas. Solicite um novo codigo." },
        { status: 400 }
      );
    }

    if (solicitacao.codigo !== codigo) {
      const novasTentativas = solicitacao.tentativas + 1;

      if (novasTentativas >= 5) {
        await prisma.emailAlteracao.delete({
          where: { id: solicitacao.id },
        });
        return NextResponse.json(
          { error: "Muitas tentativas incorretas. Solicite um novo codigo." },
          { status: 400 }
        );
      }

      await prisma.emailAlteracao.update({
        where: { id: solicitacao.id },
        data: { tentativas: novasTentativas },
      });

      return NextResponse.json({ error: "Codigo incorreto" }, { status: 400 });
    }

    const usuarioComEmail = await prisma.usuario.findUnique({
      where: { email: novoEmail },
    });

    if (usuarioComEmail && usuarioComEmail.id !== session.user.id) {
      return NextResponse.json(
        { error: "Este email ja esta em uso por outro usuario" },
        { status: 409 }
      );
    }

    const usuario = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.usuario.update({
        where: { id: session.user.id },
        data: { email: novoEmail },
        select: {
          id: true,
          nome: true,
          email: true,
        },
      });

      await tx.emailAlteracao.deleteMany({
        where: { usuarioId: session.user.id },
      });

      return updatedUser;
    });

    return NextResponse.json(usuario);
  } catch (error) {
    console.error("Erro ao confirmar alteracao de email:", error);
    return NextResponse.json(
      { error: "Erro ao confirmar alteracao de email" },
      { status: 500 }
    );
  }
}
