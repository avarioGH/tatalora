"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var company, hashedPassword, ownerRole, owner, whA, whB, whC, catCoffee, unitPcs, productsData, _i, productsData_1, pd, prod, cashAccount, categoriesData, _a, categoriesData_1, cat, exists;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('Start seeding...');
                    return [4 /*yield*/, prisma.company.findFirst({ where: { name: 'Avario Coffee Co.' } })];
                case 1:
                    company = _b.sent();
                    if (!!company) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma.company.create({
                            data: {
                                name: 'Avario Coffee Co.',
                                address: 'Jl. Jenderal Sudirman No. 1, Jakarta',
                                phone: '021-555-0199',
                                email: 'contact@avario.com',
                                tax_number: '01.234.567.8-999.000',
                            },
                        })];
                case 2:
                    company = _b.sent();
                    _b.label = 3;
                case 3: return [4 /*yield*/, bcrypt.hash('password123', 10)];
                case 4:
                    hashedPassword = _b.sent();
                    return [4 /*yield*/, prisma.role.upsert({
                            where: { company_id_name: { company_id: company.id, name: 'Owner' } },
                            update: {},
                            create: {
                                company_id: company.id,
                                name: 'Owner',
                            }
                        })];
                case 5:
                    ownerRole = _b.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { username: 'owner' },
                            update: {},
                            create: {
                                company_id: company.id,
                                email: 'owner@avario.com',
                                username: 'owner',
                                password: hashedPassword,
                                name: 'Avario Owner',
                                role_id: ownerRole.id,
                                status: true,
                            },
                        })];
                case 6:
                    owner = _b.sent();
                    return [4 /*yield*/, prisma.warehouse.upsert({
                            where: { company_id_code: { company_id: company.id, code: 'WH-A' } },
                            update: {},
                            create: {
                                company_id: company.id,
                                name: 'Gudang Pusat (A)',
                                code: 'WH-A',
                                address: 'Kawasan Industri Pulogadung',
                            }
                        })];
                case 7:
                    whA = _b.sent();
                    return [4 /*yield*/, prisma.warehouse.upsert({
                            where: { company_id_code: { company_id: company.id, code: 'WH-B' } },
                            update: {},
                            create: {
                                company_id: company.id,
                                name: 'Gudang Cabang (B)',
                                code: 'WH-B',
                                address: 'Bandung Raya',
                            }
                        })];
                case 8:
                    whB = _b.sent();
                    return [4 /*yield*/, prisma.warehouse.upsert({
                            where: { company_id_code: { company_id: company.id, code: 'WH-C' } },
                            update: {},
                            create: {
                                company_id: company.id,
                                name: 'Gudang Retail (C)',
                                code: 'WH-C',
                                address: 'Mall Kelapa Gading',
                            }
                        })];
                case 9:
                    whC = _b.sent();
                    return [4 /*yield*/, prisma.category.findFirst({ where: { company_id: company.id, name: 'Biji Kopi' } })];
                case 10:
                    catCoffee = _b.sent();
                    if (!!catCoffee) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.category.create({ data: { company_id: company.id, name: 'Biji Kopi' } })];
                case 11:
                    catCoffee = _b.sent();
                    _b.label = 12;
                case 12: return [4 /*yield*/, prisma.unit.findFirst({ where: { company_id: company.id, name: 'Pcs' } })];
                case 13:
                    unitPcs = _b.sent();
                    if (!!unitPcs) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.unit.create({ data: { company_id: company.id, name: 'Pcs' } })];
                case 14:
                    unitPcs = _b.sent();
                    _b.label = 15;
                case 15:
                    productsData = [
                        { code: 'KOP-001', name: 'Kopi Arabica Premium 1Kg', price: 120000, stockA: 120, stockB: 53, stockC: 80 },
                        { code: 'KOP-002', name: 'Biji Kopi Robusta 1Kg', price: 90000, stockA: 12, stockB: 45, stockC: 30 },
                        { code: 'SYR-001', name: 'Sirup Caramel Monin 700ml', price: 185000, stockA: 24, stockB: 15, stockC: 40 },
                        { code: 'PKG-001', name: 'Gelas Kertas 8oz', price: 1500, stockA: 3500, stockB: 1200, stockC: 5000 },
                    ];
                    _i = 0, productsData_1 = productsData;
                    _b.label = 16;
                case 16:
                    if (!(_i < productsData_1.length)) return [3 /*break*/, 22];
                    pd = productsData_1[_i];
                    return [4 /*yield*/, prisma.product.upsert({
                            where: { company_id_code: { company_id: company.id, code: pd.code } },
                            update: {},
                            create: {
                                company_id: company.id,
                                code: pd.code,
                                name: pd.name,
                                category_id: catCoffee.id,
                                unit_id: unitPcs.id,
                                selling_price: pd.price,
                                purchase_price: pd.price * 0.6,
                            }
                        })];
                case 17:
                    prod = _b.sent();
                    // Seed Stocks for A, B, C
                    return [4 /*yield*/, prisma.warehouseStock.upsert({
                            where: { company_id_warehouse_id_product_id: { company_id: company.id, warehouse_id: whA.id, product_id: prod.id } },
                            update: { current_stock: pd.stockA },
                            create: { company_id: company.id, warehouse_id: whA.id, product_id: prod.id, current_stock: pd.stockA }
                        })];
                case 18:
                    // Seed Stocks for A, B, C
                    _b.sent();
                    return [4 /*yield*/, prisma.warehouseStock.upsert({
                            where: { company_id_warehouse_id_product_id: { company_id: company.id, warehouse_id: whB.id, product_id: prod.id } },
                            update: { current_stock: pd.stockB },
                            create: { company_id: company.id, warehouse_id: whB.id, product_id: prod.id, current_stock: pd.stockB }
                        })];
                case 19:
                    _b.sent();
                    return [4 /*yield*/, prisma.warehouseStock.upsert({
                            where: { company_id_warehouse_id_product_id: { company_id: company.id, warehouse_id: whC.id, product_id: prod.id } },
                            update: { current_stock: pd.stockC },
                            create: { company_id: company.id, warehouse_id: whC.id, product_id: prod.id, current_stock: pd.stockC }
                        })];
                case 20:
                    _b.sent();
                    _b.label = 21;
                case 21:
                    _i++;
                    return [3 /*break*/, 16];
                case 22: return [4 /*yield*/, prisma.cashAccount.findFirst({ where: { company_id: company.id, code: '111-001' } })];
                case 23:
                    cashAccount = _b.sent();
                    if (!!cashAccount) return [3 /*break*/, 25];
                    return [4 /*yield*/, prisma.cashAccount.create({
                            data: {
                                company_id: company.id,
                                code: '111-001',
                                name: 'Kas Utama (BCA)',
                                account_type: 'Bank',
                                current_balance: 185000000,
                            }
                        })];
                case 24:
                    cashAccount = _b.sent();
                    _b.label = 25;
                case 25:
                    categoriesData = [
                        { name: 'Pendapatan Penjualan', type: 'Income', color: '#10B981', icon: 'ShoppingCart' },
                        { name: 'Pendapatan Lainnya', type: 'Income', color: '#3B82F6', icon: 'TrendingUp' },
                        { name: 'Biaya Gaji Karyawan', type: 'Expense', color: '#EF4444', icon: 'Users' },
                        { name: 'Biaya Operasional (Listrik, Air, Internet)', type: 'Expense', color: '#F59E0B', icon: 'Zap' },
                        { name: 'Biaya Marketing', type: 'Expense', color: '#8B5CF6', icon: 'Megaphone' },
                        { name: 'Pajak & Retribusi', type: 'Expense', color: '#6366F1', icon: 'FileText' },
                        { name: 'Transfer Kas/Bank', type: 'Transfer', color: '#6B7280', icon: 'Repeat' }
                    ];
                    _a = 0, categoriesData_1 = categoriesData;
                    _b.label = 26;
                case 26:
                    if (!(_a < categoriesData_1.length)) return [3 /*break*/, 30];
                    cat = categoriesData_1[_a];
                    return [4 /*yield*/, prisma.financeCategory.findFirst({ where: { company_id: company.id, name: cat.name } })];
                case 27:
                    exists = _b.sent();
                    if (!!exists) return [3 /*break*/, 29];
                    return [4 /*yield*/, prisma.financeCategory.create({
                            data: {
                                company_id: company.id,
                                name: cat.name,
                                type: cat.type,
                                color: cat.color,
                                icon: cat.icon,
                            }
                        })];
                case 28:
                    _b.sent();
                    _b.label = 29;
                case 29:
                    _a++;
                    return [3 /*break*/, 26];
                case 30:
                    console.log('Seeding finished.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
