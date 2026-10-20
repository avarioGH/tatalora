
$file = "src/ecommerce/ecommerce.module.ts"
$content = "import { Module } from '@nestjs/common';
import { EcommerceCatalogService } from './ecommerce-catalog.service';
import { EcommerceCartService } from './ecommerce-cart.service';
import { EcommerceCheckoutService } from './ecommerce-checkout.service';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TripayService } from '../integrations/providers/payment/tripay/tripay.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../finance/payment/payment.module';

@Module({
  imports: [PrismaModule, IntegrationsModule, PaymentModule],
  providers: [
    EcommerceCatalogService,
    EcommerceCartService,
    EcommerceCheckoutService,
    TripayService
  ],
  exports: [EcommerceCatalogService, EcommerceCartService, EcommerceCheckoutService]
})
export class EcommerceModule {}
"
Set-Content $file -Value $content

