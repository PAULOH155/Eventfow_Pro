export type PaymentProviderName = 'mercado_pago'
export type PaymentProviderStatus = 'not_configured' | 'sandbox' | 'active'
export interface CreatePaymentRequest { orderId: string; amountInCents: number; description: string; returnUrl: string; webhookUrl: string }
export interface CreatePaymentResult { provider: PaymentProviderName; providerPaymentId: string; checkoutUrl: string; status: 'pending' }
/** Server-side contract. Never trust a browser redirect as proof of payment. */
export interface PaymentProviderAdapter { readonly name: PaymentProviderName; readonly status: PaymentProviderStatus; createPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult>; verifyWebhook(payload: string, signature: string | null): Promise<boolean> }
