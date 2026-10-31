// Integração Hotmart aposentada. O endpoint permanece apenas para responder
// explicitamente que a integração não está mais ativa.
Deno.serve(() => new Response(
  JSON.stringify({ error: "Webhook Hotmart desativado. Integração encerrada." }),
  {
    status: 410,
    headers: { "Content-Type": "application/json" }
  }
));
