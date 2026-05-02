import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: "admin",   permissions: ["*"] },
  {
    name: "partner",
    permissions: [
      "article.read", "article.update", "article.translate", "article.rewrite", "article.publish",
      "job.read",
      "site.read",
      "prompt.read",
    ],
  },
  { name: "user", permissions: ["article.read", "job.read"] },
];

async function main() {
  // Seed default roles
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: { permissions: role.permissions },
      create: role,
    });
    console.log(`✓ Role "${role.name}":`, role.permissions.join(", "));
  }

  // Seed admin user
  const email    = "hovanban7@gmail.com";
  const password = "password";
  const hashed   = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where:  { email },
    update: { password: hashed, role: "admin", isActive: true },
    create: { email, password: hashed, name: "Admin", role: "admin", isActive: true, permissions: [] },
  });

  console.log("✓ Admin user:", user.email, "| role:", user.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
