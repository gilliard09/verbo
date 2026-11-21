// src/constants/checkout.ts
// URLs de checkout dos planos de assinatura do Verbo.
// Para trocar de plataforma: atualize apenas o .env.local e as variáveis no Vercel.

export const CHECKOUT_ESSENCIAL = import.meta.env.VITE_CHECKOUT_FUNDADOR ?? ''
// Alias legado para compatibilidade com módulos antigos.
export const CHECKOUT_FUNDADOR = CHECKOUT_ESSENCIAL
export const CHECKOUT_PLUS     = import.meta.env.VITE_CHECKOUT_PLUS     ?? ''