# EventFlow Pro

Plataforma SaaS para gestão de eventos, ingressos, operações de ponto de venda e financeiro.

## Estado do projeto

Repositório inicializado para registrar o baseline antes da implementação. Nenhuma funcionalidade de produto foi implementada ainda.

## Decisões da Fase 0

- Backend e banco: Supabase (pendente de conexão e validação do projeto real).
- Pagamentos online: Mercado Pago por meio de adaptador de provedor (integração real pendente).
- Prioridade inicial: fundação, autenticação, organizações, permissões, navegação e módulo de eventos.
- PWA responsiva; compatibilidade com hardware PAX e pulseiras NFC exige validação específica posterior.

## Segurança

Segredos devem ser armazenados em variáveis de ambiente e nunca versionados. Isolamento multiempresa deve ser aplicado no backend e nas políticas RLS do banco.

## Próximas etapas

1. Confirmar integrações do Lovable e Supabase.
2. Implementar a fundação técnica e autenticação.
3. Implementar organizações, permissões e eventos.
4. Validar testes e registrar o checkpoint da entrega.
