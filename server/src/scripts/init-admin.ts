import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface PermissionDef {
  code: string;
  description: string;
  resourceGroup: string;
  action: string;
}

interface RoleDef {
  name: string;
  description: string;
  isSystem: boolean;
  perms: readonly string[];
}

interface FieldConfigDef {
  resourceType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  optionsJson?: Prisma.InputJsonValue;
  sortOrder: number;
  enabled: boolean;
}

const permissionDefs = [
  { code: 'admin.dashboard.read', description: '查看仪表盘', resourceGroup: 'admin', action: 'read' },
  { code: 'products.read', description: '查看产品', resourceGroup: 'products', action: 'read' },
  { code: 'products.write', description: '管理产品', resourceGroup: 'products', action: 'write' },
  { code: 'solutions.read', description: '查看方案', resourceGroup: 'solutions', action: 'read' },
  { code: 'solutions.write', description: '管理方案', resourceGroup: 'solutions', action: 'write' },
  { code: 'materials.read', description: '查看资料', resourceGroup: 'materials', action: 'read' },
  { code: 'materials.write', description: '管理资料', resourceGroup: 'materials', action: 'write' },
  { code: 'knowledge.read', description: '查看知识库', resourceGroup: 'knowledge', action: 'read' },
  { code: 'knowledge.write', description: '管理知识库', resourceGroup: 'knowledge', action: 'write' },
  { code: 'users.read', description: '查看用户', resourceGroup: 'users', action: 'read' },
  { code: 'users.write', description: '管理用户', resourceGroup: 'users', action: 'write' },
  { code: 'audit.read', description: '查看审计日志', resourceGroup: 'audit', action: 'read' },
  { code: 'leads.read', description: '查看线索', resourceGroup: 'leads', action: 'read' },
  { code: 'leads.write', description: '管理线索', resourceGroup: 'leads', action: 'write' },
  { code: 'settings.ai.read', description: '查看AI设置', resourceGroup: 'settings', action: 'read' },
  { code: 'settings.ai.write', description: '管理AI设置', resourceGroup: 'settings', action: 'write' },
  { code: 'settings.ui.read', description: '查看前端文案', resourceGroup: 'settings', action: 'read' },
  { code: 'settings.ui.write', description: '管理前端文案', resourceGroup: 'settings', action: 'write' },
] as const satisfies readonly PermissionDef[];

const roleDefs = [
  {
    name: '管理员',
    description: '系统管理员，拥有全部权限',
    isSystem: true,
    perms: permissionDefs.map((permission) => permission.code),
  },
  {
    name: '审核员',
    description: '内容审核员，仅读权限+审计',
    isSystem: true,
    perms: [
      'admin.dashboard.read',
      'products.read',
      'solutions.read',
      'materials.read',
      'knowledge.read',
      'audit.read',
      'leads.read',
    ],
  },
  {
    name: '员工',
    description: '内部员工，读权限+线索管理',
    isSystem: true,
    perms: [
      'admin.dashboard.read',
      'products.read',
      'solutions.read',
      'materials.read',
      'leads.read',
      'leads.write',
    ],
  },
  {
    name: '普通用户',
    description: '注册用户，无权限',
    isSystem: true,
    perms: [],
  },
] as const satisfies readonly RoleDef[];

const materialFieldDefs = [
  {
    resourceType: 'material',
    fieldKey: 'file',
    label: '文件',
    fieldType: 'text',
    required: true,
    sortOrder: 1,
    enabled: true,
  },
  {
    resourceType: 'material',
    fieldKey: 'title',
    label: '标题',
    fieldType: 'text',
    required: true,
    sortOrder: 2,
    enabled: true,
  },
  {
    resourceType: 'material',
    fieldKey: 'type',
    label: '资料类型',
    fieldType: 'single_select',
    required: true,
    optionsJson: [
      { label: '数据手册', value: 'datasheet' },
      { label: 'Demo 报告', value: 'demo_report' },
      { label: '应用笔记', value: 'application_note' },
      { label: '其他', value: 'other' },
    ],
    sortOrder: 3,
    enabled: true,
  },
  {
    resourceType: 'material',
    fieldKey: 'status',
    label: '状态',
    fieldType: 'single_select',
    required: true,
    optionsJson: [
      { label: '草稿', value: 'DRAFT' },
      { label: '上架', value: 'ACTIVE' },
      { label: '下架', value: 'INACTIVE' },
    ],
    sortOrder: 4,
    enabled: true,
  },
  {
    resourceType: 'material',
    fieldKey: 'solutionId',
    label: '所属方案',
    fieldType: 'text',
    required: false,
    sortOrder: 5,
    enabled: true,
  },
  {
    resourceType: 'material',
    fieldKey: 'productId',
    label: '关联产品',
    fieldType: 'text',
    required: false,
    sortOrder: 6,
    enabled: true,
  },
] as const satisfies readonly FieldConfigDef[];

function getAdminPassword(): string {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD is required to initialize the admin account.');
  }
  if (process.env.NODE_ENV === 'production') {
    if (password === 'Admin123456' || password === 'replace_me' || password.length < 12) {
      throw new Error(
        'SEED_ADMIN_PASSWORD must be changed and contain at least 12 characters in production.',
      );
    }
  }
  return password;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@xinmaowei.com';
  const passwordHash = await bcrypt.hash(getAdminPassword(), 10);

  await prisma.$transaction(async (tx) => {
    const permissions = new Map<string, { id: string }>();
    for (const permissionDef of permissionDefs) {
      const permission = await tx.permission.upsert({
        where: { code: permissionDef.code },
        update: {
          description: permissionDef.description,
          resourceGroup: permissionDef.resourceGroup,
          action: permissionDef.action,
        },
        create: permissionDef,
        select: { id: true },
      });
      permissions.set(permissionDef.code, permission);
    }

    const roles = new Map<string, { id: string }>();
    for (const roleDef of roleDefs) {
      const role = await tx.roleModel.upsert({
        where: { name: roleDef.name },
        update: {
          description: roleDef.description,
          isSystem: roleDef.isSystem,
        },
        create: {
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
        },
        select: { id: true },
      });
      roles.set(roleDef.name, role);
    }

    for (const roleDef of roleDefs) {
      const role = roles.get(roleDef.name);
      if (!role) throw new Error(`Role not initialized: ${roleDef.name}`);

      for (const permissionCode of roleDef.perms) {
        const permission = permissions.get(permissionCode);
        if (!permission) throw new Error(`Permission not initialized: ${permissionCode}`);

        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }

    for (const fieldDef of materialFieldDefs) {
      await tx.materialFieldConfig.upsert({
        where: {
          resourceType_fieldKey: {
            resourceType: fieldDef.resourceType,
            fieldKey: fieldDef.fieldKey,
          },
        },
        update: {},
        create: {
          resourceType: fieldDef.resourceType,
          fieldKey: fieldDef.fieldKey,
          label: fieldDef.label,
          fieldType: fieldDef.fieldType,
          required: fieldDef.required,
          optionsJson: 'optionsJson' in fieldDef ? fieldDef.optionsJson : undefined,
          sortOrder: fieldDef.sortOrder,
          enabled: fieldDef.enabled,
        },
      });
    }

    const adminUser = await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        privacyVersion: 'v1',
        privacyAcceptedAt: new Date(),
      },
      select: { id: true, email: true },
    });

    const adminRole = roles.get('管理员');
    if (!adminRole) throw new Error('Admin role not initialized.');

    await tx.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });

    console.log(`Admin account initialized: ${adminUser.email}`);
  });
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
