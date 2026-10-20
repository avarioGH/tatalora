
$file = "test/ecommerce.certification.ts"
$content = Get-Content $file

$content = $content -replace "const moduleRef = await Test.createTestingModule\(\{.*?\}\)\.compile\(\);", "const moduleRef = await Test.createTestingModule({
    imports: [
      EventEmitterModule.forRoot(),
      PrismaModule, 
      FinanceModule, 
      IntegrationsModule, 
      EcommerceModule,
      GlModule
    ],
    providers: [
      PrismaService, EcommerceCatalogService, EcommerceCartService, EcommerceCheckoutService,
      TripayService, IntegrationWebhookService, IntegrationCredentialService, IntegrationIdempotencyService, GlService
    ]
}).compile();"

Set-Content $file -Value $content

