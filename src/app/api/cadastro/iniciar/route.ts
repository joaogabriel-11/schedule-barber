import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "../../../../../lib/prisma";
import bcrypt from "bcryptjs";

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
    const { nome, email, senha } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const clientIP = getClientIP(request);
    const now = new Date();

    // Rate limit: Check IP limit (max 10 requests per hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const ipRequestsCount = await prisma.codigoVerificacao.count({
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
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já está em uso" },
        { status: 400 }
      );
    }

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

    // Hash the password before storing
    const senhaHash = await bcrypt.hash(senha, 10);

    // Generate 6-digit code
    const codigo = generateCode();

    // Calculate expiration (10 minutes from now)
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + 10);

    // Save verification code
    await prisma.codigoVerificacao.create({
      data: {
        email,
        codigo,
        nome,
        senhaHash,
        expiraEm,
        ip: clientIP,
      },
    });

    // Send email with verification code
    try {
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Código de Verificação - Barbearia",
        html: `
          <p>Olá ${nome},</p>
          <p>Seu código de verificação é: <strong>${codigo}</strong></p>
          <p>Este código expira em 10 minutos.</p>
          <p>Se você não solicitou este cadastro, ignore este email.</p>
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
      message: "Código de verificação enviado para seu email",
      email: email
    });
  } catch (error) {
    console.error("Erro ao iniciar cadastro:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar cadastro" },
      { status: 500 }
    );
  }
}
