export { CustomerService } from './customer.service';
export { CompanyInfoService } from './company-info.service';
export { BankAccountService } from './bank-account.service';
export { InvoiceService } from './invoice.service';

// サービスのシングルトンインスタンスを提供
import { CustomerService } from './customer.service';
import { CompanyInfoService } from './company-info.service';
import { BankAccountService } from './bank-account.service';
import { InvoiceService } from './invoice.service';

export const customerService = new CustomerService();
export const companyInfoService = new CompanyInfoService();
export const bankAccountService = new BankAccountService();
export const invoiceService = new InvoiceService();