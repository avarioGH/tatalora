import { TimberCalculationService } from './timber-calculation.service';

describe('TimberCalculationService', () => {
  let service: TimberCalculationService;

  beforeEach(() => {
    service = new TimberCalculationService();
  });

  it('should calculate average diameter correctly', () => {
    // Example from prompt: 39, 43, 25, 32 => 34.75
    const avg = service.calculateAverageDiameter(39, 43, 25, 32);
    expect(avg).toBe(34.75);
  });

  it('should calculate rounded diameter correctly', () => {
    // Example from prompt: 34.75 => 35
    const rounded = service.calculateRoundedDiameter(34.75);
    expect(rounded).toBe(35);
  });

  it('should calculate raw log gross volume correctly', () => {
    // Example from prompt: Diameter = 35 cm, Length = 11 m
    // Gross = (35 * 35 * 11 * 0.7854) / 10000 = 1.0583265
    // Rounded to 2 decimals = 1.06
    const gross = service.calculateRawLogGrossVolume(35, 11);
    expect(gross).toBe(1.06);
  });

  it('should calculate timber dimensional stock volume correctly', () => {
    // Example from prompt: 20 x 30 x 1000 x 120
    // Volume = 0.072 M3
    const vol1 = service.calculateTimberStockVolume(20, 30, 1000, 120);
    expect(vol1).toBe(0.072);

    // Another example from prompt: 30 x 112 x 4100 x 15
    // Volume = 0.20664 M3
    const vol2 = service.calculateTimberStockVolume(30, 112, 4100, 15);
    expect(vol2).toBe(0.20664);
  });

  it('should pass regression test for zero-net volume rounding bug', () => {
    // Length 11, D1 39, D2 43, D3 25, D4 32, Gerowong 35, Trimming 1.5
    const avg = service.calculateAverageDiameter(39, 43, 25, 32);
    expect(avg).toBe(34.75);

    const rnd = service.calculateRoundedDiameter(avg);
    expect(rnd).toBe(35);

    const gross = service.calculateRawLogGrossVolume(rnd, 11);
    expect(gross).toBe(1.06);

    const gerowong = service.calculateGerowongVolume(35, 11, 1.5);
    expect(gerowong).toBe(0.91);

    const trimming = service.calculateTrimmingVolume(rnd, 1.5);
    expect(trimming).toBe(0.14);

    const net = service.calculateRawLogNetVolume(gross, gerowong, trimming);
    // 1.06 - 0.91 - 0.14 = 0.01
    expect(net).toBe(0.01);
  });

  it('should calculate squared diameter correctly for non-trivial rounding', () => {
    const avg = service.calculateAverageDiameter(41, 44, 38, 43);
    expect(avg).toBe(41.5);
    const rnd = service.calculateRoundedDiameter(avg);
    expect(rnd).toBe(42);
    const gross = service.calculateRawLogGrossVolume(rnd, 10);
    expect(gross).toBe(1.39);
  });
});
