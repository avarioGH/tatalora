const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../src/lib/api.ts');
let content = fs.readFileSync(target, 'utf8');

const addition = `
export const CommunicationAPI = {
  getSettings: async () => (await api.get('/communication/settings')).data,
  saveSettings: async (data: any) => (await api.post('/communication/settings', data)).data,
  getTemplates: async () => (await api.get('/communication/templates')).data,
  saveTemplate: async (data: any) => (await api.post('/communication/templates', data)).data,
  prepareInvoice: async (id: string) => (await api.get('/communication/invoices/' + id + '/prepare')).data,
  sendInvoice: async (id: string, data: any) => (await api.post('/communication/invoices/' + id + '/send', data)).data,
  getInvoiceHistory: async (id: string) => (await api.get('/communication/invoices/' + id + '/history')).data,
  getLogs: async (params?: any) => (await api.get('/communication/logs', { params })).data,
  getPdfUrl: (id: string) => '/communication/invoices/' + id + '/pdf',
};
`;

if (!content.includes('CommunicationAPI')) {
  content += addition;
  fs.writeFileSync(target, content, 'utf8');
  console.log('Successfully appended CommunicationAPI to frontend/src/lib/api.ts');
} else {
  console.log('CommunicationAPI already exists');
}
