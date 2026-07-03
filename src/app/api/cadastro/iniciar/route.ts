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
        { status: 400 },
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 },
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
        { status: 429 },
      );
    }

    // Check if email already exists
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já está em uso" },
        { status: 400 },
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
        { status: 429 },
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
        { status: 429 },
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
        from: "Barbearia <noreply@joaogabriels.com>",
        to: email,
        subject: "Seu código de verificação",
        html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f0e6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f0e6; padding: 40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1a1a1a; padding: 32px 40px; text-align: center;">
                      <span style="color: #c9a227; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
                        BARBEARIA
                      </span>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 8px; color: #1a1a1a; font-size: 16px;">
                        Olá, <strong>${nome}</strong>
                      </p>
                      <p style="margin: 0 0 24px; color: #555555; font-size: 14px; line-height: 1.6;">
                        Use o código abaixo para confirmar seu cadastro. Ele é válido por <strong>10 minutos</strong>.
                      </p>

                      <!-- Code box -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <span style="display: inline-block; background-color: #f5f0e6; border: 1px solid #e0d8c3; border-radius: 6px; padding: 16px 32px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">
                              ${codigo}
                            </span>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                        Se você não solicitou este cadastro, pode ignorar este email com segurança — nenhuma conta será criada.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fafafa; padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; color: #aaaaaa; font-size: 12px;">
                        Este é um email automático, não é possível responder a ele.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return NextResponse.json(
        { error: "Erro ao enviar email de verificação" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Código de verificação enviado para seu email",
      email: email,
    });
  } catch (error) {
    console.error("Erro ao iniciar cadastro:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar cadastro" },
      { status: 500 },
    );
  }
}
