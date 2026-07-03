import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, codigo } = body;

    if (!email || !codigo) {
      return NextResponse.json(
        { error: "Email e código são obrigatórios" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Find verification code
    const verificacao = await prisma.codigoVerificacao.findFirst({
      where: {
        email,
        codigo,
      },
    });

    if (!verificacao) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 }
      );
    }

    // Check if expired
    if (now > verificacao.expiraEm) {
      return NextResponse.json(
        { error: "Código expirado. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Check if too many attempts
    if (verificacao.tentativas >= 5) {
      // Delete the code and require resend
      await prisma.codigoVerificacao.delete({
        where: { id: verificacao.id },
      });
      return NextResponse.json(
        { error: "Muitas tentativas incorretas. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Increment attempt count
    await prisma.codigoVerificacao.update({
      where: { id: verificacao.id },
      data: {
        tentativas: verificacao.tentativas + 1,
      },
    });

    // Check if code matches (after incrementing attempt)
    if (verificacao.codigo !== codigo) {
      return NextResponse.json(
        { error: "Código incorreto" },
        { status: 400 }
      );
    }

    // Code is correct - create user
    const usuario = await prisma.usuario.create({
      data: {
        email: verificacao.email,
        nome: verificacao.nome,
        senha: verificacao.senhaHash,
        role: "BARBEIRO",
      },
    });

    // Delete verification code
    await prisma.codigoVerificacao.delete({
      where: { id: verificacao.id },
    });

    return NextResponse.json({
      message: "Conta criada com sucesso!",
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    return NextResponse.json(
      { error: "Erro ao verificar código" },
      { status: 500 }
    );
  }
}
