export interface ReceiptItem {
  name: string
  quantity: number
  price: number
}

export interface Receipt {
  items: ReceiptItem[]
  tax: number
  total: number
}
