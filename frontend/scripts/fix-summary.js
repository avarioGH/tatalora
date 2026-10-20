const fs = require('fs');

const fixPage = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace the top layout grid
  content = content.replace(
    /<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">/g,
    '<div className="grid grid-cols-1 gap-6">'
  );
  content = content.replace(
    /<div className="xl:col-span-2 space-y-6">/g,
    '<div className="space-y-6">'
  );

  // 2. Remove the old right column
  // It starts with {/* Right Column (Summary) */}
  // and ends with </div> before </div> </div> (the end of the grid)
  const rightColRegex = /\{\/\* Right Column \(Summary\) \*\/\}\s*<div className="xl:col-span-1">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
  content = content.replace(rightColRegex, '</div>\n      </div>');

  // 3. Replace State
  const stateOldStart = '// Summary block state';
  const stateOldEnd = '// Real data state';
  const stateOldRegex = new RegExp(`${stateOldStart}[\\s\\S]*?${stateOldEnd}`);
  
  const newState = `// Summary block state
  const [showDiscount, setShowDiscount] = useState(false)
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent")
  const [discountValue, setDiscountValue] = useState(0)

  const [showShipping, setShowShipping] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  
  const [showTransactionFee, setShowTransactionFee] = useState(false)
  const [transactionFeeName, setTransactionFeeName] = useState("")
  const [transactionFeeMode, setTransactionFeeMode] = useState<"percent" | "amount">("amount")
  const [transactionFeeValue, setTransactionFeeValue] = useState(0)
  
  const [showDownPayment, setShowDownPayment] = useState(false)
  const [downPaymentMode, setDownPaymentMode] = useState<"percent" | "amount">("amount")
  const [downPaymentValue, setDownPaymentValue] = useState(0)

  // Calculated Totals
  const subTotal = items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const calculatedDiscount = discountMode === 'percent' ? (subTotal * discountValue / 100) : discountValue;
  const calculatedTransactionFee = transactionFeeMode === 'percent' ? (subTotal * transactionFeeValue / 100) : transactionFeeValue;
  const total = subTotal - calculatedDiscount + shippingCost + calculatedTransactionFee;
  const calculatedDownPayment = downPaymentMode === 'percent' ? (total * downPaymentValue / 100) : downPaymentValue;
  const grandTotal = total - calculatedDownPayment;

  // Real data state`;
  content = content.replace(stateOldRegex, newState);

  // 4. Inject new Summary Block before Section 3
  const section3Marker = '{/* Section 3: Notes & Attachments */}';
  
  const summaryUI = `
            {/* NEW Summary Block (Mekari Style) */}
            <Card className="border-0 shadow-sm ring-1 ring-border bg-card">
              <CardContent className="p-0 flex flex-col md:flex-row">
                {/* Empty left side to push summary to right like Mekari */}
                <div className="hidden md:block md:w-1/2"></div>
                <div className="w-full md:w-1/2 p-6 space-y-4 border-l border-border bg-muted/10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Sub Total</span>
                    <span className="font-semibold text-foreground">
                      {subTotal.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Tambahan Diskon */}
                  <div className="flex flex-col gap-2 text-sm">
                    {!showDiscount ? (
                      <div className="flex items-center text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setShowDiscount(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Tambahan Diskon
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => {setShowDiscount(false); setDiscountValue(0);}}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <span className="text-muted-foreground font-medium">Tambahan Diskon</span>
                          </div>
                          <span className="font-semibold text-foreground text-right">- {calculatedDiscount.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-2 items-center ml-7">
                          <div className="flex bg-muted rounded-md border border-border p-0.5">
                            <div className={\`px-3 py-1 cursor-pointer text-xs rounded-sm transition-colors \${discountMode === 'percent' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDiscountMode('percent')}>%</div>
                            <div className={\`px-3 py-1 cursor-pointer text-xs rounded-sm transition-colors \${discountMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDiscountMode('amount')}>Rp</div>
                          </div>
                          <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Biaya Pengiriman */}
                  <div className="flex flex-col gap-2 text-sm">
                    {!showShipping ? (
                      <div className="flex items-center text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setShowShipping(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Biaya Pengiriman
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => {setShowShipping(false); setShippingCost(0);}}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <span className="text-muted-foreground font-medium">Biaya Pengiriman</span>
                          </div>
                          <span className="font-semibold text-foreground text-right">{shippingCost.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-2 items-center ml-7">
                           <div className="px-3 py-1 bg-muted border border-border rounded-md text-xs text-muted-foreground">Rp</div>
                           <Input type="number" value={shippingCost} onChange={(e) => setShippingCost(Number(e.target.value) || 0)} className="h-8 w-32 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Biaya Transaksi */}
                  <div className="flex flex-col gap-2 text-sm">
                    {!showTransactionFee ? (
                      <div className="flex items-center text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setShowTransactionFee(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Biaya Transaksi
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => {setShowTransactionFee(false); setTransactionFeeValue(0);}}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Input placeholder="Nama Biaya" value={transactionFeeName} onChange={(e)=>setTransactionFeeName(e.target.value)} className="h-7 text-xs w-32" />
                          </div>
                          <span className="font-semibold text-foreground text-right">{calculatedTransactionFee.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-2 items-center ml-7">
                          <div className="flex bg-muted rounded-md border border-border p-0.5">
                            <div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${transactionFeeMode === 'percent' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setTransactionFeeMode('percent')}>%</div>
                            <div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${transactionFeeMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setTransactionFeeMode('amount')}>Rp</div>
                          </div>
                          <Input type="number" value={transactionFeeValue} onChange={(e) => setTransactionFeeValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">
                        {total.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Uang Muka */}
                  <div className="flex flex-col gap-2 text-sm pt-2">
                    {!showDownPayment ? (
                      <div className="flex items-center text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setShowDownPayment(true)}>
                        <Plus className="w-3 h-3 mr-1" /> Uang Muka
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => {setShowDownPayment(false); setDownPaymentValue(0);}}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <span className="text-muted-foreground font-medium">Uang Muka</span>
                          </div>
                          <span className="font-semibold text-foreground text-right">- {calculatedDownPayment.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-2 items-center ml-7">
                          <div className="flex bg-muted rounded-md border border-border p-0.5">
                            <div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${downPaymentMode === 'percent' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDownPaymentMode('percent')}>%</div>
                            <div className={\`px-2 py-1 cursor-pointer text-xs rounded-sm transition-colors \${downPaymentMode === 'amount' ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-background'}\`} onClick={() => setDownPaymentMode('amount')}>Rp</div>
                          </div>
                          <Input type="number" value={downPaymentValue} onChange={(e) => setDownPaymentValue(Number(e.target.value) || 0)} className="h-8 w-24 text-sm" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-foreground">Sisa Tagihan</span>
                      <span className="text-xl font-bold text-foreground">
                        {grandTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4">
                     <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="lg">
                       <Save className="w-4 h-4 mr-2" />
                       Simpan Transaksi
                     </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            ${section3Marker}`;

  content = content.replace(section3Marker, summaryUI);

  fs.writeFileSync(filePath, content, 'utf8');
}

fixPage('src/app/sales/invoices/create/page.tsx');
fixPage('src/app/sales/quotations/create/page.tsx');
fixPage('src/app/sales/orders/create/page.tsx');

console.log('Fixed Summary block for all 3 sales forms');
