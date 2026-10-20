const fs = require('fs');
const p = 'src/app/sales/invoices/create/page.tsx';
let c = fs.readFileSync(p, 'utf8');
c = c.replace('import React, { useState } from "react"', 'import React, { useState, useEffect } from "react"');
fs.writeFileSync(p, c, 'utf8');
console.log('Fixed useEffect import properly');
