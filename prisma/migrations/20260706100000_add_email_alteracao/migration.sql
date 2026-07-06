-- CreateTable
CREATE TABLE "alteracoes_email" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "novoEmail" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alteracoes_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alteracoes_email_usuarioId_idx" ON "alteracoes_email"("usuarioId");

-- CreateIndex
CREATE INDEX "alteracoes_email_novoEmail_idx" ON "alteracoes_email"("novoEmail");

-- CreateIndex
CREATE INDEX "alteracoes_email_codigo_idx" ON "alteracoes_email"("codigo");

-- CreateIndex
CREATE INDEX "alteracoes_email_expiraEm_idx" ON "alteracoes_email"("expiraEm");

-- CreateIndex
CREATE INDEX "alteracoes_email_createdAt_idx" ON "alteracoes_email"("createdAt");

-- AddForeignKey
ALTER TABLE "alteracoes_email" ADD CONSTRAINT "alteracoes_email_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
