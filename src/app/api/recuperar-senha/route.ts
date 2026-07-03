import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { prisma } from "../../../../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const GENERIC_SUCCESS_MESSAGE = "Se o e-mail existir em nossa base, você receberá um link de recuperação";

function getClientIP(request: NextRequest): string {
  // Try to get IP from various headers
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to a generic identifier if no IP found
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email é obrigatório" },
        { status: 400 },
      );
    }

    const clientIP = getClientIP(request);
    const now = new Date();

    // Rate limit: Check IP limit (max 10 requests per hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const ipRequestsCount = await prisma.tokenRecuperacao.count({
      where: {
        ip: clientIP,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (ipRequestsCount >= 10) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        { message: GENERIC_SUCCESS_MESSAGE },
        { status: 200 },
      );
    }

    // Find user by email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      // Return generic message to avoid email enumeration
      return NextResponse.json(
        { message: GENERIC_SUCCESS_MESSAGE },
        { status: 200 },
      );
    }

    // Rate limit: Check 3-minute cooldown for same user
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    const recentToken = await prisma.tokenRecuperacao.findFirst({
      where: {
        usuarioId: usuario.id,
        createdAt: {
          gte: threeMinutesAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentToken) {
      console.log(`Cooldown active for user: ${email}`);
      return NextResponse.json(
        { message: GENERIC_SUCCESS_MESSAGE },
        { status: 200 },
      );
    }

    // Rate limit: Check 5 requests per hour for same email/user
    const userRequestsCount = await prisma.tokenRecuperacao.count({
      where: {
        usuarioId: usuario.id,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    if (userRequestsCount >= 5) {
      console.log(`Hourly limit exceeded for user: ${email}`);
      return NextResponse.json(
        { message: GENERIC_SUCCESS_MESSAGE },
        { status: 200 },
      );
    }

    // Generate a unique token
    const token = randomBytes(32).toString("hex");

    // Calculate expiration (1 hour from now)
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 1);

    // Save token in database with IP
    await prisma.tokenRecuperacao.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiraEm,
        ip: clientIP,
      },
    });

    // Send email with recovery link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const recoveryLink = `${baseUrl}/redefinir-senha?token=${token}`;

    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Recuperação de Senha - Barbearia",
        html: `
          <p>Olá ${usuario.nome},</p>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <p><a href="${recoveryLink}">${recoveryLink}</a></p>
          <p>Este link expira em 1 hora.</p>
          <p>Se você não solicitou esta recuperação, ignore este email.</p>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      // Continue anyway - the token is saved
    }

    return NextResponse.json(
      { message: GENERIC_SUCCESS_MESSAGE },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao solicitar recuperação de senha:", error);
    return NextResponse.json(
      { error: "Erro ao solicitar recuperação de senha" },
      { status: 500 },
    );
  }
}
