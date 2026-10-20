import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EcommerceCartService {
  constructor(private prisma: PrismaService) {}

  async getCart(companyId: string, sessionId: string) {
    let cart = await this.prisma.ecommerceCart.findUnique({
      where: {
        company_id_session_id: { company_id: companyId, session_id: sessionId },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                selling_price: true,
                image: true,
                ecommerce_slug: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.ecommerceCart.create({
        data: { company_id: companyId, session_id: sessionId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  selling_price: true,
                  image: true,
                  ecommerce_slug: true,
                },
              },
            },
          },
        },
      });
    }

    return this.calculateCart(cart);
  }

  async addItem(
    companyId: string,
    sessionId: string,
    productId: string,
    quantity: number,
  ) {
    if (quantity <= 0)
      throw new BadRequestException('Quantity must be greater than 0');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || !product.status || !product.is_published) {
      throw new BadRequestException('Product is not available');
    }

    let cart = await this.prisma.ecommerceCart.findUnique({
      where: {
        company_id_session_id: { company_id: companyId, session_id: sessionId },
      },
    });
    if (!cart) {
      cart = await this.prisma.ecommerceCart.create({
        data: { company_id: companyId, session_id: sessionId },
      });
    }

    const existingItem = await this.prisma.ecommerceCartItem.findFirst({
      where: { cart_id: cart.id, product_id: productId },
    });

    if (existingItem) {
      await this.prisma.ecommerceCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await this.prisma.ecommerceCartItem.create({
        data: { cart_id: cart.id, product_id: productId, quantity },
      });
    }

    return this.getCart(companyId, sessionId);
  }

  async updateItem(
    companyId: string,
    sessionId: string,
    itemId: string,
    quantity: number,
  ) {
    const cart = await this.prisma.ecommerceCart.findUnique({
      where: {
        company_id_session_id: { company_id: companyId, session_id: sessionId },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    if (quantity <= 0) {
      await this.prisma.ecommerceCartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.ecommerceCartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(companyId, sessionId);
  }

  async removeItem(companyId: string, sessionId: string, itemId: string) {
    const cart = await this.prisma.ecommerceCart.findUnique({
      where: {
        company_id_session_id: { company_id: companyId, session_id: sessionId },
      },
    });
    if (!cart) throw new NotFoundException('Cart not found');

    await this.prisma.ecommerceCartItem.delete({ where: { id: itemId } });
    return this.getCart(companyId, sessionId);
  }

  async clearCart(companyId: string, sessionId: string) {
    const cart = await this.prisma.ecommerceCart.findUnique({
      where: {
        company_id_session_id: { company_id: companyId, session_id: sessionId },
      },
    });
    if (cart) {
      await this.prisma.ecommerceCartItem.deleteMany({
        where: { cart_id: cart.id },
      });
    }
    return { success: true };
  }

  private calculateCart(cart: any) {
    let subtotal = 0;
    const items = cart.items.map((item: any) => {
      const lineTotal = item.quantity * item.product.selling_price;
      subtotal += lineTotal;
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product.name,
        slug: item.product.ecommerce_slug,
        image: item.product.image,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        subtotal: lineTotal,
      };
    });

    const tax = subtotal * 0.11; // Standard 11% VAT
    const grand_total = subtotal + tax;

    return {
      id: cart.id,
      session_id: cart.session_id,
      items,
      subtotal,
      tax,
      grand_total,
    };
  }
}
