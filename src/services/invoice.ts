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

export interface BillingMonthlyItemCreate {
  student_id: string
  item_name: string
  memo?: string
}

export interface BillingMonthlyItemUpdate {
  amount?: number
  memo?: string
}

export interface BillingMonthlyItem {
  id: string
  student_id: string
  item_name: string
  memo?: string
  year: number
  month: number
  sort_order: number
}

export interface GetStudentMonthlyItemsResponse {
  student_id: string
  student_name: string
  items: BillingMonthlyItem[]
}

export const invoiceService = {
  createInvoice: async (payload: InvoicePayload) => {
    return api.post('/invoices', payload)
  },
  createStudentMonthlyItems: async (studentId: string, itemData: BillingMonthlyItemCreate) => {
    return api.post(`/students/${studentId}/monthly-items`, itemData)
  },
  updateMonthlyItem: async (itemId: string, itemData: BillingMonthlyItemUpdate) => {
    return api.put(`/monthly-items/${itemId}`, itemData)
  },
  deleteMonthlyItem: async (studentId: string, itemId: string) => {
    return api.delete(`/students/${studentId}/monthly-items/${itemId}`)
  },
  getStudentMonthlyItems: async (studentId: string, year?: number, month?: number): Promise<GetStudentMonthlyItemsResponse> => {
    const params = new URLSearchParams()
    if (year !== undefined) params.append('year', year.toString())
    if (month !== undefined) params.append('month', month.toString())
    
    const response = await api.get<GetStudentMonthlyItemsResponse>(`/students/${studentId}/monthly-items?${params.toString()}`)
    return response.data
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
