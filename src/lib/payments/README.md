# Módulo central de pagamentos

## Estado atual
Existe apenas o contrato TypeScript em `types.ts`. Nenhum provedor foi conectado e nenhuma cobrança é criada. O contrato é um ponto de extensão, não uma integração funcional.

## Regras obrigatórias
- Implementar adaptadores no backend; nunca colocar access token/chave privada no bundle do navegador.
- O servidor calcula valor, moeda, pedido e referência. Não confiar em total calculado pelo frontend.
- Toda criação deve usar uma chave de idempotência estável para a operação lógica.
- Só confirmar pagamento após webhook autenticado/assinado e validado ou consulta autenticada ao provedor.
- Validar ID da transação, referência interna, valor, moeda e status.
- Deduplicar webhooks por ID de evento e registrar payload mínimo/mascarado.
- Modelar estados internos: pending, confirmed, rejected, expired, cancelled, refunded. Registrar transições, sem apagar histórico.
- Timeout/retentativa não pode gerar uma cobrança duplicada; consultar o provedor usando a referência/idempotência antes de repetir.
- Reembolsos devem ser operações explícitas e auditáveis.
- Logs não podem incluir credenciais, dados completos de cartão ou tokens secretos.

## Próximos passos para integração real
1. Comparar Mercado Pago, Asaas e Pagar.me para Pix, cartão online, estorno, webhooks, custos e pagamentos presenciais.
2. Confirmar conta de teste e recursos disponíveis na conta escolhida.
3. Implementar Edge Function/backend seguro para criar/consultar cobrança e validar webhook.
4. Criar tabelas de transação, idempotência e log de webhook com RLS restritiva.
5. Testar cobrança de sandbox, pagamento confirmado, recusa, expiração, assinatura inválida e webhook duplicado.
6. Testar a emissão de ingressos somente após confirmação validada.
7. Para cartão no PAX A930, verificar integração homologada específica; não reutilizar o fluxo de cartão online como se fosse EMV presencial.

## Capacidades não presumidas
Pix, cartão, split, estorno, assinatura de webhook e pagamento presencial variam por provedor/conta. Só declarar cada capacidade como suportada depois de confirmada na documentação e validada em teste.
