import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "../../../../../../lib/prisma";
import { getAuthenticatedSession } from "../../../../../../lib/auth-helper";

const resend = new Resend(process.env.RESEND_API_KEY);

function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || cfConnectingIP || "unknown";
}

function emailValido(email: unknown) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);

  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const novoEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!emailValido(novoEmail)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    if (novoEmail === session.user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "Informe um email diferente do atual" },
        { status: 400 }
      );
    }

    const usuarioComEmail = await prisma.usuario.findUnique({
      where: { email: novoEmail },
    });

    if (usuarioComEmail) {
      return NextResponse.json(
        { error: "Este email ja esta em uso por outro usuario" },
        { status: 409 }
      );
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentThreshold = new Date(now.getTime() - 60 * 1000);

    const recentRequest = await prisma.emailAlteracao.findFirst({
      where: {
        usuarioId: session.user.id,
        createdAt: { gte: recentThreshold },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentRequest) {
      return NextResponse.json(
        { error: "Aguarde 60 segundos antes de solicitar um novo codigo" },
        { status: 429 }
      );
    }

    const hourlyCount = await prisma.emailAlteracao.count({
      where: {
        usuarioId: session.user.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyCount >= 5) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em 1 hora." },
        { status: 429 }
      );
    }

    const codigo = gerarCodigo();
    const expiraEm = new Date(now.getTime() + 10 * 60 * 1000);

    await prisma.emailAlteracao.create({
      data: {
        usuarioId: session.user.id,
        novoEmail,
        codigo,
        expiraEm,
        ip: getClientIP(request),
      },
    });

    try {
      await resend.emails.send({
        from: "Barbearia <noreply@joaogabriels.com>",
        to: novoEmail,
        subject: "Codigo para alterar seu email",
        html: `
          <p>Ola, ${session.user.name || "usuario"}.</p>
          <p>Use o codigo abaixo para confirmar a alteracao do email da sua conta.</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${codigo}</p>
          <p>Este codigo expira em 10 minutos.</p>
          <p>Se voce nao solicitou esta alteracao, ignore este email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar codigo de alteracao de email:", emailError);
      return NextResponse.json(
        { error: "Erro ao enviar codigo de verificacao" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Codigo de verificacao enviado para o novo email",
      email: novoEmail,
    });
  } catch (error) {
    console.error("Erro ao iniciar alteracao de email:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar alteracao de email" },
      { status: 500 }
    );
  }
}
