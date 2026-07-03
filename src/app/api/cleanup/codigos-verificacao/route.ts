import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Simple authentication check - in production, use proper API key or cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();

    // Delete expired verification codes
    const result = await prisma.codigoVerificacao.deleteMany({
      where: {
        expiraEm: {
          lt: now,
        },
      },
    });

    console.log(`Cleanup: Deleted ${result.count} expired verification codes`);

    return NextResponse.json({
      message: "Cleanup completed",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Erro ao limpar códigos expirados:", error);
    return NextResponse.json(
      { error: "Erro ao limpar códigos expirados" },
      { status: 500 }
    );
  }
}
