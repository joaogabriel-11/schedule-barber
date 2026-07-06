<div align="center">

# 💈 Barbearia — Sistema de Agendamento

### Sistema completo de gestão para barbearias, desenvolvido com **Next.js**, **Prisma**, **PostgreSQL** e **TypeScript**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=nextdotjs)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

<br/>

<p align="center">
  <a href="https://barbearia.joaogabriels.com">
    <img src="https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white"/>
  </a>
  <a href="https://github.com/joaogabriel-11/schedule-barber">
    <img src="https://img.shields.io/badge/Code-181717?style=for-the-badge&logo=github&logoColor=white"/>
  </a>
</p>

<br/>

_Um sistema real de agendamento criado para resolver um problema real: substituir a agenda de papel de uma barbearia, eliminando esquecimentos de clientes e conflitos de horário._

</div>

---

# 📖 Sobre o projeto

O **Barbearia** nasceu de um problema concreto: um barbeiro que controlava seus agendamentos manualmente em uma agenda de papel, o que causava esquecimentos de clientes e, ocasionalmente, dois clientes marcados no mesmo horário.

O sistema foi construído para resolver isso de ponta a ponta — com agenda visual, validação automática de conflito de horário, autenticação segura, relatórios de faturamento e um painel administrativo completo.

O projeto foi desenvolvido com foco em:

- Regras de negócio bem definidas (a validação de conflito de horário é o núcleo do sistema)
- Segurança em profundidade (verificação de email, rate limiting, recuperação de senha)
- Experiência responsiva (uso real no balcão da barbearia, via celular)
- Arquitetura escalável com Next.js App Router

---

# ✨ Funcionalidades

## 📅 Gestão de Agendamentos

- Calendário interativo (visão mensal, semanal e diária)
- Validação automática de conflito de horário na criação e edição
- Status do agendamento: `AGENDADO`, `CONCLUIDO`, `CANCELADO`, `NO_SHOW`
- Slots de horário fixos de 10 em 10 minutos, respeitando o horário de funcionamento configurado
- Visão de lista otimizada para mobile

## 👥 Clientes e Serviços

- Cadastro completo de clientes (nome, telefone, email)
- Cadastro de serviços (nome, preço, duração)
- Exclusão via soft-delete, preservando histórico de agendamentos

## 🔐 Autenticação e Segurança

- Login com **NextAuth** (JWT)
- Verificação de email no cadastro via código de 6 dígitos
- Recuperação de senha por email com token de expiração
- Rate limiting contra spam e brute force (login, cadastro e recuperação de senha)
- Senhas armazenadas com hash **bcrypt**
- Controle de acesso por papéis (`BARBEIRO`, `ADMIN`)

## 🛠 Painel Administrativo

- Listagem de todos os usuários do sistema
- Edição de nome, email e senha de qualquer usuário
- Exclusão de contas
- Acesso restrito exclusivamente a usuários `ADMIN`, validado no backend

## 📊 Relatórios e Analytics

- Faturamento total por período selecionado
- Quantidade de atendimentos concluídos
- Taxa de no-show / cancelamento
- Gráfico de faturamento dos últimos 6 meses
- Ranking dos 5 clientes com mais atendimentos
- Ranking dos serviços mais populares

## 🔔 Notificações

- Alerta automático para agendamentos que já passaram da data e continuam sem status atualizado
- Atualização rápida de status diretamente pela notificação

---

# 🛠 Stack Tecnológica

### Frontend

| Tecnologia              | Descrição               |
| ----------------------- | ----------------------- |
| Next.js 16 (App Router) | Framework React         |
| React 19                | Biblioteca de UI        |
| TypeScript              | Tipagem estática        |
| Tailwind CSS 4          | Estilização             |
| FullCalendar            | Calendário interativo   |
| Recharts                | Gráficos dos relatórios |
| Lucide React            | Ícones                  |

### Backend

| Tecnologia            | Descrição                     |
| --------------------- | ----------------------------- |
| Next.js API Routes    | Rotas de API serverless       |
| Prisma ORM            | Camada de acesso ao banco     |
| PostgreSQL (Supabase) | Banco de dados relacional     |
| NextAuth (Auth.js)    | Autenticação e sessão JWT     |
| bcryptjs              | Hash de senhas                |
| Resend                | Envio de emails transacionais |

### Qualidade e Infraestrutura

| Tecnologia | Descrição              |
| ---------- | ---------------------- |
| Vitest     | Testes unitários       |
| ESLint     | Padronização de código |
| Vercel     | Deploy e hospedagem    |
| Cloudflare | DNS e domínio próprio  |

---

# 📊 Modelagem do Banco de Dados

### Modelos principais

**Usuario** — id, email, nome, senha (hash), role (`BARBEIRO` / `ADMIN`)
**Cliente** — id, nome, telefone, email, ativo
**Servico** — id, nome, descrição, preço, duração (min), ativo
**Agendamento** — id, dataHora, status, observações — relacionado a Usuario, Cliente e Servico
**Configuracao** — horário de início e fim de funcionamento, por usuário

### Modelos de segurança

**TokenRecuperacao** — token de recuperação de senha, com expiração e IP de origem
**CodigoVerificacao** — código de verificação de cadastro, com controle de tentativas
**TentativaLogin** — controle de rate limiting no login

---

# 🔐 Segurança em detalhe

### Fluxo de cadastro com verificação de email

1. Usuário preenche nome, email e senha
2. Sistema valida se o email já está em uso
3. Um código de 6 dígitos é gerado e enviado por email (Resend)
4. Usuário confirma o código no app
5. Conta só é criada de fato após validação bem-sucedida

### Rate limiting

- **Login**: até 5 tentativas, bloqueio de 15 minutos após exceder
- **Cadastro / reenvio de código**: 1 solicitação a cada 60s, máximo de 5 por hora por email
- **Recuperação de senha**: limite por email e por IP, com resposta sempre genérica (evita enumeração de contas cadastradas)

### Regra de negócio central: conflito de horário

Dois agendamentos conflitam se `inícioA < fimB` **e** `fimA > inícioB`. Essa lógica é isolada em uma função pura e testada unitariamente, validada tanto na criação quanto na edição de agendamentos.

---

# 🗂️ Estrutura do Projeto

```text
schedule-barber/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (app)/              # Layout com sidebar
│   │   │   ├── admin/
│   │   │   ├── agendamentos/
│   │   │   ├── clientes/
│   │   │   ├── configuracoes/
│   │   │   ├── relatorios/
│   │   │   └── servicos/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── cadastro/
│   │   │   ├── recuperar-senha/
│   │   │   ├── cleanup/
│   │   │   └── admin/
│   │   ├── cadastro/
│   │   ├── login/
│   │   └── layout.tsx
│   └── lib/
│       ├── auth.ts
│       ├── auth-helper.ts
│       ├── login-rate-limit.ts
│       ├── validarConflito.ts
│       └── prisma.ts
└── public/
```

---

# 🚀 Como executar localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL (local ou Supabase)
- Conta no [Resend](https://resend.com) para envio de emails

### Instalação

```bash
git clone https://github.com/joaogabriel-11/schedule-barber.git
cd schedule-barber
npm install
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="sua-chave-secreta"
NEXTAUTH_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
CRON_SECRET="sua-chave-cron"
```

### Banco de dados

```bash
npx prisma db push
npx prisma generate
```

### Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Testes

```bash
npm test
```

---

# 🧹 Manutenção de dados

O sistema conta com rotinas de limpeza para evitar acúmulo de dados temporários:

- Remoção de códigos de verificação expirados
- Remoção de tentativas de login antigas (mais de 1 semana)

```bash
curl -X POST https://barbearia.joaogabriels.com/api/cleanup/codigos-verificacao \
  -H "Authorization: Bearer $CRON_SECRET"
```

Recomenda-se agendar essas rotinas via cron job (ex: a cada hora).

---

# 📱 Responsividade

O sistema foi construído mobile-first, pensando no uso real do barbeiro no balcão:

- **Desktop**: sidebar lateral fixa, calendário completo
- **Tablet**: sidebar adaptável
- **Mobile**: navegação inferior, visão de agenda em lista

---

# 🎨 Identidade Visual

| Cor       | Uso                          |
| --------- | ---------------------------- |
| `#1a1a1a` | Cor primária (preto/grafite) |
| `#c9a227` | Cor de destaque (dourado)    |
| `#f5f0e6` | Fundo (bege claro)           |

Tipografia: Geist Sans · Ícones: Lucide React

---

# 🎯 Objetivos do projeto

Este projeto foi desenvolvido para consolidar conhecimento prático em:

- Modelagem de banco de dados relacional com regras de negócio reais
- Autenticação e segurança de aplicações web (rate limiting, verificação de identidade, controle de acesso)
- Arquitetura full-stack com Next.js App Router
- Validação de regras críticas com testes automatizados
- Deploy e configuração de infraestrutura (DNS, domínio próprio, email transacional)

---

# 👨‍💻 Autor

**João Gabriel dos Santos**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/joaogabriel-11)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/joaogabriel11)

---

<div align="center">

### ⭐ Se você gostou deste projeto, deixe uma estrela no repositório!

</div>
