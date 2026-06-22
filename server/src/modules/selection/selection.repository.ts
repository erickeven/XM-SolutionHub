import prisma from '../../lib/prisma';
import type { ProductForMatching } from './selection.types';

export async function findActiveProducts(): Promise<ProductForMatching[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      model: true,
      series: true,
      status: true,
      params: true,
      advantages: true,
      datasheetMaterialId: true,
    },
  });

  return products.map((p) => ({
    id: p.id,
    model: p.model,
    series: p.series,
    status: p.status,
    params: p.params as Record<string, unknown>,
    advantages: p.advantages,
    datasheetMaterialId: p.datasheetMaterialId,
  }));
}

export async function findPopularProducts(limit = 10): Promise<ProductForMatching[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      model: true,
      series: true,
      status: true,
      params: true,
      advantages: true,
      datasheetMaterialId: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return products.map((p) => ({
    id: p.id,
    model: p.model,
    series: p.series,
    status: p.status,
    params: p.params as Record<string, unknown>,
    advantages: p.advantages,
    datasheetMaterialId: p.datasheetMaterialId,
  }));
}

export async function findByIds(ids: string[]): Promise<ProductForMatching[]> {
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      model: true,
      series: true,
      status: true,
      params: true,
      advantages: true,
      datasheetMaterialId: true,
    },
  });

  return products.map((p) => ({
    id: p.id,
    model: p.model,
    series: p.series,
    status: p.status,
    params: p.params as Record<string, unknown>,
    advantages: p.advantages,
    datasheetMaterialId: p.datasheetMaterialId,
  }));
}