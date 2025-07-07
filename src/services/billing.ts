import { api } from '@/utils/api';

export interface BillingItemOption {
  name: string;
  value: string;
  unit: number;
  billing_type: string;
  memo: string;
}

export interface BillingItem {
  name: string;
  billing_type: string;
  unit: number;
  qna: number;
  amount: number;
  manual?: boolean;
  checked: boolean;
}

export interface Billing {
  id: number;
  student_id: number;
  student_name: string;
  billing_date: string;
  due_date: string;
  total_amount: number;
  status: string;
  items: Array<{
    id: number;
    name: string;
    amount: number;
    description: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface BillingItemOptions {
  groupOptions: {
    japanese: BillingItemOption[];
    work: BillingItemOption[];
    arrival: BillingItemOption[];
    support: BillingItemOption[];
  };
  individualItems: BillingItem[];
}

export const billingService = {
  // 청구서 목록 조회
  // getBillings: async (filters?: BillingFilters) => {
  //   const response = await api.get<Billing[]>('/billings', { params: filters })
  //   return response.data
  // },

  // // 청구서 상세 조회
  // getBilling: async (id: number) => {
  //   const response = await api.get<Billing>(`/billings/${id}`)
  //   return response.data
  // },

  // // 청구서 생성
  // createBilling: async (billing: Omit<Billing, 'id' | 'created_at' | 'updated_at'>) => {
  //   const response = await api.post<Billing>('/billings', billing)
  //   return response.data
  // },

  // // 청구서 수정
  // updateBilling: async (id: number, billing: Partial<Billing>) => {
  //   const response = await api.put<Billing>(`/billings/${id}`, billing)
  //   return response.data
  // },

  // // 청구서 삭제
  // deleteBilling: async (id: number) => {
  //   await api.delete(`/billings/${id}`)
  // },

  getBillingItemOptions: async (): Promise<BillingItemOptions> => {
    const response = await api.get<BillingItemOptions>('/billing-options')
    return response.data
  },
} 
