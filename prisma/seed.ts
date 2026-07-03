import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  // Check if admin user already exists
  const existingAdmin = await prisma.usuario.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    console.log("Admin user already exists:", existingAdmin.email);
    return;
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.usuario.create({
    data: {
      email: "admin@barbearia.com",
      nome: "Administrador",
      senha: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin user created successfully!");
  console.log("Email:", admin.email);
  console.log("Password: admin123");
  console.log("Please change the password after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
