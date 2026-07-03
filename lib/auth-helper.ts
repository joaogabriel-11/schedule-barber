import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";

export async function getAuthenticatedSession(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    if (!token || !token.email) {
      console.log("Token inválido ou não encontrado");
      return null;
    }
    
    console.log("Token válido:", token.email);
    return {
      user: {
        id: token.id as string,
        email: token.email as string,
        name: token.name as string
      }
    };
  } catch (error) {
    console.error("Erro ao obter token:", error);
    return null;
  }
}
