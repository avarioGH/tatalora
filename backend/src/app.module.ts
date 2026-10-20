import { TimberSalesModule } from './sales/timber-sales.module';
import { FixController } from './fix.controller';
import { MasterDataModule } from './inventory/master-data/master-data.module';
import { ApprovalModule } from './approval/approval.module';
import { EcommerceModule } from './ecommerce/ecommerce.module';
import { MrpModule } from './mrp/mrp.module';
import { HealthModule } from './health/health.module';
import { CoreModule } from './core/core.module';
import { ReportsModule } from './reports/reports.module';
import { Module } from '@nestjs/common';
import { SystemModule } from './system/system.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InventoryModule } from './inventory/inventory.module';
import { PrismaModule } from './prisma/prisma.module';
import { AssetModule } from './asset/asset.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { FinanceModule } from './finance/finance.module';
import { GlModule } from './gl/gl.module';
import { AccountingModule } from './accounting/accounting.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportingModule } from './reporting/reporting.module';
import { DocumentModule } from './document/document.module';
import { AutomationModule } from './automation/automation.module';
import { PlatformModule } from './platform/platform.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { TripayModule } from './integrations/providers/payment/tripay/tripay.module';
import { CrmModule } from './crm/crm.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { HrModule } from './hr/hr.module';
import { PosModule } from './pos/pos.module';
import { NotificationModule } from './notification/notification.module';
import { ShopeeModule } from './integrations/shopee/shopee.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AiModule } from './ai/ai.module';
import { ProductionModule } from './inventory/production/production.module';
import { PurchaseModule } from './inventory/purchase/purchase.module';
import { ShipmentModule } from './inventory/shipment/shipment.module';
import { OpnameModule } from './inventory/opname/opname.module';
import { DashboardModule } from './inventory/dashboard/dashboard.module';
import { PartaiModule } from './inventory/partai/partai.module';

import { EventEmitterModule } from '@nestjs/event-emitter';

import { ReportsModule as InventoryReportsModule } from './inventory/reports/reports.module';

import { SalesReturnModule } from './sales/sales-return/sales-return.module';

import { CommunicationModule } from './communication/communication.module';

@Module({
  imports: [
    CommunicationModule,
    SalesReturnModule,
    TimberSalesModule,
    ApprovalModule,
    EcommerceModule,
    SystemModule,
    ManufacturingModule,
    HealthModule,
    CoreModule,
    ReportsModule,
    InventoryReportsModule,
    DashboardModule,
    PartaiModule,
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    InventoryModule,
    PrismaModule,
    AssetModule,
    MaintenanceModule,
    FinanceModule,
    GlModule,
    AccountingModule,
    AnalyticsModule,
    ReportingModule,
    DocumentModule,
    AutomationModule,
    PlatformModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    TripayModule,
    CrmModule,
    PurchasingModule,
    HrModule,
    PosModule,
    NotificationModule,
    ShopeeModule,
    AiModule,
    MrpModule,
    MasterDataModule,
    ProductionModule,
    PurchaseModule,
    ShipmentModule,
    OpnameModule,
  ],
  controllers: [AppController, FixController],
  providers: [AppService],
})
export class AppModule {}
