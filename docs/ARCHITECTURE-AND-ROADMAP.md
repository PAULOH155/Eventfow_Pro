# EventFlow Pro — Arquitetura e plano de implementação

## Decisões aprovadas

- Repositório oficial: `PAULOH155/Eventfow_Pro`, branch de trabalho `feat/fase-1-foundation`.
- Backend: Supabase Auth + PostgreSQL + Row Level Security (RLS).
- Frontend: React + TypeScript + Vite; PWA responsiva.
- Provedor candidato para avaliação: Mercado Pago. Nenhuma cobrança real está ativada.
- O projeto Lovable existente será preservado. O projeto atualmente vinculado ao Lovable usa TanStack Start e outro repositório; não presumir sincronização com este repositório nem substituir a conexão sem migração validada.

## Arquitetura lógica

1. Interface: páginas, componentes acessíveis, formulários validados e estados de carregamento/erro/vazio.
2. Domínios: organizações, eventos, bilheteria, PDV, estoque, financeiro e cashless.
3. Serviços de aplicação: regras de autorização, transições de estado, idempotência e orquestração.
4. Persistência: PostgreSQL/Supabase; RLS como defesa adicional, não como substituto de validação de negócio.
5. Integrações server-side: adaptadores de pagamentos, webhooks, e futuras integrações PAX/hardware. Segredos não entram no bundle do frontend.

## Fundação de dados atual

- `organizations`: espaços multiempresa.
- `organization_members`: associação usuário-organização e papel.
- `events`: cadastro inicial de eventos.

RLS está habilitado nas três tabelas. O RPC `create_organization` exige sessão autenticada e cria a organização com o solicitante como proprietário. Políticas de eventos limitam criação/edição aos papéis owner, admin e event_manager. Os testes de isolamento entre duas contas ainda precisam ser executados.

## Estratégia de autenticação e multiempresa

- Supabase Auth para cadastro, login, sessão e logout.
- Toda consulta de negócio deve estar escopada por organização e protegida por políticas RLS.
- O backend verifica identidade e papel; nunca confiar somente em IDs ou permissões enviados pela interface.
- Convites e gestão de membros só serão habilitados após definir fluxo seguro de convite, aceite e revogação.
- Não armazenar chaves privadas no navegador.

## Arquitetura central de pagamentos

Contrato independente de provedor localizado em `src/lib/payments/types.ts`. A integração produtiva precisa de funções backend para:
- calcular valores no servidor e criar cobranças com chave de idempotência;
- consultar cobranças e mapear estados do provedor;
- validar assinatura de webhook, referência, moeda, valor e status;
- registrar eventos recebidos e rejeitar duplicados;
- reconciliar por consulta autenticada quando webhooks falharem;
- manter logs sem credenciais nem dados sensíveis;
- processar cancelamentos/estornos sem apagar o histórico financeiro.

Status interno previsto: pending, confirmed, rejected, expired, cancelled e refunded. A capacidade real deve ser mapeada por provedor; não declarar Mercado Pago integrado antes de executar testes de sandbox e de webhook. Nenhum valor no navegador ou retorno de redirecionamento confirma pagamento.

## Limitações do PAX A930

- A PWA pode apresentar a interface touch e poderá usar a câmera via APIs do navegador, após testes reais de desempenho e permissões.
- Impressora térmica integrada: não presumir acesso via API web. Impressão local exige ponte nativa/SDK; até lá, usar PDF/impressão padrão ou impressora compatível comprovada.
- Cartão EMV contactless: depende do SDK/gateway homologado para o PAX A930. Não implementar EMV com Web NFC.
- Pulseiras NFC genéricas: compatibilidade de UID/NDEF via SDK precisa ser confirmada com documentação e teste físico. Não usar UID público como autorização de gasto.
- Offline: não prometer venda, check-in, estoque, pagamento ou cashless offline. Cache apenas para shell público e recursos estáticos seguros.

## Plano por fases e critérios de aceite

### Fase 0 — Planejamento
- Confirmar repositórios, Supabase, arquitetura, dependências, limitações de hardware e critérios.
- Preservar checkpoint GitHub antes de mudanças.

### Fase 1 — Fundação + arquitetura de pagamentos
- Autenticação real, organizações, papéis, RLS, navegação e PWA inicial.
- Contrato adaptador de pagamento sem ativar cobranças reais.
- Aceite: build/typecheck; cadastro/login/logout; criar organização; teste negativo de isolamento entre organizações; permissões testadas por papel; PWA validada em desktop/mobile.

### Fase 2 — Eventos
- CRUD persistido de eventos, dashboard com dados reais, categorias, lotes e configurações iniciais.
- Aceite: criar, listar, editar, cancelar/encerrar conforme permissão, validar datas e verificar persistência/restrições por organização.

### Fase 3 — Ingressos
- Lotes, emissão individual idempotente, tokens QR opacos, PDFs/exportação e check-in atômico.
- Aceite: sem duplicação por repetição, QR consultado no backend e bloqueio de check-in duplicado.

### Fase 4 — PDV e estoque
- Catálogo, vendas persistidas, caixa, movimentação de estoque e comprovantes.
- Dinheiro pode ser registrado por operador autorizado; Pix só confirma por webhook/consulta. Cartão no PAX depende de SDK homologado.

### Fase 5 — Pagamentos reais
- Selecionar provedor após comparar taxas, Pix/cartão, estornos, webhooks e suporte presencial.
- Sandbox, assinatura de webhook, idempotência, recusa/expiração, conciliação e teste ponta a ponta antes de produção.

### Fase 6 — Financeiro
- Relatórios derivados de registros persistidos, taxas, despesas, estornos, repasses e fechamento.

### Fase 7 — Cashless
- Somente após validar hardware/leitor, escolher provedor e aprovar modelo de ameaça.
- Livro-razão imutável, saldo no backend, operações atômicas e compensações em vez de edição/exclusão.

### Fase 8 — Produção
- Testes de segurança, isolamento, concorrência, responsividade, PWA, backups e procedimento de implantação.
- Documentar os gaps de impressão, EMV e pulseira no PAX A930 que continuarem pendentes.

## Dependências externas

- Supabase: projeto ativo e variáveis públicas do cliente configuradas no ambiente; configurar URLs de redirecionamento de autenticação.
- Provedor de pagamento: conta e credenciais de teste guardadas como secrets no backend, nunca no frontend.
- PAX: documentação/SDK homologado, acesso ao dispositivo e testes físicos.
- Publicação: definir o destino de deploy e configurar HTTPS antes de operações reais.

## Estado de validação em 2026-10-23

- Migrações iniciais e de hardening aplicadas ao Supabase `eventflow-pro`.
- Tabelas `organizations`, `organization_members` e `events` verificadas com RLS habilitado.
- Aviso de execução anônima das funções SECURITY DEFINER deixou de aparecer após a correção. O advisor ainda avisa que funções SECURITY DEFINER são executáveis por usuários autenticados; isso é esperado para helpers/RPC usados pelas políticas, mas deve ser coberto por testes de autorização.
- Build/typecheck, testes de autenticação, isolamento entre contas, preview Lovable e hardware ainda não validados nesta etapa.
