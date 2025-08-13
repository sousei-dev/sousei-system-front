import { api } from '@/utils/api'
import { s } from '@fullcalendar/core/internal-common'

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

export interface MonthlyItemSortOrderUpdate {
  student_id: string
  year: number
  items: {
    item_name: string
    sort_order: number
  }[]
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
  createStudentMonthlyItems: async (studentId: string, itemData: BillingMonthlyItemCreate, year?: number) => {
    const params = new URLSearchParams()
    if (year !== undefined) params.append('year', year.toString())
    
    return api.post(`/students/${studentId}/monthly-items?${params.toString()}`, itemData)
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
  updateMonthlyItemsSortOrder: async (payload: MonthlyItemSortOrderUpdate) => {
    return api.put('/monthly-items/sort-order', payload)
  },
  getCompanyInvoicePdfV2: async (companyId: string, year: number, month: number, memo: string, studentType: string) => {
    const params = new URLSearchParams()
    params.append('company_id', companyId)
    params.append('year', year.toString())
    params.append('month', month.toString())
    params.append('student_type', studentType)
    params.append('memo', memo)
    
    return api.post(`/billing-invoices/generate?${params.toString()}`, {}, { responseType: 'blob' })
  },
  getCompanyInvoiceExcel: async (year: number, month: number, companyId: string, studentType: string) => {
    const params = new URLSearchParams()
    params.append('company_id', companyId)
    params.append('year', year.toString())
    params.append('month', month.toString())
    params.append('student_type', studentType)
    
    return api.post(`/billing-invoices/generate/excel?${params.toString()}`, {}, { responseType: 'blob' })
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
