import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "../../../../../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);
    const now = new Date();

    // Rate limit: Check 60-second cooldown for same email
    const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);
    const recentCode = await prisma.codigoVerificacao.findFirst({
      where: {
        email,
        createdAt: {
          gte: sixtySecondsAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentCode) {
      console.log(`Cooldown active for email: ${email}`);
      return NextResponse.json(
        { error: "Aguarde 60 segundos antes de solicitar um novo código" },
        { status: 429 }
      );
    }

    // Rate limit: Check 5 requests per hour for same email
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const emailRequestsCount = await prisma.codigoVerificacao.count({
      where: {
        email,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (emailRequestsCount >= 5) {
      console.log(`Hourly limit exceeded for email: ${email}`);
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em 1 hora." },
        { status: 429 }
      );
    }

    // Find existing verification code to get the stored data
    const existingCode = await prisma.codigoVerificacao.findFirst({
      where: { email },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!existingCode) {
      return NextResponse.json(
        { error: "Nenhum cadastro pendente encontrado para este email" },
        { status: 404 }
      );
    }

    // Generate new 6-digit code
    const novoCodigo = generateCode();

    // Calculate expiration (10 minutes from now)
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + 10);

    // Update verification code
    await prisma.codigoVerificacao.update({
      where: { id: existingCode.id },
      data: {
        codigo: novoCodigo,
        expiraEm,
        tentativas: 0, // Reset attempts on resend
        ip: clientIP,
      },
    });

    // Send email with new verification code
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Novo Código de Verificação - Barbearia",
        html: `
          <p>Olá ${existingCode.nome},</p>
          <p>Seu novo código de verificação é: <strong>${novoCodigo}</strong></p>
          <p>Este código expira em 10 minutos.</p>
          <p>Se você não solicitou este reenvio, ignore este email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return NextResponse.json(
        { error: "Erro ao enviar email de verificação" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Novo código de verificação enviado para seu email",
    });
  } catch (error) {
    console.error("Erro ao reenviar código:", error);
    return NextResponse.json(
      { error: "Erro ao reenviar código" },
      { status: 500 }
    );
  }
}
