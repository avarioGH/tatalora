import { Injectable } from '@nestjs/common';

@Injectable()
export class TimberCalculationService {
  /**
   * Calculates the average diameter of a log.
   * Average Diameter = (D1 + D2 + D3 + D4) / 4
   */
  calculateAverageDiameter(
    d1: number,
    d2: number,
    d3: number,
    d4: number,
  ): number {
    return (d1 + d2 + d3 + d4) / 4;
  }

  /**
   * Calculates the rounded diameter of a log.
   * Rounded Diameter = ROUND(Average Diameter, 0)
   */
  calculateRoundedDiameter(averageDiameter: number): number {
    return Math.round(averageDiameter);
  }

  /**
   * Calculates the gross volume of a raw log in m3.
   * Gross Volume = ROUND((RoundedDiameter^2 * Length * 0.7854) / 10000, 2)
   */
  calculateRawLogGrossVolume(roundedDiameter: number, length: number): number {
    const volume = (Math.pow(roundedDiameter, 2) * length * 0.7854) / 10000;
    return Math.round(volume * 100) / 100;
  }

  /**
   * Calculates the hollow (gerowong) volume in m3.
   * Gerowong Volume = ROUND((GerowongDiameter^2 * (Length - TrimmingLength) * 0.7854) / 10000, 2)
   */
  calculateGerowongVolume(
    gerowongDiameter: number,
    length: number,
    trimmingLength: number = 0,
  ): number {
    const volume =
      (Math.pow(gerowongDiameter, 2) * (length - trimmingLength) * 0.7854) /
      10000;
    return Math.round(volume * 100) / 100;
  }

  /**
   * Calculates the trimming volume in m3.
   * Trimming Volume = ROUND((RoundedDiameter^2 * TrimmingLength * 0.7854) / 10000, 2)
   */
  calculateTrimmingVolume(
    roundedDiameter: number,
    trimmingLength: number,
  ): number {
    const volume =
      (Math.pow(roundedDiameter, 2) * trimmingLength * 0.7854) / 10000;
    return Math.round(volume * 100) / 100;
  }

  /**
   * Calculates the net volume for a Raw Log in m3.
   * Net Volume = GrossVolume - GerowongVolume - TrimmingVolume
   */
  calculateRawLogNetVolume(
    grossVolume: number,
    gerowongVolume: number = 0,
    trimmingVolume: number = 0,
  ): number {
    return (
      Math.round((grossVolume - gerowongVolume - trimmingVolume) * 1000000) /
      1000000
    ); // avoid floating point errors
  }

  /**
   * Calculates the net volume for an Input Log in m3.
   * Input Log Net Volume = GrossVolume - GerowongVolume
   */
  calculateInputLogNetVolume(
    grossVolume: number,
    gerowongVolume: number = 0,
  ): number {
    return Math.round((grossVolume - gerowongVolume) * 1000000) / 1000000;
  }

  /**
   * Calculates the volume for finished dimensional timber in m3.
   * Volume = (Thickness * Width * Length * Quantity) / 1,000,000,000
   * Thickness, Width, Length are in mm.
   */
  calculateTimberStockVolume(
    thickness: number,
    width: number,
    length: number,
    quantity: number,
  ): number {
    const volume = (thickness * width * length * quantity) / 1000000000;
    // We typically want to preserve 4-6 decimals for timber stock as per prompt, but exact JS division is fine
    return volume;
  }

  /**
   * Classify diameter into standard classes.
   */
  classifyDiameter(roundedDiameter: number): string {
    if (roundedDiameter < 40) return '30 - 39 Cm';
    if (roundedDiameter < 50) return '40 - 49 Cm';
    if (roundedDiameter < 60) return '50 - 59 Cm';
    if (roundedDiameter < 70) return '60 - 69 Cm';
    if (roundedDiameter < 80) return '70 - 79 Cm';
    if (roundedDiameter < 90) return '80 - 89 Cm';
    if (roundedDiameter < 100) return '90 - 99 Cm';
    return '100 Cm Up';
  }
}
