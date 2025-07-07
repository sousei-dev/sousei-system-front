import { api } from '@/utils/api'

export interface Invoice {
  id: string | null
  student_id: string
  year: number
  month: number
  items: InvoiceItem[]
  payment_status: string
  is_data: boolean
}

export interface InvoiceItem {
  name: string
  unit_price: number
  quantity: number
  sort_order: number
  amount: number
  memo: string
  type: string
}

export interface InvoicePayload {
  student_id: string
  year: number
  month: number
  items: InvoiceItem[]
}

export interface UpdateInvoicePayload {
  invoice_id: string
  year: number
  month: number
  items: InvoiceItem[]
}

export interface CompanyInvoicePayload {
  company_id: string
  year: number
  month: number
}

export const invoiceService = {
  createInvoice: async (payload: InvoicePayload) => {
    return api.post('/invoices', payload)
  },
  getInvoicePdf: async (invoiceId: string) => {
    return api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
  },
  getCompanyInvoicePdf: async (companyId: string, year: number, month: number) => {
    return api.get(`/company-invoice-pdf/${companyId}/${year}/${month}`, { responseType: 'blob' })
  },
  getInvoices: async (student_id: string): Promise<Invoice[]> => {
    const response = await api.get<Invoice[]>(`/invoices?student_id=${student_id}`)
    return response.data
  },
  getInvoiceStudentYearMonth: async (studentId: string, year: number, month: number): Promise<Invoice[]> => {
    const response = await api.get<Invoice[]>(`/invoice/${studentId}/${year}/${month}`)
    return response.data
  },
  getInvoice: async (invoiceId: string): Promise<Invoice[]> => {
    const response = await api.get<Invoice[]>(`/invoice/${invoiceId}`)
    return response.data
  },
  updateInvoice: async (payload: UpdateInvoicePayload) => {
    return api.put('/invoice', payload)
  },
} 
