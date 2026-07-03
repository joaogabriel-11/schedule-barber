"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navItems = [
    { path: "/", label: "Agenda", icon: "📅" },
    { path: "/clientes", label: "Clientes", icon: "👥" },
    { path: "/servicos", label: "Serviços", icon: "✂️" },
    { path: "/relatorios", label: "Relatórios", icon: "📊" },
    { path: "/configuracoes", label: "Configurações", icon: "⚙️" }
  ];

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col pb-16">
        <main className="flex-1">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
          <div className="flex justify-around">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg ${
                  pathname === item.path
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-gray-600"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-col items-center px-4 py-2 rounded-lg text-gray-600"
            >
              <span className="text-xl">🚪</span>
              <span className="text-xs mt-1">Sair</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Barbearia</h1>
          <p className="text-sm text-gray-600 mt-1">{session.user.name}</p>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg ${
                    pathname === item.path
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <span className="text-xl mr-3">🚪</span>
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
