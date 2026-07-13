import "dotenv/config";
import { z } from "zod";
import { createPrismaClient } from "../src/shared/database/prisma.js";
import { hashPassword } from "../src/shared/security/password.js";

const input = z.object({
  DATABASE_URL: z.string().min(1),
  ADMIN_EMAIL: z.email().transform((value) => value.toLocaleLowerCase("en-US")),
  ADMIN_PASSWORD: z.string().min(16).max(128)
}).parse(process.env);

const roles = [
  ["system_admin", "系统管理员"],
  ["registered_customer", "注册个人"],
  ["customer_engineer", "客户工程师"],
  ["customer_procurement", "客户采购"],
  ["customer_manager", "客户管理者"],
  ["general_manager", "总经理"],
  ["sales_manager", "业务部经理"],
  ["sales", "销售"],
  ["engineering_manager", "工程部经理"],
  ["fae", "普通 FAE"],
  ["customer_service_manager", "客户管理部经理"],
  ["sample_assistant", "样品助理"],
  ["order_assistant", "跟单助理"],
  ["data_analyst", "数据统计助理"],
  ["quality_manager", "质量部经理"],
  ["quality", "质量人员"],
  ["ae_manager", "AE 部经理"],
  ["test_engineer", "测试工程师"],
  ["verification_engineer", "验证工程师"]
] as const;

const resources = [
  "iam", "product", "solution", "document", "selection", "project", "support", "sample", "rfq",
  "lifecycle", "pcn", "quality", "verification", "content", "configuration", "analytics", "knowledge",
  "audit", "integration", "system"
] as const;
const actions = ["read", "create", "update", "approve", "publish", "download", "export", "assign", "delete", "override"] as const;

const prisma = createPrismaClient(input.DATABASE_URL);

async function run(): Promise<void> {
  const administrator = await prisma.subject.upsert({
    where: { email: input.ADMIN_EMAIL },
    create: { type: "SYSTEM_ADMIN", email: input.ADMIN_EMAIL, displayName: "系统管理员" },
    update: { type: "SYSTEM_ADMIN", enabled: true }
  });
  await prisma.passwordCredential.upsert({
    where: { subjectId: administrator.id },
    create: { subjectId: administrator.id, passwordHash: await hashPassword(input.ADMIN_PASSWORD) },
    update: { passwordHash: await hashPassword(input.ADMIN_PASSWORD), changedAt: new Date() }
  });

  const roleIds = new Map<string, string>();
  for (const [code, name] of roles) {
    const role = await prisma.role.upsert({ where: { code }, create: { code, name }, update: { name } });
    roleIds.set(code, role.id);
  }
  for (const resource of resources) {
    for (const action of actions) {
      const code = `${resource}:${action}`;
      const permission = await prisma.permission.upsert({
        where: { code },
        create: { code, resource, action },
        update: { resource, action }
      });
      const adminRoleId = roleIds.get("system_admin");
      if (adminRoleId === undefined) throw new Error("SYSTEM_ADMIN_ROLE_NOT_INITIALIZED");
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRoleId, permissionId: permission.id } },
        create: { roleId: adminRoleId, permissionId: permission.id },
        update: {}
      });
    }
  }
  const adminRoleId = roleIds.get("system_admin");
  if (adminRoleId === undefined) throw new Error("SYSTEM_ADMIN_ROLE_NOT_INITIALIZED");
  await prisma.subjectRole.upsert({
    where: { subjectId_roleId: { subjectId: administrator.id, roleId: adminRoleId } },
    create: { subjectId: administrator.id, roleId: adminRoleId },
    update: {}
  });

  const initialConfiguration = await prisma.configurationVersion.findUnique({ where: { version: 1 } });
  if (initialConfiguration === null) {
    await prisma.configurationVersion.create({
      data: {
        version: 1,
        status: "PUBLISHED",
        payload: {
          navigation: ["products", "solutions", "documents", "selection"],
          anonymousPreviewPages: 3,
          surfaces: ["external", "customer", "internal"]
        },
        changeSummary: "全新系统必要初始配置",
        publishedAt: new Date(),
        createdById: administrator.id
      }
    });
  }
  process.stdout.write(`${JSON.stringify({ level: "info", message: "ADMIN_RBAC_INITIALIZED" })}\n`);
}

void run()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "UNKNOWN_ADMIN_INIT_ERROR";
    process.stderr.write(`${JSON.stringify({ level: "error", message })}\n`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
