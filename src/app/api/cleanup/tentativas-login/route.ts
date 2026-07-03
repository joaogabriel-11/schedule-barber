import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

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
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Delete login attempt records older than 1 week
    const result = await prisma.tentativaLogin.deleteMany({
      where: {
        createdAt: {
          lt: oneWeekAgo,
        },
        bloqueadoAte: null, // Only delete if not currently blocked
      },
    });

    console.log(`Cleanup: Deleted ${result.count} old login attempt records`);

    return NextResponse.json({
      message: "Cleanup completed",
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Erro ao limpar tentativas de login:", error);
    return NextResponse.json(
      { error: "Erro ao limpar tentativas de login" },
      { status: 500 }
    );
  }
}
