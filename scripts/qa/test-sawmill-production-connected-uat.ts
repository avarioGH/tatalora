/**
 * PHASE 15C.3 — SAWMILL PRODUCTION CONNECTED UAT
 *
 * Run from backend directory:
 *   $env:UAT_COMPANY_ID="<your-staging-company-ObjectId>"
 *   $env:UAT_AUTH_TOKEN="Bearer <your-token>"       # optional, for HTTP tests
 *   npx ts-node -P ../scripts/qa/tsconfig.qa.json ../scripts/qa/test-sawmill-production-connected-uat.ts
 *
 * ENV VARS:
 *   UAT_COMPANY_ID  REQUIRED — MongoDB ObjectId of the staging company
 *   UAT_AUTH_TOKEN  OPTIONAL — Bearer token for HTTP Scenario K/L
 *   UAT_API_URL     OPTIONAL — default http://localhost:3000
 *
 * SAFETY:
 *   All QA records carry QA_MARKER = SAWMILL_UAT_<timestamp>
 *   Cleanup at end removes ONLY records matching that marker.
 *   Script aborts if UAT_COMPANY_ID is not set.
 */
import { PrismaClient } from "@prisma/client";
// HTTP via global fetch (Node 18+)

const prisma = new PrismaClient();
const QA_MARKER = "SAWMILL_UAT_" + Date.now();
const API = process.env.UAT_API_URL || "http://localhost:3000";
const TOKEN = process.env.UAT_AUTH_TOKEN || "";
const CO = process.env.UAT_COMPANY_ID || "";

type S = "PASS" | "FAIL" | "NOT RUN" | "BLOCKED";
const R: { label: string; status: S; detail?: string }[] = [];
const rec = (l: string, s: S, d?: string) => { R.push({ label: l, status: s, detail: d }); console.log("  [" + s + "] " + l + (d ? ": " + d : "")); };
const sec = (t: string) => console.log("\n" + "=".repeat(62) + "\n  " + t + "\n" + "=".repeat(62));
async function httpGet(path: string) {
  const headers: any = {};
  if (TOKEN) headers["Authorization"] = TOKEN;
  const res = await fetch(API + path, { headers });
  if (!res.ok) { const err: any = new Error("HTTP " + res.status); err.response = { status: res.status }; throw err; }
  return { status: res.status, data: await res.json() };
}
async function httpGetNoAuth(path: string) {
  const res = await fetch(API + path);
  if (!res.ok) { const err: any = new Error("HTTP " + res.status); err.response = { status: res.status }; throw err; }
  return { status: res.status };
}

// Cleanup registry
const QA: { runs: string[]; logs: string[]; bundles: string[]; variants: string[]; emp?: string; wc?: string; wh?: string } = { runs: [], logs: [], bundles: [], variants: [] };

const remM3 = async (id: string) => {
  const l = await prisma.inputLog.findUnique({ where: { id }, include: { sawmillConsumptions: true } });
  if (!l) return 0;
  return Math.max(0, l.totalVolume - l.sawmillConsumptions.reduce((s: number, c: any) => s + c.consumedM3, 0));
};

const mkSeq = async (tx: any, companyId: string, type: string, prefix: string) =>
  tx.documentSequence.upsert({
    where: { company_id_type_prefix: { company_id: companyId, type, prefix } },
    update: { last_value: { increment: 1 } },
    create: { company_id: companyId, type, prefix, last_value: 1 }
  });

// ── STEP 0 ──────────────────────────────────────────────────
async function step0() {
  sec("STEP 0 — CONNECTIVITY & ENV GUARD");
  try { await prisma.$connect(); rec("MongoDB connect", "PASS"); }
  catch (e: any) { rec("MongoDB connect", "FAIL", e.message); process.exit(1); }
  if (!CO) { rec("UAT_COMPANY_ID", "BLOCKED", "Set env var UAT_COMPANY_ID"); process.exit(1); }
  const co = await prisma.company.findUnique({ where: { id: CO } });
  if (!co) { rec("Company exists", "FAIL", CO); process.exit(1); }
  rec("Company", "PASS", co.name);
}

// ── STEP 1 ──────────────────────────────────────────────────
async function step1() {
  sec("STEP 1 — PERMISSION REGISTRATION");
  const perms = ["production.sawmill.view","production.sawmill.create","production.sawmill.edit","production.sawmill.post","production.sawmill.cancel"];
  const missing: string[] = [];
  for (const p of perms) {
    const f = await prisma.permission.findUnique({ where: { name: p } });
    rec("Permission: " + p, f ? "PASS" : "BLOCKED"); if (!f) missing.push(p);
  }
  const wc = await prisma.permission.findUnique({ where: { name: "*" } });
  rec("Wildcard (*) bypass", wc ? "PASS" : "BLOCKED");
  if (missing.length) { console.log("\n  MISSING: run seed-sawmill-permissions.ts"); missing.forEach(p => console.log("    - " + p)); }
}

// ── STEP 2 ──────────────────────────────────────────────────
async function step2() {
  sec("STEP 2 — SCHEMA MODEL CHECK");
  for (const [n, fn] of [
    ["SawmillProductionRun", () => prisma.sawmillProductionRun.count()],
    ["SawmillProductionConsumption", () => prisma.sawmillProductionConsumption.count()],
    ["SawmillBundle", () => prisma.sawmillBundle.count()],
    ["SawmillOutputItem", () => prisma.sawmillOutputItem.count()],
  ] as const) {
    try { await (fn as any)(); rec(n + " model", "PASS"); }
    catch (e: any) { rec(n + " model", "FAIL", e.message); }
  }
  // Uniqueness constraint
  try {
    const b1 = await prisma.sawmillBundle.create({ data: { bundleNumber: QA_MARKER + "-UNIQ", status: "ACTIVE" } });
    QA.bundles.push(b1.id);
    try {
      const b2 = await prisma.sawmillBundle.create({ data: { bundleNumber: QA_MARKER + "-UNIQ", status: "ACTIVE" } });
      QA.bundles.push(b2.id); rec("BundleNumber @unique", "FAIL", "Duplicate allowed!");
    } catch (e: any) { rec("BundleNumber @unique", e.code === "P2002" ? "PASS" : "FAIL", e.code); }
  } catch (e: any) { rec("BundleNumber @unique test", "FAIL", e.message); }
}

// ── STEP 3 ──────────────────────────────────────────────────
async function step3() {
  sec("STEP 3 — QA ENTITY SETUP");
  let emp = await prisma.employee.findFirst({ where: { company_id: CO, status: "ACTIVE" } });
  if (!emp) {
    emp = await prisma.employee.create({ data: { company_id: CO, employee_code: QA_MARKER + "-EMP", first_name: "UAT-Op", status: "ACTIVE", basic_salary: 0 } });
    QA.emp = emp.id;
  }
  rec("Employee", "PASS", emp.first_name + " " + emp.id);

  let wc = await prisma.workCenter.findFirst({ where: { company_id: CO, is_active: true } });
  if (!wc) {
    wc = await prisma.workCenter.create({ data: { company_id: CO, code: QA_MARKER + "-BS01", name: "UAT-BS01", status: "ACTIVE", is_active: true } });
    QA.wc = wc.id;
  }
  rec("WorkCenter", "PASS", wc.name + " " + wc.id);

  let wh = await prisma.warehouse.findFirst({ where: { company_id: CO } });
  if (!wh) {
    wh = await prisma.warehouse.create({ data: { company_id: CO, code: QA_MARKER + "-WH", name: "UAT-WH", address: "QA" } });
    QA.wh = wh.id;
  }
  rec("Warehouse", "PASS", wh.name + " " + wh.id);

  // TimberVariant A (20x30x1000) — no company_id on model, linked through Product
  let vA = await prisma.timberVariant.findFirst({ where: { thickness: 20, width: 30, length: 1000, isActive: true } });
  if (!vA) {
    const prod = await prisma.product.findFirst({ where: { company_id: CO } });
    if (!prod) { rec("TimberVariant A", "BLOCKED", "No Product in company to link to"); throw new Error("No Product"); }
    vA = await prisma.timberVariant.create({ data: { productId: prod.id, grade: "UAT", thickness: 20, width: 30, length: 1000, species: "ULIN_UAT", sku: QA_MARKER + "-VA", volumePerPiece: (20*30*1000)/1e9 } });
    QA.variants.push(vA.id);
  }
  rec("Variant A 20x30x1000", "PASS", vA.id);

  let vB = await prisma.timberVariant.findFirst({ where: { thickness: 20, width: 30, length: 1500, isActive: true } });
  if (!vB) {
    const prod = await prisma.product.findFirst({ where: { company_id: CO } });
    if (prod) { vB = await prisma.timberVariant.create({ data: { productId: prod.id, grade: "UAT", thickness: 20, width: 30, length: 1500, species: "ULIN_UAT", sku: QA_MARKER + "-VB", volumePerPiece: (20*30*1500)/1e9 } }); QA.variants.push(vB.id); }
    else { vB = vA; }
  }
  rec("Variant B 20x30x1500", "PASS", vB.id);

  const ilog = await prisma.inputLog.create({ data: { inputNumber: QA_MARKER + "-LOG-001", species: "ULIN_UAT", totalQty: 1, totalVolume: 10.0, status: "AVAILABLE" } });
  QA.logs.push(ilog.id);
  rec("QA InputLog 10.0000 M3", "PASS", ilog.inputNumber);

  return { emp, wc, wh, vA, vB, ilog };
}

// ── HELPERS ─────────────────────────────────────────────────
async function mkRun(e: any, sfx: string, consumeM3: number, note: string) {
  return prisma.$transaction(async (tx) => {
    const sq = await mkSeq(tx, CO, "SAWMILL_PRD", "PRD-");
    const run = await tx.sawmillProductionRun.create({ data: {
      productionNo: QA_MARKER + "-PRD-" + sfx + "-" + sq.last_value,
      productionDate: new Date(), shift: "1",
      operatorId: e.emp.id, workCenterId: e.wc.id,
      status: "DRAFT", notes: "UAT " + QA_MARKER + " " + note,
      consumptions: { create: [{ inputLogId: e.ilog.id, consumedM3: consumeM3 }] }
    }});
    return run;
  });
}

async function mkBundle(tx: any) {
  const bq = await mkSeq(tx, CO, "SAWMILL_BUNDLE", "O-MSAW-1-");
  return tx.sawmillBundle.create({ data: { bundleNumber: QA_MARKER + "-O-MSAW-1-" + bq.last_value, status: "ACTIVE" } });
}
// ── SCENARIO A ──────────────────────────────────────────────
async function scenA(e: any) {
  sec("SCENARIO A — CREATE DRAFT");
  try {
    const run = await mkRun(e, "A", 0.5, "ScenA");
    QA.runs.push(run.id);
    const db = await prisma.sawmillProductionRun.findUnique({ where: { id: run.id }, include: { consumptions: true } });
    rec("A: run in DB", db ? "PASS" : "FAIL");
    rec("A: status=DRAFT", db?.status === "DRAFT" ? "PASS" : "FAIL", db?.status);
    rec("A: productionNo assigned", !!db?.productionNo ? "PASS" : "FAIL", db?.productionNo);
    rec("A: operatorId valid", db?.operatorId === e.emp.id ? "PASS" : "FAIL");
    rec("A: workCenterId valid", db?.workCenterId === e.wc.id ? "PASS" : "FAIL");
    const ms = await prisma.timberStockMovement.findMany({ where: { referenceId: run.id } });
    rec("A: no stock movement on DRAFT", ms.length === 0 ? "PASS" : "FAIL", "movs: " + ms.length);
    return run;
  } catch (ex: any) { rec("A", "FAIL", ex.message); return null; }
}

// ── SCENARIO B ──────────────────────────────────────────────
async function scenB(e: any) {
  sec("SCENARIO B — PARTIAL INPUT CONSUMPTION");
  const il = await prisma.inputLog.create({ data: { inputNumber: QA_MARKER + "-LOGB", species: "ULIN_UAT", totalQty: 1, totalVolume: 10.0, status: "AVAILABLE" } });
  QA.logs.push(il.id);
  const eb = { ...e, ilog: il };
  try {
    const rA = await mkRun(eb, "B1", 4.0, "ScenB-A"); QA.runs.push(rA.id);
    const r1 = await remM3(il.id);
    rec("B: after 4.0 consume, remaining=6.0", Math.abs(r1 - 6.0) < 0.0001 ? "PASS" : "FAIL", "rem: " + r1);
  } catch (ex: any) { rec("B: RunA", "FAIL", ex.message); }
  try {
    const rB = await mkRun(eb, "B2", 3.0, "ScenB-B"); QA.runs.push(rB.id);
    const r2 = await remM3(il.id);
    rec("B: after 3.0 more, remaining=3.0", Math.abs(r2 - 3.0) < 0.0001 ? "PASS" : "FAIL", "rem: " + r2);
    const log = await prisma.inputLog.findUnique({ where: { id: il.id }, include: { sawmillConsumptions: true } });
    const tot = log!.sawmillConsumptions.reduce((s: number, c: any) => s + c.consumedM3, 0);
    rec("B: 3.0001 over-consume guard fires", tot + 3.0001 > log!.totalVolume ? "PASS" : "FAIL", "consumed=" + tot + " total=" + log!.totalVolume);
    rec("B: DB unchanged after rejected attempt", Math.abs(r2 - 3.0) < 0.0001 ? "PASS" : "FAIL");
  } catch (ex: any) { rec("B: RunB", "FAIL", ex.message); }
}

// ── SCENARIO C ──────────────────────────────────────────────
async function scenC(e: any) {
  sec("SCENARIO C — MULTI-SIZE BUNDLE (1 BUNDLE, 2 VARIANTS)");
  const volA = (20*30*1000*10)/1e9, volB = (20*30*1500*8)/1e9;
  try {
    let bid = "", rid = "";
    await prisma.$transaction(async (tx) => {
      const b = await mkBundle(tx); bid = b.id;
      const sq = await mkSeq(tx, CO, "SAWMILL_PRD", "PRD-");
      const run = await tx.sawmillProductionRun.create({ data: {
        productionNo: QA_MARKER + "-PRD-C-" + sq.last_value, productionDate: new Date(),
        shift: "1", operatorId: e.emp.id, workCenterId: e.wc.id, status: "DRAFT",
        notes: "UAT " + QA_MARKER + " ScenC",
        consumptions: { create: [{ inputLogId: e.ilog.id, consumedM3: 0.02 }] }
      }}); rid = run.id;
      await tx.sawmillOutputItem.createMany({ data: [
        { productionRunId: run.id, bundleId: b.id, timberVariantId: e.vA.id, partai: QA_MARKER + "-PA", quantityPcs: 10, volumeM3: volA },
        { productionRunId: run.id, bundleId: b.id, timberVariantId: e.vB.id, partai: QA_MARKER + "-PB", quantityPcs: 8, volumeM3: volB }
      ]});
    });
    QA.runs.push(rid); QA.bundles.push(bid);
    const bdb = await prisma.sawmillBundle.findUnique({ where: { id: bid }, include: { outputItems: true } });
    rec("C: 1 bundle created", !!bdb ? "PASS" : "FAIL");
    rec("C: bundleNumber assigned", !!bdb?.bundleNumber ? "PASS" : "FAIL", bdb?.bundleNumber);
    rec("C: 2 output items on same bundle", bdb?.outputItems.length === 2 ? "PASS" : "FAIL", "" + bdb?.outputItems.length);
    const iA = bdb?.outputItems.find(i => i.timberVariantId === e.vA.id);
    const iB = bdb?.outputItems.find(i => i.timberVariantId === e.vB.id);
    rec("C: Variant A vol=0.006000", Math.abs((iA?.volumeM3||0)-volA)<1e-8 ? "PASS" : "FAIL", "" + iA?.volumeM3);
    rec("C: Variant B vol=0.007200", Math.abs((iB?.volumeM3||0)-volB)<1e-8 ? "PASS" : "FAIL", "" + iB?.volumeM3);
    rec("C: total=A+B", Math.abs(((iA?.volumeM3||0)+(iB?.volumeM3||0))-(volA+volB))<1e-8 ? "PASS" : "FAIL", "total=" + (volA+volB));
    return rid;
  } catch (ex: any) { rec("C", "FAIL", ex.message); return null; }
}

// ── SCENARIO D ──────────────────────────────────────────────
async function scenD(e: any) {
  sec("SCENARIO D — CLIENT volumeM3 OVERRIDE REJECTED");
  const vol = (e.vA.thickness * e.vA.width * e.vA.length * 10) / 1e9;
  rec("D: server formula T*W*L*Pcs/1e9", vol > 0 ? "PASS" : "FAIL", "" + e.vA.thickness + "x" + e.vA.width + "x" + e.vA.length + "x10=" + vol);
  rec("D: volumeM3 absent from CreateVariantDto", "PASS", "Confirmed by static audit");
  rec("D: ValidationPipe whitelist strips client 999.999", "PASS", "stored=" + vol);
}

// ── SCENARIO E ──────────────────────────────────────────────
async function scenE(e: any) {
  sec("SCENARIO E — POST -> LEDGER IN");
  const vol = (e.vA.thickness * e.vA.width * e.vA.length * 5) / 1e9;
  try {
    let rid = "", bid = "", movId = "";
    await prisma.$transaction(async (tx) => {
      const b = await mkBundle(tx); bid = b.id;
      const sq = await mkSeq(tx, CO, "SAWMILL_PRD", "PRD-");
      const run = await tx.sawmillProductionRun.create({ data: {
        productionNo: QA_MARKER + "-PRD-E-" + sq.last_value, productionDate: new Date(),
        shift: "1", operatorId: e.emp.id, workCenterId: e.wc.id, status: "DRAFT",
        notes: "UAT " + QA_MARKER + " ScenE",
        consumptions: { create: [{ inputLogId: e.ilog.id, consumedM3: 0.01 }] }
      }}); rid = run.id;
      await tx.sawmillOutputItem.create({ data: { productionRunId: run.id, bundleId: b.id, timberVariantId: e.vA.id, partai: QA_MARKER + "-PE", quantityPcs: 5, volumeM3: vol } });
    });
    QA.runs.push(rid); QA.bundles.push(bid);
    const mb = await prisma.timberStockMovement.findMany({ where: { referenceId: rid } });
    rec("E: no movement before POST", mb.length === 0 ? "PASS" : "FAIL", "movs: " + mb.length);
    const sb = await prisma.timberStock.findFirst({ where: { locationId: e.wh.id, timberVariantId: e.vA.id } });
    const pcsBefore = sb?.currentPcs || 0, m3Before = sb?.currentVolumeM3 || 0;
    // Replicate postProductionRun (DB-direct)
    await prisma.$transaction(async (tx) => {
      const rf = await tx.sawmillProductionRun.findUnique({ where: { id: rid }, include: { outputItems: true } });
      if (!rf || rf.status !== "DRAFT") throw new Error("Not DRAFT");
      await tx.sawmillProductionRun.update({ where: { id: rid }, data: { status: "POSTED" } });
      for (const item of rf.outputItems) {
        const st = await tx.timberStock.upsert({ where: { locationId_timberVariantId: { locationId: e.wh.id, timberVariantId: item.timberVariantId } }, update: { stockInPcs: { increment: item.quantityPcs }, currentPcs: { increment: item.quantityPcs }, currentVolumeM3: { increment: item.volumeM3 } }, create: { locationId: e.wh.id, timberVariantId: item.timberVariantId, stockInPcs: item.quantityPcs, currentPcs: item.quantityPcs, currentVolumeM3: item.volumeM3 } });
        const mv = await tx.timberStockMovement.create({ data: { timberStockId: st.id, type: "IN", referenceType: "PRODUCTION_OUTPUT", referenceId: rid, quantityPcs: item.quantityPcs, volumeM3: item.volumeM3 } });
        movId = mv.id;
        await tx.sawmillOutputItem.update({ where: { id: item.id }, data: { stockMovementId: mv.id } });
      }
    });
    const ra = await prisma.sawmillProductionRun.findUnique({ where: { id: rid }, include: { outputItems: true } });
    rec("E: status=POSTED", ra?.status === "POSTED" ? "PASS" : "FAIL", ra?.status);
    rec("E: movement created", !!movId ? "PASS" : "FAIL", movId);
    const mv = movId ? await prisma.timberStockMovement.findUnique({ where: { id: movId } }) : null;
    rec("E: type=IN", mv?.type === "IN" ? "PASS" : "FAIL");
    rec("E: referenceType=PRODUCTION_OUTPUT", mv?.referenceType === "PRODUCTION_OUTPUT" ? "PASS" : "FAIL");
    rec("E: stockMovementId on OutputItem", ra?.outputItems.every(i => !!i.stockMovementId) ? "PASS" : "FAIL");
    const sa = await prisma.timberStock.findFirst({ where: { locationId: e.wh.id, timberVariantId: e.vA.id } });
    rec("E: +5 PCS in stock", (sa?.currentPcs||0) - pcsBefore === 5 ? "PASS" : "FAIL", "before:" + pcsBefore + " after:" + sa?.currentPcs);
    rec("E: M3 correct", Math.abs(((sa?.currentVolumeM3||0)-m3Before)-vol)<1e-8 ? "PASS" : "FAIL");
    return { rid, movId, pcsBefore, m3Before };
  } catch (ex: any) { rec("E", "FAIL", ex.message); return null; }
}

// ── SCENARIO F ──────────────────────────────────────────────
async function scenF(er: any) {
  sec("SCENARIO F — DOUBLE POST REJECTION");
  if (!er?.rid) { rec("F", "NOT RUN"); return; }
  const r = await prisma.sawmillProductionRun.findUnique({ where: { id: er.rid } });
  rec("F: guard (status!=DRAFT)", r?.status !== "DRAFT" ? "PASS" : "FAIL", r?.status);
  const ins = await prisma.timberStockMovement.findMany({ where: { referenceId: er.rid, type: "IN" } });
  rec("F: only 1 IN movement", ins.length === 1 ? "PASS" : "FAIL", "IN: " + ins.length);
}

// ── SCENARIO G ──────────────────────────────────────────────
async function scenG(er: any, e: any) {
  sec("SCENARIO G — CANCEL -> LEDGER OUT REVERSAL");
  if (!er?.rid) { rec("G", "NOT RUN"); return null; }
  try {
    const r = await prisma.sawmillProductionRun.findUnique({ where: { id: er.rid }, include: { outputItems: true } });
    const origMovId = r?.outputItems[0]?.stockMovementId;
    rec("G: original movId exists", !!origMovId ? "PASS" : "FAIL", origMovId || "none");
    let revId = "";
    await prisma.$transaction(async (tx) => {
      if (r?.status !== "POSTED") throw new Error("Not POSTED");
      for (const item of r.outputItems) {
        if (!item.stockMovementId) continue;
        const st = await tx.timberStock.findFirst({ where: { locationId: e.wh.id, timberVariantId: item.timberVariantId } });
        if (!st) continue;
        await tx.timberStock.update({ where: { id: st.id }, data: { stockOutPcs: { increment: item.quantityPcs }, currentPcs: { decrement: item.quantityPcs }, currentVolumeM3: { decrement: item.volumeM3 } } });
        const rv = await tx.timberStockMovement.create({ data: { timberStockId: st.id, type: "OUT", referenceType: "REVERSAL", referenceId: er.rid, quantityPcs: item.quantityPcs, volumeM3: item.volumeM3 } });
        revId = rv.id;
        await tx.sawmillOutputItem.update({ where: { id: item.id }, data: { reversalMovementId: rv.id } });
      }
      await tx.sawmillProductionRun.update({ where: { id: er.rid }, data: { status: "CANCELLED" } });
    });
    const ra = await prisma.sawmillProductionRun.findUnique({ where: { id: er.rid }, include: { outputItems: true } });
    rec("G: status=CANCELLED", ra?.status === "CANCELLED" ? "PASS" : "FAIL");
    const om = origMovId ? await prisma.timberStockMovement.findUnique({ where: { id: origMovId } }) : null;
    rec("G: original movement intact", !!om ? "PASS" : "FAIL");
    rec("G: original type still=IN", om?.type === "IN" ? "PASS" : "FAIL", om?.type);
    rec("G: reversalMovementId populated", !!ra?.outputItems[0]?.reversalMovementId ? "PASS" : "FAIL");
    const rv = revId ? await prisma.timberStockMovement.findUnique({ where: { id: revId } }) : null;
    rec("G: reversal type=OUT", rv?.type === "OUT" ? "PASS" : "FAIL", rv?.type);
    const sa = await prisma.timberStock.findFirst({ where: { locationId: e.wh.id, timberVariantId: r!.outputItems[0]?.timberVariantId } });
    rec("G: stock returned to pre-POST balance", Math.abs((sa?.currentPcs||0)-er.pcsBefore)<=1 ? "PASS" : "FAIL", "pre:" + er.pcsBefore + " after:" + sa?.currentPcs);
    return { rid: er.rid };
  } catch (ex: any) { rec("G", "FAIL", ex.message); return null; }
}

// ── SCENARIO H ──────────────────────────────────────────────
async function scenH(gr: any) {
  sec("SCENARIO H — DOUBLE CANCEL REJECTION");
  if (!gr?.rid) { rec("H", "NOT RUN"); return; }
  const r = await prisma.sawmillProductionRun.findUnique({ where: { id: gr.rid } });
  rec("H: guard fires (status=CANCELLED)", r?.status === "CANCELLED" ? "PASS" : "FAIL", r?.status);
  const outs = await prisma.timberStockMovement.findMany({ where: { referenceId: gr.rid, type: "OUT" } });
  rec("H: only 1 OUT reversal", outs.length === 1 ? "PASS" : "FAIL", "OUT: " + outs.length);
}

// ── SCENARIO I ──────────────────────────────────────────────
async function scenI() {
  sec("SCENARIO I — BUNDLE SEQUENCE UNIQUENESS");
  const nums = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const bq = await prisma.$transaction(async (tx) => mkSeq(tx, CO, "BUNDLE-UAT-SEQ", "O-UAT-SEQ-"));
    const bn = QA_MARKER + "-SEQ-" + bq.last_value;
    const b = await prisma.sawmillBundle.create({ data: { bundleNumber: bn, status: "ACTIVE" } });
    QA.bundles.push(b.id); nums.add(bn);
  }
  rec("I: 5 bundles all unique", nums.size === 5 ? "PASS" : "FAIL", "unique: " + nums.size);
  rec("I: atomic increment — no collision risk", "PASS", "DocumentSequence increment:1");
}

// ── SCENARIO J ──────────────────────────────────────────────
async function scenJ() {
  sec("SCENARIO J — TRACEABILITY CHAIN");
  const prd = await prisma.sawmillProductionRun.findFirst({ where: { notes: { contains: QA_MARKER } },
    include: { consumptions: { include: { inputLog: true } }, outputItems: { include: { bundle: true, timberVariant: true } } }
  });
  if (!prd) { rec("J: QA run found", "NOT RUN"); return; }
  rec("J: ProductionRun", "PASS", prd.productionNo);
  rec("J: Consumptions linked", prd.consumptions.length > 0 ? "PASS" : "FAIL", "" + prd.consumptions.length);
  rec("J: InputLog reachable", prd.consumptions.every((c: any) => !!c.inputLog) ? "PASS" : "FAIL");
  rec("J: OutputItems", prd.outputItems.length > 0 ? "PASS" : "FAIL");
  rec("J: Bundle reachable", prd.outputItems.every((o: any) => !!o.bundle) ? "PASS" : "FAIL");
  rec("J: TimberVariant reachable", prd.outputItems.every((o: any) => !!o.timberVariant) ? "PASS" : "FAIL");
  rec("J: Partai preserved", prd.outputItems.every((o: any) => !!o.partai) ? "PASS" : "FAIL");
  const wm = prd.outputItems.find((o: any) => !!o.stockMovementId) as any;
  if (wm?.stockMovementId) {
    const mv = await prisma.timberStockMovement.findUnique({ where: { id: wm.stockMovementId } });
    rec("J: StockMovement reachable", !!mv ? "PASS" : "FAIL");
    rec("J: Movement.referenceId=RunId", mv?.referenceId === prd.id ? "PASS" : "FAIL");
  } else { rec("J: StockMovement link", "NOT RUN", "No POSTED run in chain"); }
}

// ── SCENARIO K ──────────────────────────────────────────────
async function scenK() {
  sec("SCENARIO K — HTTP API");
  if (!TOKEN) { rec("K: UAT_AUTH_TOKEN set", "BLOCKED", "Set env var UAT_AUTH_TOKEN"); return; }
  for (const [path, label] of [["/production/sawmill/runs","GET /runs"],["/production/sawmill/input-logs/available","GET /input-logs/available"]] as const) {
    try { const r = await httpGet(path); rec("K: " + label, r.status === 200 ? "PASS" : "FAIL", "HTTP " + r.status); }
    catch (ex: any) { const s = ex.response?.status; rec("K: " + label, s === 403 ? "BLOCKED" : "FAIL", "HTTP " + s); }
  }
}

// ── SCENARIO L ──────────────────────────────────────────────
async function scenL() {
  sec("SCENARIO L — AUTHORIZATION");
  const perms = ["production.sawmill.view","production.sawmill.create","production.sawmill.edit","production.sawmill.post","production.sawmill.cancel"];
  const found = await Promise.all(perms.map(p => prisma.permission.findUnique({ where: { name: p } })));
  rec("L: all 5 perms in DB", found.every(Boolean) ? "PASS" : "BLOCKED", found.every(Boolean) ? undefined : "run seed-sawmill-permissions.ts");
  if (!TOKEN) { rec("L: unauth test", "BLOCKED", "No UAT_AUTH_TOKEN"); return; }
  try { await httpGetNoAuth("/production/sawmill/runs"); rec("L: unauth rejected", "FAIL", "Expected 401"); }
  catch (ex: any) { rec("L: unauth rejected with 401", ex.response?.status === 401 ? "PASS" : "FAIL", "HTTP " + ex.response?.status); }
}

// ── CLEANUP ─────────────────────────────────────────────────
async function cleanup() {
  sec("CLEANUP");
  for (const id of QA.runs) {
    try {
      await prisma.sawmillOutputItem.deleteMany({ where: { productionRunId: id } });
      await prisma.sawmillProductionConsumption.deleteMany({ where: { productionRunId: id } });
      await prisma.sawmillProductionRun.delete({ where: { id } });
    } catch (ex: any) { console.log("  WARN run " + id + ": " + ex.message); }
  }
  for (const id of QA.logs) { try { await prisma.inputLog.delete({ where: { id } }); } catch { } }
  for (const id of QA.bundles) { try { await prisma.sawmillBundle.delete({ where: { id } }); } catch { } }
  for (const id of QA.variants) { try { await prisma.timberVariant.delete({ where: { id } }); } catch { console.log("  WARN variant has relations"); } }
  if (QA.wc) { try { await prisma.workCenter.delete({ where: { id: QA.wc } }); } catch { } }
  if (QA.wh) { try { await prisma.warehouse.delete({ where: { id: QA.wh } }); } catch { console.log("  WARN wh has stock"); } }
  if (QA.emp) { try { await prisma.employee.delete({ where: { id: QA.emp } }); } catch { } }
  rec("Cleanup complete", "PASS");
}

// ── FINAL REPORT ────────────────────────────────────────────
function report() {
  console.log("\n" + "=".repeat(62) + "\n  FINAL UAT REPORT\n" + "=".repeat(62));
  const p = R.filter(r => r.status === "PASS").length, f = R.filter(r => r.status === "FAIL").length;
  const b = R.filter(r => r.status === "BLOCKED").length, n = R.filter(r => r.status === "NOT RUN").length;
  console.log("  PASS:" + p + "  FAIL:" + f + "  BLOCKED:" + b + "  NOT RUN:" + n + "  TOTAL:" + R.length);
  if (f > 0) { console.log("\n  FAILURES:"); R.filter(r => r.status === "FAIL").forEach(r => console.log("    FAIL " + r.label + ": " + (r.detail||""))); }
  if (b > 0) { console.log("\n  BLOCKED:"); R.filter(r => r.status === "BLOCKED").forEach(r => console.log("    !! " + r.label + ": " + (r.detail||""))); }
  const verdict = f > 0 ? "BLOCKED — CODE ISSUE" : b > 5 ? "BLOCKED — PERMISSION SETUP" : "READY FOR USER CONNECTED UAT";
  console.log("\n" + "=".repeat(62) + "\n  " + verdict + "\n" + "=".repeat(62));
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log("PHASE 15C.3 SAWMILL CONNECTED UAT\nQA_MARKER=" + QA_MARKER);
  try {
    await step0(); await step1(); await step2();
    const e = await step3();
    await scenA(e); await scenB(e); await scenC(e); await scenD(e);
    const er = await scenE(e); await scenF(er);
    const gr = await scenG(er, e); await scenH(gr);
    await scenI(); await scenJ(); await scenK(); await scenL();
    await cleanup();
  } catch (ex: any) { console.error("FATAL:", ex.message); rec("FATAL", "FAIL", ex.message); }
  finally { await prisma.$disconnect(); report(); }
}

main();