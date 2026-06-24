import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123456';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // ── Clear existing data in dependency order ──────────
  await prisma.knowledgeEventEntity.deleteMany();
  await prisma.knowledgeEvent.deleteMany();
  await prisma.knowledgeEntity.deleteMany();
  await prisma.knowledgeChunk.deleteMany();
  await prisma.knowledgeIndexJob.deleteMany();
  await prisma.knowledgeDoc.deleteMany();
  await prisma.material.deleteMany();
  await prisma.productSolution.deleteMany();
  await prisma.solution.deleteMany();
  await prisma.product.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.roleModel.deleteMany();
  await prisma.productFieldConfig.deleteMany();
  await prisma.materialFieldConfig.deleteMany();

  // ── 1 ADMIN user ─────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@xinmaowei.com' },
    update: { passwordHash },
    create: {
      email: 'admin@xinmaowei.com',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      privacyVersion: 'v1',
      privacyAcceptedAt: new Date(),
    },
  });

  // ── ProductFieldConfig ──────────────────────────────
  const productFieldConfigs = [
    { fieldKey: 'model', label: '型号', fieldType: 'text', required: true, sortOrder: 1 },
    { fieldKey: 'series', label: '系列', fieldType: 'text', required: true, sortOrder: 2 },
    { fieldKey: 'type', label: '类型', fieldType: 'single_select', required: true, sortOrder: 3, optionsJson: ['PFC控制器', 'LLC控制器', '同步整流', '快充协议', 'DC-DC转换器', 'GaN驱动器'] },
    { fieldKey: 'inputVoltageMin', label: '最小输入电压(V)', fieldType: 'number', required: true, sortOrder: 4 },
    { fieldKey: 'inputVoltageMax', label: '最大输入电压(V)', fieldType: 'number', required: true, sortOrder: 5 },
    { fieldKey: 'outputVoltage', label: '输出电压(V)', fieldType: 'number', required: true, sortOrder: 6 },
    { fieldKey: 'outputCurrent', label: '输出电流(A)', fieldType: 'number', required: true, sortOrder: 7 },
    { fieldKey: 'applicationType', label: '应用类型', fieldType: 'single_select', required: true, sortOrder: 8, optionsJson: ['适配器', 'LED驱动', '充电器', '工业电源', '服务器电源', '家电', '电机驱动', '其他'] },
    { fieldKey: 'efficiencyLevel', label: '能效等级', fieldType: 'single_select', required: true, sortOrder: 9, optionsJson: ['六级能效', 'CoC Tier 2', '80PLUS金牌', '80PLUS白金'] },
    { fieldKey: 'standbyPowerMax', label: '最大待机功耗(mW)', fieldType: 'number', sortOrder: 10 },
    { fieldKey: 'maxAmbientTemp', label: '最高环境温度(°C)', fieldType: 'number', sortOrder: 11 },
    { fieldKey: 'certifications', label: '认证', fieldType: 'multi_select', sortOrder: 12, optionsJson: ['CCC', 'UL', 'CE', 'FCC', 'PSE', 'KC', 'RoHS'] },
    { fieldKey: 'requiresPfc', label: '需要PFC', fieldType: 'boolean', sortOrder: 13 },
    { fieldKey: 'advantages', label: '优势', fieldType: 'text', sortOrder: 14 },
  ];

  for (const cfg of productFieldConfigs) {
    await prisma.productFieldConfig.upsert({
      where: { resourceType_fieldKey: { resourceType: 'product', fieldKey: cfg.fieldKey } },
      update: {},
      create: {
        resourceType: 'product',
        fieldKey: cfg.fieldKey,
        label: cfg.label,
        fieldType: cfg.fieldType,
        required: cfg.required ?? false,
        optionsJson: cfg.optionsJson ? cfg.optionsJson as Prisma.InputJsonValue : Prisma.DbNull,
        sortOrder: cfg.sortOrder,
        enabled: true,
      },
    });
  }

  // ── Permissions (14 codes) ──────────────────────────
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
  ];

  const permissions: Record<string, Awaited<ReturnType<typeof prisma.permission.upsert>>> = {};
  for (const p of permissionDefs) {
    permissions[p.code] = await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description },
      create: { code: p.code, description: p.description, resourceGroup: p.resourceGroup, action: p.action },
    });
  }

  // ── Roles (4) ───────────────────────────────────────
  const roleDefs = [
    { name: '管理员', description: '系统管理员，拥有全部权限', isSystem: true, perms: permissionDefs.map(p => p.code) },
    { name: '审核员', description: '内容审核员，仅读权限+审计', isSystem: true, perms: ['admin.dashboard.read', 'products.read', 'solutions.read', 'materials.read', 'knowledge.read', 'audit.read', 'leads.read'] },
    { name: '员工', description: '内部员工，读权限+线索管理', isSystem: true, perms: ['admin.dashboard.read', 'products.read', 'solutions.read', 'materials.read', 'leads.read', 'leads.write'] },
    { name: '普通用户', description: '注册用户，无权限', isSystem: true, perms: [] as string[] },
  ];

  const roles: Record<string, Awaited<ReturnType<typeof prisma.roleModel.upsert>>> = {};
  for (const r of roleDefs) {
    const role = await prisma.roleModel.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    });
    roles[r.name] = role;
  }

  // ── RolePermission associations ─────────────────────
  for (const r of roleDefs) {
    for (const permCode of r.perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roles[r.name].id, permissionId: permissions[permCode].id } },
        update: {},
        create: { roleId: roles[r.name].id, permissionId: permissions[permCode].id },
      });
    }
  }

  // ── Assign "管理员" role to admin user ──────────────
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roles['管理员'].id } },
    update: {},
    create: { userId: adminUser.id, roleId: roles['管理员'].id },
  });

  // ── 5 Products ───────────────────────────────────────
  const productData = [
    {
      model: 'LP3524',
      series: 'LP352x',
      params: { type: '同步整流驱动', maxVoltage: 24, maxCurrent: 5 },
      advantages: ['低功耗', '高可靠性', '同步整流'],
    },
    {
      model: 'LP3525',
      series: 'LP352x',
      params: { type: '同步整流驱动', maxVoltage: 24, maxCurrent: 10 },
      advantages: ['低功耗', '高效率', '同步整流'],
    },
    {
      model: 'LP6655',
      series: 'LP66xx',
      params: { type: 'PFC控制器', maxFrequency: 200 },
      advantages: ['功率因数校正', '高效率', '低THD'],
    },
    {
      model: 'LP9961',
      series: 'LP996x',
      params: { type: 'LLC控制器', maxFrequency: 500 },
      advantages: ['LLC谐振控制', '高效率', '高功率密度'],
    },
    {
      model: 'LP9962',
      series: 'LP996x',
      params: { type: 'LLC控制器', maxFrequency: 500 },
      advantages: ['LLC谐振控制', '高效率', '高功率密度'],
    },
  ];

  const products: Record<string, Awaited<ReturnType<typeof prisma.product.upsert>>> = {};
  for (const data of productData) {
    products[data.model] = await prisma.product.upsert({
      where: { model: data.model },
      update: { params: data.params as Prisma.InputJsonValue, advantages: data.advantages },
      create: {
        model: data.model,
        series: data.series,
        status: 'ACTIVE',
        params: data.params as Prisma.InputJsonValue,
        advantages: data.advantages,
      },
    });
  }

  // ── 2 Solutions ──────────────────────────────────────
  const solutionData = [
    { name: '65W USB-PD适配器方案', description: '基于LP9961+LP3524的高效65W USB-PD适配器参考设计' },
    { name: '240W 服务器电源方案', description: '基于LP9962+LP6655的高功率服务器电源解决方案' },
  ];

  const solutions: Awaited<ReturnType<typeof prisma.solution.findFirst>>[] = [];
  for (const data of solutionData) {
    let solution = await prisma.solution.findFirst({ where: { name: data.name } });
    if (!solution) {
      solution = await prisma.solution.create({
        data: { name: data.name, description: data.description, status: 'ACTIVE' },
      });
    }
    solutions.push(solution);
  }

  // ── 5 ProductSolution links ──────────────────────────
  const psLinks = [
    { product: 'LP9961', solutionIdx: 0 },
    { product: 'LP3524', solutionIdx: 0 },
    { product: 'LP9962', solutionIdx: 1 },
    { product: 'LP6655', solutionIdx: 1 },
    { product: 'LP3525', solutionIdx: 1 },
  ];

  for (const link of psLinks) {
    await prisma.productSolution.upsert({
      where: {
        productId_solutionId: {
          productId: products[link.product].id,
          solutionId: solutions[link.solutionIdx]!.id,
        },
      },
      update: {},
      create: {
        productId: products[link.product].id,
        solutionId: solutions[link.solutionIdx]!.id,
      },
    });
  }

  // ── Materials ────────────────────────────────────────
  let material = await prisma.material.findFirst({ where: { title: 'LP3524 Datasheet' } });
  if (!material) {
    material = await prisma.material.create({
      data: {
        type: 'datasheet',
        title: 'LP3524 Datasheet',
        originalStorageKey: 'seed/lp3524-datasheet.pdf',
        mimeType: 'application/pdf',
        pageCount: 10,
        status: 'ACTIVE',
        productId: products['LP3524'].id,
      },
    });
  }

  // Update LP3524.datasheetMaterialId
  await prisma.product.update({
    where: { id: products['LP3524'].id },
    data: { datasheetMaterialId: material.id },
  });

  let applicationMaterial = await prisma.material.findFirst({
    where: { title: 'LP3524 Application Note' },
  });
  if (!applicationMaterial) {
    applicationMaterial = await prisma.material.create({
      data: {
        type: 'application-note',
        title: 'LP3524 Application Note',
        originalStorageKey: 'seed/lp3524-application-note.pdf',
        mimeType: 'application/pdf',
        pageCount: 8,
        status: 'ACTIVE',
        productId: products['LP3524'].id,
      },
    });
  }

  // ── 2 KnowledgeDocs ──────────────────────────────────
  const doc1 = await prisma.knowledgeDoc.upsert({
    where: { materialId: material.id },
    update: { title: 'LP3524 Datasheet Knowledge Doc' },
    create: {
      materialId: material.id,
      title: 'LP3524 Datasheet Knowledge Doc',
      sourceType: 'datasheet',
      status: 'READY',
      indexVersion: 'v1',
      indexedAt: new Date(),
    },
  });

  const doc2 = await prisma.knowledgeDoc.upsert({
    where: { materialId: applicationMaterial.id },
    update: { title: 'LP3524 Application Notes' },
    create: {
      materialId: applicationMaterial.id,
      title: 'LP3524 Application Notes',
      sourceType: 'application-note',
      status: 'READY',
      indexVersion: 'v1',
      indexedAt: new Date(),
    },
  });

  // ── 10 KnowledgeChunks (5 per doc) ───────────────────
  const docChunks: [typeof doc1, string[]][] = [
    [doc1, [
      'LP3524 is a synchronous rectification driver for high-efficiency power supplies.',
      'The device supports up to 24V input voltage and 5A output current.',
      'Key features include adaptive dead-time control and cycle-by-cycle current limiting.',
      'The LP3524 is available in SOP-8 package with industrial temperature range.',
      'Typical application: 65W USB-PD adapter as secondary-side SR controller.',
    ]],
    [doc2, [
      'Application note for LP3524 in high-efficiency USB-PD adapters.',
      'Recommended transformer design: 150µH primary inductance with 8:1 turns ratio.',
      'Output capacitor selection: 2×470µF low-ESR electrolytic for ripple reduction.',
      'Thermal design considerations: keep junction temperature below 125°C.',
      'EMI compliance test results show >6dB margin at 150kHz switching frequency.',
    ]],
  ];

  const allChunks: Awaited<ReturnType<typeof prisma.knowledgeChunk.upsert>>[] = [];
  for (const [doc, contents] of docChunks) {
    for (let ci = 0; ci < contents.length; ci++) {
      const content = contents[ci];
      const contentHash = createHash('sha256').update(content).digest('hex');
      const chunk = await prisma.knowledgeChunk.upsert({
        where: {
          docId_indexVersion_contentHash: {
            docId: doc.id,
            indexVersion: 'v1',
            contentHash,
          },
        },
        update: { content, page: ci + 1 },
        create: {
          docId: doc.id,
          indexVersion: 'v1',
          content,
          page: ci + 1,
          contentHash,
        },
      });
      allChunks.push(chunk);
    }
  }

  // ── 10 KnowledgeEvents (1 per chunk) ─────────────────
  const eventSummaries: { summary: string; eventType: string }[] = [
    { summary: 'Device overview and specifications', eventType: 'specification' },
    { summary: 'Voltage and current ratings', eventType: 'parameter' },
    { summary: 'Feature description: adaptive dead-time control', eventType: 'feature' },
    { summary: 'Packaging and environmental data', eventType: 'package' },
    { summary: 'Application example: USB-PD adapter reference design', eventType: 'application' },
    { summary: 'App note: transformer design guidelines', eventType: 'design_guide' },
    { summary: 'App note: output capacitor selection', eventType: 'design_guide' },
    { summary: 'App note: thermal management recommendations', eventType: 'design_guide' },
    { summary: 'App note: EMI compliance test results', eventType: 'compliance' },
    { summary: 'App note: performance summary and waveforms', eventType: 'summary' },
  ];

  const events: Awaited<ReturnType<typeof prisma.knowledgeEvent.upsert>>[] = [];
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const { summary, eventType } = eventSummaries[i];
    const event = await prisma.knowledgeEvent.upsert({
      where: { chunkId: chunk.id },
      update: { summary, eventType },
      create: { chunkId: chunk.id, summary, eventType },
    });
    events.push(event);
  }

  // ── 5 KnowledgeEntities ──────────────────────────────
  const entitySeed = [
    { name: '同步整流', normalizedName: '同步整流', entityType: 'technology' },
    { name: '过压保护', normalizedName: '过压保护', entityType: 'function' },
    { name: '软启动', normalizedName: '软启动', entityType: 'function' },
    { name: '零电压开关', normalizedName: '零电压开关', entityType: 'technology' },
    { name: '功率因数校正', normalizedName: '功率因数校正', entityType: 'technology' },
  ];

  const entities: Awaited<ReturnType<typeof prisma.knowledgeEntity.upsert>>[] = [];
  for (const ent of entitySeed) {
    const entity = await prisma.knowledgeEntity.upsert({
      where: { normalizedName: ent.normalizedName },
      update: { name: ent.name, entityType: ent.entityType },
      create: { name: ent.name, normalizedName: ent.normalizedName, entityType: ent.entityType },
    });
    entities.push(entity);
  }

  // ── 8 KnowledgeEventEntity associations ──────────────
  const linkData: { eventIdx: number; entityIdx: number; role: string }[] = [
    { eventIdx: 0, entityIdx: 0, role: 'technology' },
    { eventIdx: 1, entityIdx: 1, role: 'protection' },
    { eventIdx: 2, entityIdx: 2, role: 'function' },
    { eventIdx: 3, entityIdx: 0, role: 'technology' },
    { eventIdx: 4, entityIdx: 0, role: 'technology' },
    { eventIdx: 5, entityIdx: 3, role: 'technology' },
    { eventIdx: 6, entityIdx: 1, role: 'protection' },
    { eventIdx: 7, entityIdx: 3, role: 'technology' },
  ];

  for (const link of linkData) {
    await prisma.knowledgeEventEntity.upsert({
      where: {
        eventId_entityId_role: {
          eventId: events[link.eventIdx].id,
          entityId: entities[link.entityIdx].id,
          role: link.role,
        },
      },
      update: {},
      create: {
        eventId: events[link.eventIdx].id,
        entityId: entities[link.entityIdx].id,
        role: link.role,
      },
    });
  }

  // ── Summary ─────────────────────────────────────────
  const totalRoles = await prisma.roleModel.count();
  const totalPerms = await prisma.permission.count();
  const totalFieldConfigs = await prisma.productFieldConfig.count();
  console.log(`Seed complete: 1 admin, ${totalRoles} roles, ${totalPerms} permissions, ${totalFieldConfigs} field configs, 5 products, 2 solutions, 2 materials, 2 docs, 10 chunks, 10 events, 5 entities`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });