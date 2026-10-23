# EventFlow Pro — Fase 1

## Escopo
- PWA responsiva com navegação inicial.
- Login e cadastro via Supabase Auth.
- Organizações e papel inicial owner.
- Papéis e isolamento multiempresa via RLS.
- Cadastro e listagem inicial de eventos.
- Contrato adaptador de pagamentos independente de provedor.

## Dependências
1. Conectar o projeto correto no Supabase e aplicar a migração inicial.
2. Configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente frontend.
3. Configurar URL de autenticação e redirecionamentos para preview/produção.
4. Conectar Lovable ao repositório se o preview/edição Lovable fizer parte do fluxo.

## Limites
- Mercado Pago ainda não conectado e sem cobranças nesta fase.
- Ingressos, check-in, PDV, estoque, fechamento de caixa e pulseiras não fazem parte desta entrega.
- Impressora térmica, SDK PAX e NFC exigem validação em hardware real.
- Não publicar em produção antes de testar RLS e permissões.

## Checklist
- [ ] Migração aplicada em projeto Supabase de teste.
- [ ] Cadastro/login/logout verificados.
- [ ] Usuário cria organização e recebe papel owner.
- [ ] Usuário de outra organização não acessa dados alheios.
- [ ] Operações de eventos respeitam papéis.
- [ ] typecheck e build passam no CI.
