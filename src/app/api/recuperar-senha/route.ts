import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { prisma } from "../../../../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const GENERIC_SUCCESS_MESSAGE =
  "Se o e-mail existir em nossa base, você receberá um link de recuperação";

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
        from: "Barbearia <noreply@joaogabriels.com>",
        to: email,
        subject: "Redefinição de senha",
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
                        Olá, <strong>${usuario.nome}</strong>
                      </p>
                      <p style="margin: 0 0 24px; color: #555555; font-size: 14px; line-height: 1.6;">
                        Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.
                      </p>

                      <!-- Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 12px 0 24px;">
                            <a href="${recoveryLink}" style="display: inline-block; background-color: #1a1a1a; color: #c9a227; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 6px;">
                              Redefinir senha
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 0 0 8px; color: #999999; font-size: 13px; line-height: 1.6;">
                        Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
                      </p>
                      <p style="margin: 0 0 24px; word-break: break-all;">
                        <a href="${recoveryLink}" style="color: #b8860b; font-size: 13px;">${recoveryLink}</a>
                      </p>

                      <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 1.6;">
                        Se você não solicitou esta recuperação, pode ignorar este email com segurança — sua senha atual continuará funcionando normalmente.
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
