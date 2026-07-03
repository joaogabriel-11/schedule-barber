import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token é obrigatório" },
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

    // Token is valid
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Erro ao validar token:", error);
    return NextResponse.json(
      { error: "Erro ao validar token" },
      { status: 500 }
    );
  }
}
