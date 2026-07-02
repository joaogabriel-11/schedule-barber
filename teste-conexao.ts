import { prisma } from "./lib/prisma";

async function test() {
  try {
    console.log("Tentando conectar ao Supabase...");

    // Executa uma query nativa simples que não depende de nenhuma tabela existir
    const resultado = await prisma.$queryRaw`SELECT NOW();`;

    console.log("✅ Conexão bem-sucedida!");
    console.log("Horário do banco de dados:", resultado);
  } catch (error) {
    console.error("❌ Erro ao conectar ao banco:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
