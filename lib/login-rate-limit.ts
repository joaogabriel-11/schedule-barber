import { prisma } from "./prisma";

const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 15;

export async function checkLoginRateLimit(email: string, ip?: string): Promise<{
  allowed: boolean;
  error?: string;
  remainingAttempts?: number;
  blockedUntil?: Date;
}> {
  const now = new Date();

  // Find existing login attempt record
  let tentativa = await prisma.tentativaLogin.findFirst({
    where: { email },
  });

  // If no record exists, create one
  if (!tentativa) {
    tentativa = await prisma.tentativaLogin.create({
      data: {
        email,
        ip,
        tentativas: 0,
      },
    });
  }

  // Check if currently blocked
  if (tentativa.bloqueadoAte && tentativa.bloqueadoAte > now) {
    const minutesLeft = Math.ceil(
      (tentativa.bloqueadoAte.getTime() - now.getTime()) / 60000
    );
    return {
      allowed: false,
      error: `Muitas tentativas. Tente novamente em ${minutesLeft} minutos.`,
      blockedUntil: tentativa.bloqueadoAte,
    };
  }

  // If blocked period has passed, reset attempts
  if (tentativa.bloqueadoAte && tentativa.bloqueadoAte <= now) {
    tentativa = await prisma.tentativaLogin.update({
      where: { id: tentativa.id },
      data: {
        tentativas: 0,
        bloqueadoAte: null,
      },
    });
  }

  // Check if max attempts reached
  if (tentativa.tentativas >= MAX_ATTEMPTS) {
    const bloqueadoAte = new Date();
    bloqueadoAte.setMinutes(bloqueadoAte.getMinutes() + BLOCK_DURATION_MINUTES);

    await prisma.tentativaLogin.update({
      where: { id: tentativa.id },
      data: {
        bloqueadoAte,
      },
    });

    return {
      allowed: false,
      error: `Muitas tentativas. Tente novamente em ${BLOCK_DURATION_MINUTES} minutos.`,
      blockedUntil: bloqueadoAte,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - tentativa.tentativas,
  };
}

export async function recordFailedLoginAttempt(email: string, ip?: string): Promise<void> {
  const tentativa = await prisma.tentativaLogin.findFirst({
    where: { email },
  });

  if (tentativa) {
    await prisma.tentativaLogin.update({
      where: { id: tentativa.id },
      data: {
        tentativas: tentativa.tentativas + 1,
        ip,
      },
    });
  } else {
    await prisma.tentativaLogin.create({
      data: {
        email,
        ip,
        tentativas: 1,
      },
    });
  }
}

export async function resetLoginAttempts(email: string): Promise<void> {
  await prisma.tentativaLogin.deleteMany({
    where: { email },
  });
}
