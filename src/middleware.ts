import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/login" || pathname === "/cadastro";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isApiCadastro = pathname.startsWith("/api/cadastro");

  const token =
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  if (isAuthPage || isApiAuth || isApiCadastro) {
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/clientes", "/servicos", "/", "/agenda"],
};
