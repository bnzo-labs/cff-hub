// Shopify Order Types (subset — fields used by CFF hub)

export interface ShopifyOrder {
  id: number
  order_number: number
  created_at: string
  updated_at: string
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status: 'fulfilled' | 'partial' | 'unfulfilled' | null
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  customer: ShopifyCustomer | null
  line_items: ShopifyLineItem[]
  shipping_lines: ShopifyShippingLine[]
  note: string | null
  tags: string
  shipping_address: ShopifyAddress | null
  billing_address: ShopifyAddress | null
}

export interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  orders_count: number
  total_spent: string
  created_at: string
}

export interface ShopifyLineItem {
  id: number
  title: string
  variant_title: string | null
  quantity: number
  price: string
  sku: string | null
  product_id: number
  variant_id: number
  properties: { name: string; value: string }[]
}

export interface ShopifyShippingLine {
  title: string
  price: string
  code: string | null
}

export interface ShopifyAddress {
  first_name: string
  last_name: string
  address1: string
  address2: string | null
  city: string
  province: string
  zip: string
  country: string
  phone: string | null
}
