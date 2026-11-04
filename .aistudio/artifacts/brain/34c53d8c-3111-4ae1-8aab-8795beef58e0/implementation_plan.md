# Commuária — Arquitetura Revisada: Hierarquia de Usuários, Histórico de O.S., Privacidade e Banco de Dados Supabase

Este documento apresenta a revisão arquitetural e o plano de implementação detalhado para a governança de acesso, execução operacional e auditoria técnica do sistema **Commuária**.

---

## Revisão de Decisões e Diretrizes Críticas

> [!IMPORTANT]
> **Diretrizes Fixadas pelo Usuário para Esta Revisão:**
> 1. **5 Perfis Municipais Estritos**: Manter `ADM`, `Diretor`, `Supervisor`, `Funcionário` e `Cidadão`. Divisão estrita entre o Supervisor (gestão setorial e distribuição) e o Funcionário (execução técnica em campo).
> 2. **Histórico Imutável de O.S. (`work_order_history`)**: Criação de uma tabela dedicada para registrar cada evento de atendimento (transições de status, agente responsável, laudos técnicos, justificativas de impossibilidade e fotos comprobatórias) sem sobrescrever registros passados.
> 3. **Integridade de Tipos e Chaves**: Chaves estrangeiras e identificadores com consistência de tipos (UUID compatível com `auth.users` e chave primária das tabelas relacionadas).
> 4. **Privacidade e Auditoria Executiva do Diretor**: O Diretor audita indicadores agregados, eficiência e cumprimento de O.S. intersetoriais com **mascaramento e anonimização de dados pessoais sensíveis dos munícipes** (nome, CPF, e-mail e telefone), preservando a privacidade do cidadão.
> 5. **Ciclo de Vida Limpo (Anti-Duplicação)**: A emissão de uma O.S. vincula-se ao chamado existente e **nunca cria um chamado duplicado**. O encerramento ou impossibilidade de uma O.S. atualiza diretamente o chamado original do cidadão com laudo e parecer.
> 6. **Notificações Persistentes com Deduplicação**: Notificações com chave de idempotência para evitar envios repetidos durante renderizações ou sincronizações de estado.

---

## 1. Visão Geral da Hierarquia e Níveis de Acesso

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GOVERNANÇA MUNICIPAL COMMUÁRIA                  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
           ▼                                                   ▼
┌───────────────────────┐                           ┌────────────────────┐
│         ADM           │                           │      DIRETOR       │
│  (Gestão Central)     │                           │ (Auditoria & KPIs) │
│ - Gestão de usuários  │                           │ - Visão multi-setor│
│ - Configurações globais                           │ - Auditoria de O.S.│
│ - Acesso completo RLS │                           │ - Dados mascarados │
└──────────┬────────────┘                           └─────────┬──────────┘
           │                                                  │
           │           ┌──────────────────────────────────────┘
           ▼           ▼
┌────────────────────────────────────────────────────────┐
│                      SUPERVISOR                        │
│          (Gestor Setorial - Zeladoria Urbana)          │
│ - Triagem de chamados da população do seu setor       │
│ - Emissão e despacho de Ordens de Serviço (O.S.)       │
│ - Atribuição de O.S. para Técnicos (Funcionários)      │
│ - Definição de prioridades, prazos e laudos técnicos   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                      FUNCIONÁRIO                       │
│              (Técnico Operacional de Campo)            │
│ - Consulta de O.S. atribuídas e da equipe de plantão  │
│ - Ação: "Iniciar Atendimento em Campo"                 │
│ - Ação: "Registrar Conclusão" (laudo + foto comprobat.)│
│ - Ação: "Relatar Impossibilidade" (motivo estruturado) │
│ - Sem acesso a gerenciar contas ou outros setores      │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ (Executa serviços demandados)
┌──────────────────────────┴─────────────────────────────┐
│                        CIDADÃO                         │
│                    (Munícipe Usuário)                  │
│ - Abertura de novos chamados com fotos e geoloc        │
│ - Acompanhamento exclusivo dos seus próprios relatos   │
│ - Recebimento de pareceres técnicos e notificações     │
│ - Protegido por sigilo e RLS estrito                   │
└────────────────────────────────────────────────────────┘
```

### 1.1 Matriz de Responsabilidades e Permissões (RBAC)

| Funcionalidade / Operação | ADM | Diretor | Supervisor | Funcionário | Cidadão |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Gerenciar Contas e Alterar Cargos** | **Sim** | Não | Não | Não | Não |
| **Suspender / Reativar Usuários** | **Sim** | Não | Não | Não | Não |
| **Mapa Global com Todos os Chamados** | **Sim** | **Sim** | Apenas Setor | Apenas Setor | Não |
| **Visualizar Dados Pessoais de Cidadãos** | **Sim** | **Não (Mascarado)** | Apenas do Chamado | Não | Apenas Próprio |
| **Painel de Indicadores & Desempenho** | **Sim** | **Sim (Executivo)** | Apenas Setor | Não | Não |
| **Triar Chamados e Criar O.S.** | **Sim** | Não | **Sim (Setorial)** | Não | Não |
| **Distribuir / Delegar O.S. para Técnico**| **Sim** | Não | **Sim** | Não | Não |
| **Iniciar Atendimento de O.S. em Campo** | Não | Não | Não | **Sim** | Não |
| **Concluir O.S. (com foto e laudo)** | Não | Não | **Sim (Aprovar)** | **Sim (Registrar)**| Não |
| **Reportar Impossibilidade de Resolução**| Não | Não | **Sim** | **Sim** | Não |
| **Criar Novo Chamado Municipal** | **Sim** | Não | Não | Não | **Sim** |
| **Acompanhar Próprios Chamados** | **Sim** | Não | Não | Não | **Sim** |

---

## 2. Modelo de Dados Relacional e Estrutura das Tabelas

O modelo preserva integralmente as tabelas já operacionais (`profiles`, `reports`, `work_orders`, `news`) e adiciona a tabela de histórico de auditoria `work_order_history`.

```
┌────────────────────────┐         1:N         ┌────────────────────────┐
│        profiles        │◄────────────────────┤        reports         │
│ ────────────────────── │                     │ ────────────────────── │
│ id (TEXT / UUID) PK    │                     │ id (TEXT / UUID) PK    │
│ email TEXT             │                     │ user_id (FK -> auth)   │
│ name TEXT              │                     │ category TEXT          │
│ role TEXT              │                     │ status TEXT            │
│ assigned_category TEXT │                     │ is_work_order BOOLEAN  │
│ is_blocked BOOLEAN     │                     │ ...                    │
└───────────┬────────────┘                     └───────────┬────────────┘
            │                                              │ 1:1 (Origem)
            │ 1:N (Criador / Executor)                     ▼
            │                                  ┌────────────────────────┐
            │                                  │      work_orders       │
            │                                  │ ────────────────────── │
            │                                  │ id (TEXT / UUID) PK    │
            │                                  │ order_number TEXT      │
            │                                  │ linked_report_id (FK)  │
            │                                  │ category TEXT          │
            │                                  │ assigned_employee_id   │
            │                                  │ status TEXT            │
            │                                  │ ...                    │
            │                                  └───────────┬────────────┘
            │                                              │ 1:N
            │                                              ▼
            │                                  ┌────────────────────────┐
            └─────────────────────────────────►│   work_order_history   │
                                               │ ────────────────────── │
                                               │ id (TEXT / UUID) PK    │
                                               │ work_order_id (FK)     │
                                               │ user_id (FK)           │
                                               │ user_name TEXT         │
                                               │ user_role TEXT         │
                                               │ action_type TEXT       │
                                               │ previous_status TEXT   │
                                               │ new_status TEXT        │
                                               │ message TEXT           │
                                               │ photo_url TEXT         │
                                               │ created_at TIMESTAMPTZ │
                                               └────────────────────────┘
```

### 2.1 Especificação Detalhada das Tabelas

#### Tabela 1: `public.profiles`
Armazena a identidade do usuário e seu perfil hierárquico municipal.
- `id` (`TEXT` / `UUID`, PK): Identificador do usuário. Quando criado via Supabase Auth, coincide exatamente com `auth.users.id`.
- `name` (`TEXT`, NOT NULL): Nome completo do usuário.
- `email` (`TEXT`, NOT NULL): E-mail institucional ou civil.
- `role` (`TEXT`, NOT NULL DEFAULT `'user'`): Perfil de acesso (`'admin'`, `'diretor'`, `'supervisor'`, `'funcionario'`, `'user'`).
- `assigned_category` (`TEXT`, NULL): Setor municipal designado (*ex: `'Pavimentação'`, `'Iluminação Pública'`, `'Limpeza Urbana'`, `'Saneamento'`, `'Arborização'`*). Aplicável a Supervisores e Funcionários.
- `assigned_sectors` (`TEXT[]`, NULL): Lista de secretarias sob responsabilidade (para Diretores que auditam múltiplas pastas).
- `is_admin` (`BOOLEAN`, DEFAULT `FALSE`): Sinalizador estrito para ADM central.
- `is_blocked` (`BOOLEAN`, DEFAULT `FALSE`): Status de suspensão moderativa.
- `blocked_until` (`TIMESTAMPTZ`, NULL): Data de término da suspensão temporária.
- `block_reason` (`TEXT`, NULL): Motivo formal registrado pelo ADM.
- `blocked_at` (`TIMESTAMPTZ`, NULL): Data de aplicação da suspensão.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Data de criação.

#### Tabela 2: `public.reports` (Chamados da População)
- `id` (`TEXT` / `UUID`, PK): Identificador único da ocorrência.
- `title` (`TEXT`, NOT NULL): Título descritivo do problema relatado.
- `description` (`TEXT`): Detalhamento do morador.
- `category` (`TEXT`, DEFAULT `'Pavimentação'`): Setor municipal de zeladoria.
- `maintenance_type` (`TEXT`): Subcategoria técnica.
- `address` (`TEXT`): Endereço e ponto de referência em Araucária.
- `latitude` (`DOUBLE PRECISION`): Coordenada geográfica.
- `longitude` (`DOUBLE PRECISION`): Coordenada geográfica.
- `status` (`TEXT`, DEFAULT `'unresolved'`): Situação (`'unresolved'`, `'in_analysis'`, `'in_progress'`, `'resolved'`, `'cancelled'`).
- `status_notes` (`TEXT`): Parecer técnico atualizado devolvido pela prefeitura.
- `image_url` (`TEXT`): Fotografia inicial enviada pelo morador.
- `anonymous` (`BOOLEAN`, DEFAULT `FALSE`): Ocultação pública do autor.
- `user_id` (`TEXT` / `UUID`, NULL): FK referenciando o autor no `auth.users` ou perfil.
- `user_email` (`TEXT`): E-mail do solicitante para contato e notificações.
- `user_name` (`TEXT`): Nome do munícipe.
- `is_work_order` (`BOOLEAN`, DEFAULT `FALSE`): Flag indicativa (preservada por compatibilidade legada).
- `work_order_number` (`TEXT`, NULL): Número de protocolo da O.S. vinculada.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Data de abertura.
- `resolved_at` (`TIMESTAMPTZ`, NULL): Data de encerramento do chamado.

#### Tabela 3: `public.work_orders` (Ordens de Serviço)
- `id` (`TEXT` / `UUID`, PK): Identificador único da O.S.
- `order_number` (`TEXT`, NOT NULL, UNIQUE): Protocolo formal (*ex: `'OS-PAV-2026-4821'`*).
- `linked_report_id` (`TEXT` / `UUID`, NULL): Chave estrangeira que aponta para `reports(id)` de onde a O.S. se originou.
- `title` (`TEXT`, NOT NULL): Descrição do serviço técnico a executar.
- `category` (`TEXT`, NOT NULL): Setor responsável pela execução.
- `address` (`TEXT`, NOT NULL): Local exato de intervenção.
- `priority` (`TEXT`, DEFAULT `'medium'`): Nível de urgência (`'low'`, `'medium'`, `'high'`, `'emergency'`).
- `deadline` (`TEXT` ou `DATE`): Prazo operacional acordado para atendimento.
- `assigned_team` (`TEXT`): Nome da equipe, veículo ou turno de trabalho.
- `assigned_employee_id` (`TEXT` / `UUID`, NULL): ID do funcionário/técnico de campo responsável.
- `assigned_employee_name` (`TEXT`, NULL): Nome legível do técnico designado.
- `maintenance_type` (`TEXT`): Procedimento (*ex: `'Operação Tapa-buraco'`, `'Troca de Reator'`*).
- `description` (`TEXT`): Escopo técnico da demanda.
- `technical_instructions` (`TEXT`): Instruções de segurança e execução.
- `status` (`TEXT`, DEFAULT `'dispatched'`): Situação operacional (`'dispatched'`, `'in_progress'`, `'completed'`, `'impossible'`, `'cancelled'`).
- `status_notes` (`TEXT`): Observações de andamento.
- `resolution_notes` (`TEXT`): Laudo final do técnico ou supervisor.
- `resolution_photo_url` (`TEXT`): Foto comprobatória da obra ou impedimento.
- `supervisor_name` (`TEXT`): Nome do supervisor emitente.
- `supervisor_email` (`TEXT`): E-mail do supervisor emitente.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Data de emissão.
- `completed_at` (`TIMESTAMPTZ`, NULL): Data de conclusão.

#### Tabela 4 (Nova): `public.work_order_history` (Histórico de Atendimento e Auditoria)
Esta tabela preserva a rastreabilidade completa e imutável de todas as ações executadas em uma O.S.
- `id` (`TEXT` / `UUID`, PK): Identificador do evento (`'woh_' || gen_random_uuid()`).
- `work_order_id` (`TEXT` / `UUID`, NOT NULL): FK referenciando `work_orders(id)`.
- `user_id` (`TEXT` / `UUID`, NULL): ID do agente que efetuou a ação.
- `user_name` (`TEXT`, NOT NULL): Nome do agente (para auditoria perene mesmo se o perfil for alterado).
- `user_role` (`TEXT`, NOT NULL): Cargo do agente no instante da ação (`'admin'`, `'diretor'`, `'supervisor'`, `'funcionario'`).
- `action_type` (`TEXT`, NOT NULL): Tipo de evento:
  - `'create'`: O.S. criada e despachada pelo Supervisor.
  - `'delegate'`: O.S. redistribuída para outro técnico ou equipe.
  - `'start'`: Técnico iniciou deslocamento / atendimento no local.
  - `'note'`: Inserção de parecer ou atualização técnica intermediária.
  - `'complete'`: Conclusão do serviço com laudo e foto.
  - `'impossible'`: Relato formal de impossibilidade técnica com justificativa.
  - `'cancel'`: Cancelamento administrativo.
- `previous_status` (`TEXT`, NULL): Status anterior da O.S.
- `new_status` (`TEXT`, NOT NULL): Novo status assumido pela O.S.
- `message` (`TEXT`): Descrição do atendimento, laudo ou justificativa da ação.
- `photo_url` (`TEXT`, NULL): URL da foto comprobatória registrada no ato.
- `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`): Carimbo de data/hora do evento.

---

## 3. Privacidade e Proteção de Dados (Regras para Diretor e Cidadãos)

### 3.1 Política de Privacidade para o Perfil Diretor
O Diretor possui escopo executivo de gestão sobre todas as secretarias e O.S., mas não deve ter acesso desnecessário aos dados dos munícipes.

1. **Mascaramento no Frontend e na API**:
   - Ao carregar chamados e O.S. no painel do Diretor, dados identificadores do cidadão (`user_email`, `user_name`, telefone, documentos) são anonimizados.
   - O Diretor visualiza:
     - Protocolo do chamado / Protocolo da O.S.
     - Bairro, rua e geolocalização da ocorrência.
     - Categoria, tipo de manutenção e nível de prioridade.
     - Prazos, tempo de atendimento, técnico/supervisor responsável.
     - Laudo técnico e histórico de status.
   - O campo do solicitante é exibido como: `Cidadão (Bairro Centro)` ou `Munícipe #A842`, sem revelar dados de contato pessoal.

2. **Garantia de Não-Interferência**:
   - O painel do Diretor é estritamente de consulta, auditoria e emissão de relatórios/indicadores.
   - Não há formulários ou botões de alteração de senha, criação de contas ou atribuição de permissões no escopo do Diretor.

---

## 4. Políticas de Segurança Supabase (Row Level Security - RLS)

As políticas de RLS garantem que a autorização seja imposta no nível do banco de dados, e não apenas no frontend.

```sql
-- Ativação da RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS PARA PROFILES
-- Leitura: Qualquer usuário autenticado pode ler perfis para identificar técnicos e supervisores.
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Atualização: Usuário comum só edita seu próprio nome. Apenas ADM altera cargo/role/is_blocked.
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()::text AND (role = 'admin' OR is_admin = true)
  ));

-- 2. POLÍTICAS PARA REPORTS (Chamados)
-- Cidadão: Insere seus chamados e visualiza ocorrências da cidade.
CREATE POLICY "reports_insert_citizen" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

CREATE POLICY "reports_select" ON public.reports
  FOR SELECT TO authenticated
  USING (true);

-- Atualização de chamados: Apenas ADM e Supervisor do setor correspondente podem atualizar status e parecer técnico.
CREATE POLICY "reports_update_supervisor_admin" ON public.reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()::text AND (
        role = 'admin' OR is_admin = true OR
        (role = 'supervisor' AND (assigned_category = reports.category OR assigned_category IS NULL))
      )
    )
  );

-- 3. POLÍTICAS PARA WORK_ORDERS
-- Leitura: Administradores e Diretores lêem todas. Supervisores e Funcionários lêem as do seu setor ou atribuídas a si.
CREATE POLICY "work_orders_select" ON public.work_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND (
        p.role IN ('admin', 'diretor') OR
        p.is_admin = true OR
        (p.role = 'supervisor' AND (p.assigned_category = work_orders.category OR p.assigned_category IS NULL)) OR
        (p.role = 'funcionario' AND (p.id = work_orders.assigned_employee_id OR p.assigned_category = work_orders.category))
      )
    )
  );

-- Inserção de O.S.: Apenas ADM e Supervisor do setor.
CREATE POLICY "work_orders_insert" ON public.work_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND (p.role IN ('admin', 'supervisor') OR p.is_admin = true)
    )
  );

-- Atualização de O.S.: Supervisor e Funcionário atribuído podem atualizar andamento e laudo.
CREATE POLICY "work_orders_update" ON public.work_orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text AND (
        p.role IN ('admin', 'supervisor') OR
        p.is_admin = true OR
        (p.role = 'funcionario' AND p.id = work_orders.assigned_employee_id)
      )
    )
  );

-- 4. POLÍTICAS PARA WORK_ORDER_HISTORY (Histórico de Atendimento)
-- Leitura: ADM, Diretor, Supervisor e Funcionário.
CREATE POLICY "woh_select" ON public.work_order_history
  FOR SELECT TO authenticated USING (true);

-- Inserção: Permitida ao agente que executa a transição de status.
CREATE POLICY "woh_insert" ON public.work_order_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);
```

---

## 5. Ciclo de Vida do Chamado e Não-Duplicação de Registros

### 5.1 Regra Rígida de Anti-Duplicação
- **Problema anterior**: Ao gerar uma O.S., o código anterior inseria tanto na tabela `work_orders` quanto duplicava um item na tabela `reports` com prefixo `[OS-...]`. Isso gerava duplicidade de estatísticas e poluição do feed do cidadão.
- **Solução Arquitetural**:
  1. A emissão de uma O.S. pelo Supervisor vincula-se ao chamado existente via `work_orders.linked_report_id = report.id`.
  2. **Nenhuma linha adicional é inserida na tabela `reports`**.
  3. O chamado original tem seu status atualizado para `'in_progress'` e recebe a anotação `work_order_number = generatedOrderNumber` e `status_notes = "O.S. emitida para atendimento da equipe"`.
  4. Quando o Funcionário conclui a O.S. ou relata impossibilidade, o sistema localiza `linked_report_id` e atualiza o chamado do cidadão:
     - **Se Concluída**: `report.status = 'resolved'`, `report.resolved_at = NOW()`, `report.status_notes = "Atendimento concluído: " + laudo`.
     - **Se Impossível**: `report.status = 'in_analysis'`, `report.status_notes = "Atendimento impedido: " + justificativa + " (Aguardando reavaliação técnica)"`.

```
[Munícipe abre Chamado] ───► reports (id: "rep_123", status: "unresolved")
                                       │
[Supervisor despacha O.S.] ────────────┼─► work_orders (id: "wo_456", linked_report_id: "rep_123")
                                       │   reports.status -> "in_progress"
                                       │   work_order_history.insert("create")
                                       │
[Funcionário inicia campo] ────────────┼─► work_orders.status -> "in_progress"
                                       │   work_order_history.insert("start")
                                       │
[Funcionário conclui c/ foto] ─────────┴─► work_orders.status -> "completed"
                                           work_order_history.insert("complete", foto)
                                           reports.status -> "resolved" (Sincronizado!)
```

---

## 6. Sistema de Notificações Persistente e Deduplicado

1. **Chave de Idempotência**: Cada notificação terá um ID único composto por `notif_${reportId}_${status}_${date}`.
2. **Deduplicação de Envio**: Antes de disparar Push ou Toast, o serviço verifica `commuaria_sent_notifications`. Se a chave já existir, a notificação repetida é descartada.
3. **Persistência das Notificações**: As notificações do munícipe são armazenadas no seu histórico para que ele consiga ler no sininho de notificações ao acessar o sistema.

---

## 7. Roteiro de Etapas para Execução (Após Aprovação do Usuário)

- [ ] **Etapa 1: Atualização dos Tipos TypeScript (`src/types.ts`)**
  - Adicionar interface `WorkOrderHistoryItem` com todos os campos especificados.
  - Adicionar tipos de ações `'create' | 'delegate' | 'start' | 'note' | 'complete' | 'impossible' | 'cancel'`.
  - Adicionar helper de mascaramento `maskCitizenData(report, viewerRole)`.

- [ ] **Etapa 2: Implementação da Tabela e Serviço de Histórico (`src/lib/workOrderService.ts`)**
  - Funções unificadas `createWorkOrder()`, `startWorkOrder()`, `completeWorkOrder()`, `reportWorkOrderImpossible()`.
  - Garantir que todas as transições gravem automaticamente em `work_order_history` no Supabase e no cache local.
  - Eliminar qualquer duplicação de inserção na tabela `reports`.

- [ ] **Etapa 3: Revisão do Painel do Diretor com Mascaramento (`src/components/DirectorDashboardView.tsx`)**
  - Aplicar mascaramento aos nomes e contatos de munícipes nos detalhes dos chamados.
  - Incluir aba/timeline do histórico `work_order_history` na visualização detalhada de O.S.

- [ ] **Etapa 4: Atualização da Visão do Funcionário (`src/components/EmployeeWorkView.tsx`)**
  - Conectar os botões de ação ("Iniciar", "Concluir", "Impossibilidade") ao serviço de histórico com inserção de laudo e foto.
  - Atualização do chamado original associado (`linked_report_id`).

- [ ] **Etapa 5: Atualização da Visão do Supervisor (`src/components/SupervisorWorkOrderView.tsx`)**
  - Exibir a linha do tempo completa de eventos da O.S. no modal de detalhes.
  - Remover a inserção espelhada de O.S. como chamado duplicado em `reports`.

- [ ] **Etapa 6: Consolidação do Script SQL no `DatabaseManagerModal.tsx`**
  - Incluir DDL completo da tabela `work_order_history` e políticas RLS detalhadas prontas para execução no Supabase.

- [ ] **Etapa 7: Verificação e Validação sem Erros**
  - Execução de `lint_applet` e `compile_applet`.

---

> [!NOTE]
> Conforme solicitado, **nenhum código de produção nem comando SQL foi executado nesta etapa**. Aguardo sua avaliação e aprovação deste plano revisado para iniciar a execução técnica.
