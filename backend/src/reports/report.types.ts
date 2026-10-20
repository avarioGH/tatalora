export interface ReportFilterDto {
  company_id: string;
  branch_id?: string;
  warehouse_id?: string;
  start_date?: string;
  end_date?: string;
  customer_id?: string;
  supplier_id?: string;
  employee_id?: string;
  salesperson_id?: string;
  product_id?: string;
  category_id?: string;
  account_id?: string;
  status?: string;
}

export interface ReportColumn {
  header: string;
  key: string;
  type?: 'text' | 'currency' | 'number' | 'date';
}

export interface ReportResultDto {
  title: string;
  columns: ReportColumn[];
  data: any[];
  totals?: Record<string, number>;
}
