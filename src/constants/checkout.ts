// src/constants/checkout.ts
// URLs de checkout dos planos de assinatura do Verbo.
// Para trocar de plataforma: atualize apenas o .env.local e as variáveis no Vercel.

export const CHECKOUT_FUNDADOR = import.meta.env.VITE_CHECKOUT_FUNDADOR ?? ''
export const CHECKOUT_ESSENCIAL = import.meta.env.VITE_CHECKOUT_ESSENCIAL || 'https://pay.cakto.com.br/c8fyhqn_920183'
export const CHECKOUT_PLUS     = import.meta.env.VITE_CHECKOUT_PLUS     ?? ''