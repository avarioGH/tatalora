import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EcommerceCatalogService {
  constructor(private prisma: PrismaService) {}

  async getPublishedProducts(companyId: string, query: any) {
    const {
      category,
      search,
      page = 1,
      limit = 20,
      sort = 'ecommerce_sort_order',
    } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      company_id: companyId,
      status: true,
      is_published: true,
    };

    if (category) where.category_id = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const orderBy: any = {};
    if (sort === 'price_asc') orderBy.selling_price = 'asc';
    else if (sort === 'price_desc') orderBy.selling_price = 'desc';
    else if (sort === 'newest') orderBy.created_at = 'desc';
    else orderBy.ecommerce_sort_order = 'asc';

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        select: {
          id: true,
          code: true,
          name: true,
          ecommerce_slug: true,
          selling_price: true,
          image: true,
          category: { select: { name: true } },
          images: { select: { image_url: true, is_primary: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) },
    };
  }

  async getProductBySlug(companyId: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        company_id: companyId,
        ecommerce_slug: slug,
        status: true,
        is_published: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        seo_title: true,
        seo_description: true,
        ecommerce_slug: true,
        selling_price: true,
        image: true,
        weight: true,
        images: { select: { image_url: true, is_primary: true } },
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Aggregate available stock
    const stocks = await this.prisma.warehouseStock.findMany({
      where: { product_id: product.id },
    });
    const available_stock = stocks.reduce(
      (acc, s) => acc + s.available_stock,
      0,
    );

    return { ...product, available_stock };
  }

  async generateDeterministicSlug(
    companyId: string,
    name: string,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: { company_id: companyId, ecommerce_slug: slug },
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
