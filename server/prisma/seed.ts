import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123456';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // ── 1 ADMIN user ─────────────────────────────────────
  await prisma.user.upsert({
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

  // ── 1 Material (LP3524 datasheet) ────────────────────
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

  // ── 2 KnowledgeDocs (both linked to same Material) ───
  // Doc1: upsert by materialId (unique)
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

  // Doc2: findFirst+create by title, still passes materialId=material.id
  let doc2 = await prisma.knowledgeDoc.findFirst({
    where: { title: 'LP3524 Application Notes' },
  });
  if (!doc2) {
    doc2 = await prisma.knowledgeDoc.create({
      data: {
        materialId: material.id,
        title: 'LP3524 Application Notes',
        sourceType: 'application-note',
        status: 'READY',
        indexVersion: 'v1',
        indexedAt: new Date(),
      },
    });
  }

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

  console.log('Seed complete: 1 admin, 5 products, 2 solutions, 1 material, 2 docs, 10 chunks, 10 events, 5 entities');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
