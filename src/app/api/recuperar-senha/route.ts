import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { prisma } from "../../../../lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Find user by email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Email não encontrado no sistema" },
        { status: 404 },
      );
    }

    // Generate a unique token
    const token = randomBytes(32).toString("hex");

    // Calculate expiration (1 hour from now)
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 1);

    // Save token in database
    await prisma.tokenRecuperacao.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiraEm,
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
      { message: "Email de recuperação enviado! Verifique sua caixa de entrada." },
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
