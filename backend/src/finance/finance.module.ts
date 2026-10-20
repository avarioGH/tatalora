import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { PeriodController } from './period/period.controller';
import { ExpenseService } from './expense/expense.service';
import { AssetService } from './asset/asset.service';
import { FinanceService } from './finance.service';
import { PeriodService } from './period/period.service';
import { BankReconciliationController } from './bank-reconciliation/bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation/bank-reconciliation.service';

import { PrismaModule } from '../prisma/prisma.module';
import { GlModule } from '../gl/gl.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';

import { ExpenseController } from './expense/expense.controller';
import { AssetFinanceController } from './asset/asset-finance.controller';
import { NettingController } from './netting/netting.controller';
import { NettingService } from './netting/netting.service';

@Module({
  imports: [PrismaModule, GlModule, InvoiceModule, PaymentModule],
  controllers: [
    FinanceController,
    PeriodController,
    BankReconciliationController,
    ExpenseController,
    AssetFinanceController,
    NettingController,
  ],
  providers: [
    ExpenseService,
    AssetService,
    FinanceService,
    PeriodService,
    BankReconciliationService,
    NettingService,
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
