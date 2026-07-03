import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Find token in database
    const tokenRecuperacao = await prisma.tokenRecuperacao.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!tokenRecuperacao) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 400 }
      );
    }

    // Check if token is already used
    if (tokenRecuperacao.usado) {
      return NextResponse.json(
        { error: "Token já foi utilizado" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > tokenRecuperacao.expiraEm) {
      return NextResponse.json(
        { error: "Token expirado" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user's password
    await prisma.usuario.update({
      where: { id: tokenRecuperacao.usuarioId },
      data: { senha: hashedPassword },
    });

    // Mark token as used
    await prisma.tokenRecuperacao.update({
      where: { id: tokenRecuperacao.id },
      data: { usado: true },
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json(
      { error: "Erro ao redefinir senha" },
      { status: 500 }
    );
  }
}
