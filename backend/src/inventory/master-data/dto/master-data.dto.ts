import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateTimberSpeciesDto {
  @IsOptional() @IsString() company_id?: string;
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTimberSpeciesDto extends CreateTimberSpeciesDto {}

export class CreateTimberGradeDto {
  @IsOptional() @IsString() company_id?: string;
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTimberGradeDto extends CreateTimberGradeDto {}

export class CreateTimberSourceDto {
  @IsOptional() @IsString() company_id?: string;
  @IsString() code: string;
  @IsString() name: string;
  @IsString() type: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateTimberSourceDto extends CreateTimberSourceDto {}

export class CreateLocationDto {
  @IsOptional() @IsString() company_id?: string;
  @IsString() warehouseId: string;
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateLocationDto extends CreateLocationDto {}

export class CreateVehicleDto {
  @IsOptional() @IsString() company_id?: string;
  @IsString() code: string;
  @IsString() plateNumber: string;
  @IsOptional() @IsString() name?: string;
  @IsString() vehicleType: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateVehicleDto extends CreateVehicleDto {}

export class CreateDriverDto {
  @IsOptional() @IsString() company_id?: string;
  @IsOptional() @IsString() code?: string;
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateDriverDto extends CreateDriverDto {}
