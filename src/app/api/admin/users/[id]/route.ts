import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../lib/auth-helper";
import { prisma } from "../../../../../../lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { nome, email, role } = body;

    if (!nome && !email && !role) {
      return NextResponse.json(
        { error: "Pelo menos um campo deve ser fornecido" },
        { status: 400 },
      );
    }

    const updateData: any = {};

    if (nome) {
      updateData.nome = nome;
    }

    if (email) {
      // Check if email is already in use by another user
      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { error: "Email já está em uso por outro usuário" },
          { status: 400 },
        );
      }

      updateData.email = email;
    }

    if (role) {
      updateData.role = role;
    }

    // Prevent admin from changing their own role
    if (role && id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode alterar seu próprio role" },
        { status: 400 },
      );
    }

    const user = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession(request);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Você não pode excluir sua própria conta" },
        { status: 400 },
      );
    }

    // Check if user exists
    const user = await prisma.usuario.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agendamentos: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    // Delete user (cascade will handle related data)
    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Usuário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 },
    );
  }
}
