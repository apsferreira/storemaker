# SPEC-STOREMAKE-002 — Multi-tenant com Filiais + Módulos Configuráveis

**Data:** 2026-04-11  
**Autor:** Antonio Pedro Ferreira (PM)  
**Status:** Aguarda aprovação CEO  
**Prioridade:** P1 (impacto direto no modelo de cobrança e elasticidade do produto)  
**Esforço estimado:** L (Large — 3-4 sprints)

---

## 1. Contexto e Problema

### Situação atual
StoreMake oferece loja virtual por tenant com plano Starter (R$79/mês, 200 produtos, 1 loja, domínio custom) gerenciado pelo `checkout-service`. Cada tenant = uma empresa com uma loja.

### Limitação identificada
1. **Distribuidoras e franqueados:** Clientes querem usar **apenas o módulo de estoque** sem loja virtual pública ativa (ex: coletar dados de vendas offline, gerenciar inventário multi-filial, emitir NF-e).
2. **Redes e franquias:** Uma empresa com **múltiplas filiais** precisa de:
   - Cada filial com sua **própria loja virtual** (URL/subdomínio único)
   - Mas **compartilhando o mesmo estoque** do tenant principal (reserva centralizada)
   - Possibilidade de algumas filiais serem "físicas" (sem catálogo online)
3. **Modularidade:** Não há forma de "desabilitar" módulos — todos os tenants pagam pelo pacote inteiro.

### Oportunidade de negócio
- **Novo segmento:** Distribuidoras (PLN = apenas estoque) com ticket menor que loja virtual
- **Upsell:** Franqueado começa com 1 filial, escala para 5+ pagando por módulo
- **Retenção:** Possibilitar que cliente pague apenas pelos módulos que usa

---

## 2. Objetivos da SPEC

- [x] Definir arquitetura de multi-tenant com suporte a filiais
- [x] Especificar módulos configuráveis e planos de cobrança por módulo
- [x] Esclarecer regras de estoque compartilhado vs isolado por filial
- [x] Propor fluxo de UI para admin gerenciar filiais + módulos
- [x] Mapear impacto técnico nas tabelas + serviços
- [x] Orientar time técnico (@tl/@backend/@frontend) para implementação

---

## 3. Solução Proposta

### 3.1 Modelo de dados simplificado (ASCII)

```
┌─────────────────┐
│     TENANT      │ (empresa, conta)
│  id, name,      │ ex: "Cia. Distribuidora XYZ"
│  plano, owner   │
└────────┬────────┘
         │
         │ 1:N
         ├──────────────────────┐
         │                      │
    ┌────▼────┐           ┌────▼────┐
    │  FILIAL  │           │ FILIAL   │ ...
    │(branch)  │           │(branch)  │
    │id, name, │           │id, name, │
    │url,type  │           │url,type  │
    │tenant_id │           │tenant_id │
    └────┬─────┘           └────┬─────┘
         │                      │
         │ cada filial tem      │ mesma estrutura
         │ próprio usuário       │ de dados
         │                      │
    ┌────▼──────────────────────┴──────┐
    │                                   │
    │  INVENTÁRIO COMPARTILHADO         │
    │  (tabela "inventory" ou stock)    │
    │                                   │
    │  - Quantidade total do tenant     │
    │  - Reservas por filial (map)      │
    │  - Histórico de movimentação      │
    │                                   │
    └───────────────────────────────────┘
```

### 3.2 Módulos Configuráveis

Cada tenant pode habilitar/desabilitar os seguintes módulos:

| Módulo | Código | Descrição | Padrão | Impacto UI |
|--------|--------|-----------|--------|-----------|
| **Loja Virtual** | `storefront` | Catálogo + checkout público para clientes finais | ✅ Sim | Exibe seções Produtos, Pedidos, Cupons |
| **Estoque** | `inventory` | Gestão centralizada de inventário, movimentação, contagem | ✅ Sim | Exibe seções Estoque, Transferências, Contagens |
| **CRM** | `crm` | Gestão de clientes, contatos, histórico | ❌ Não (backlog) | Exibe seção Clientes |
| **WhatsApp** | `whatsapp` | Notificações de pedidos, baixo estoque, campanhas | ❌ Não | Exibe seção Integrações > WhatsApp |
| **Relatórios** | `reports` | Analíticos de vendas, estoque, ROI | ❌ Não | Exibe seção Relatórios |

---

## 4. Arquitetura de Dados

### 4.1 Tabelas Novas

#### `branches` (filiais)
```sql
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,                    -- "Filial São Paulo", "Matriz"
    slug VARCHAR(100) NOT NULL,                    -- "sp-paulista", "matriz"
    branch_type VARCHAR(50) NOT NULL,              -- 'virtual' | 'physical' | 'master'
    
    -- virtual = loja online com catálogo próprio
    -- physical = filial física, consome estoque, sem catálogo
    -- master = filial que controla inventário centralizado
    
    -- URLs e visibilidade
    url VARCHAR(255) UNIQUE,                       -- ex: "sp.loja.com.br", NULL se physical
    is_public BOOLEAN DEFAULT true,                -- se false, loja não é acessível
    
    -- Contato
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address JSONB,  -- { street, city, state, zip, country }
    
    -- Estoque
    is_master_inventory BOOLEAN DEFAULT false,     -- controla estoque centralizado
    reserve_strategy VARCHAR(50) DEFAULT 'fifo',   -- 'fifo' | 'lifo' | 'manual'
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP,
    
    UNIQUE (tenant_id, slug)
);
CREATE INDEX idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX idx_branches_slug ON branches(slug);
```

#### `tenant_modules` (feature flags)
```sql
CREATE TABLE tenant_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_code VARCHAR(50) NOT NULL,              -- 'storefront', 'inventory', 'crm', 'whatsapp', 'reports'
    
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}',                     -- { max_products: 500, notifications_per_month: 1000 }
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    UNIQUE (tenant_id, module_code)
);
CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
```

#### `inventory_reserves` (reservas por filial)
```sql
CREATE TABLE inventory_reserves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    
    reserved_qty INT NOT NULL DEFAULT 0,           -- quantidade reservada nesta filial
    allocated_qty INT NOT NULL DEFAULT 0,          -- quantidade efetivamente em mãos nesta filial
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    
    UNIQUE (inventory_id, branch_id)
);
CREATE INDEX idx_reserves_branch ON inventory_reserves(branch_id);
```

### 4.2 Modificações em Tabelas Existentes

#### `tenants` — adicionar coluna
```sql
ALTER TABLE tenants 
    ADD COLUMN multi_branch_enabled BOOLEAN DEFAULT false,  -- flag para habilitar multi-filial
    ADD COLUMN primary_branch_id UUID REFERENCES branches(id);
```

#### `lojas` (se ainda existir) — renomear logicamente
```sql
-- lojas.id continuará sendo a "storefront_id" da branch
-- Adicionar coluna para rastreabilidade:
ALTER TABLE lojas 
    ADD COLUMN branch_id UUID REFERENCES branches(id);
```

#### `inventory` (estoque) — adicionar referência
```sql
ALTER TABLE inventory 
    ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
    -- Garantir que mesmo com múltiplas filiais, é sempre estoque do tenant
```

---

## 5. Regras de Negócio

### 5.1 Estoque Compartilhado

**Cenário:** Cia. Xis tem 3 filiais (São Paulo, Rio, Brasília). Produto "Tênis Pro" tem 100 unidades em estoque.

1. **Sem reserva:** Qualquer filial pode vender até 100 unidades (first-come-first-served)
2. **Com reserva manual:** Admin reserva 40 para SP, 30 para RJ, 30 para BSB
3. **Com reserva FIFO:** Sistema reserva na ordem de chegada de pedidos
4. **Transferência entre filiais:** Uma filial move estoque para outra (RJ → SP = 5 unidades)

**Tabela de movimentação:**
```sql
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY,
    inventory_id UUID NOT NULL,
    from_branch_id UUID,                          -- NULL = entrada de fornecedor
    to_branch_id UUID NOT NULL,
    movement_type VARCHAR(50),                    -- 'purchase' | 'transfer' | 'sale' | 'adjustment'
    qty INT NOT NULL,
    created_at TIMESTAMP,
    created_by_user_id UUID
);
```

### 5.2 Visibilidade de Dados (Multi-tenancy)

- **Admin da filial:** Vê apenas estoque, pedidos, clientes da sua filial
- **Admin do tenant:** Vê dados consolidados de todas as filiais
- **API:** Sempre filtrada por `tenant_id` — impossível vazar dados entre tenants

### 5.3 Filiais Compartilham Crédito de Plano?

**Decisão a validar com CEO (Antonio):**

**Opção A — Plano único para todas as filiais**
- Tenant paga R$79 Starter (200 produtos, 1 loja) = **1 filial apenas**
- Para adicionar filial, upgrade para "Starter Plus" R$129 (500 produtos, 5 filiais, estoque compartilhado)
- Vantagem: simples, menos confusão de cobrança
- Desvantagem: menos granular

**Opção B — Plano por filial**
- Cada filial tem seu próprio plano (ou herda do tenant)
- Filial física (sem loja) paga menos (ex: R$49/mês apenas estoque)
- Filial virtual (com loja) paga full price (R$79)
- Vantagem: flexibilidade, upsell por filial
- Desvantagem: complexo, mais SKUs de cobrança

**Recomendação:** Opção A inicialmente (mais simples). Opção B como backlog.

---

## 6. User Stories

### US-001: Admin habilita/desabilita módulos

```
Como administrador do tenant
Quero habilitar ou desabilitar módulos (storefront, inventory, crm, whatsapp, reports)
Para que pague apenas pelos módulos que precisa

Critérios de Aceite:
- Dado que estou na página Configurações > Módulos
- Quando clico no toggle de um módulo
- Então ele é imediatamente ativado/desativado
- E a mudança é persisted no banco de dados

- Quando um módulo é desativado
- Então as rotas e UI associadas são ocultadas (ex: /catalogo retorna 404 se storefront=false)
```

### US-002: Admin cria filial virtual

```
Como admin do tenant "Cia. Xis"
Quero criar uma filial virtual (loja com URL própria)
Para que clientes em outra cidade possam comprar nessa filial

Critérios de Aceite:
- Dado que acesso Filiais > Nova Filial
- Quando preencho nome="Filial Rio", slug="rio", tipo="virtual", URL="rio.loja.com.br"
- Então a filial é criada com:
  - Um subdomínio/URL único
  - Acesso independente ao admin (usuário rio-admin vê só dados do Rio)
  - Estoque compartilhado com a filial principal (Matriz)

- Quando um cliente acessa rio.loja.com.br
- Então ele vê catálogo da Filial Rio (compartilhado com Matriz, com reservas por filial)
- E pode fazer pedido que é roteado para a filial Rio
```

### US-003: Admin cria filial física (sem loja online)

```
Como admin de uma distribuidora
Quero criar uma filial física que acumula estoque offline
Para rastrear mercadoria sem oferecer loja online

Critérios de Aceite:
- Dado que crio filial tipo "physical"
- Então:
  - Nenhuma URL pública é gerada
  - Admin pode ver estoque acumulado nesta filial
  - Admin pode transferir estoque para filial virtual (que vende)
  - Nenhum cliente consegue acessar catálogo direto
```

### US-004: Admin reserva estoque por filial

```
Como admin do tenant
Quero reservar estoque manualmente para cada filial
Para que não haja conflito de venda cruzada

Critérios de Aceite:
- Dado que um produto tem 100 unidades
- E tenho filiais: Matriz (50), Rio (30), SP (20)
- Quando defino as reservas no produto
- Então cada filial só pode vender até sua cota reservada
- E se Rio tenta vender 31 unidades, retorna erro "Estoque insuficiente nesta filial"

- Quando uma filial quer comprar de outra filial (manual)
- Então existe opção "Transferir estoque" com aprovação do admin
```

### US-005: Relatório consolidado de estoque

```
Como admin do tenant
Quero visualizar estoque consolidado de todas as filiais em um único dashboard
Para tomar decisão de compra centralizada

Critérios de Aceite:
- Dado que acesso Estoque > Consolidado
- Então vejo tabela:
  | Produto | Matriz | Rio | SP | Total |
  |---------|--------|-----|----|-|
  | Tênis Pro | 30 | 20 | 15 | 65 |

- Quando clico em um produto
- Então vejo histórico de movimentação (transferências, vendas, recebimentos)
```

---

## 7. Fluxo de UI (Wireframe ASCII)

### Página: Configurações > Módulos

```
┌────────────────────────────────────┐
│ Configurações de Módulos           │
├────────────────────────────────────┤
│                                    │
│  Storefront (Loja Virtual)         │
│  [Toggle ON]  — Catálogo + Checkout│
│  Máx 200 produtos                  │
│                                    │
│  Inventory (Estoque)               │
│  [Toggle ON]  — Gestão centralizada│
│                                    │
│  CRM (Clientes)                    │
│  [Toggle OFF]                      │
│                                    │
│  WhatsApp Integrado                │
│  [Toggle OFF]                      │
│                                    │
│  Relatórios & Analíticos           │
│  [Toggle OFF]                      │
│                                    │
│  [Salvar Alterações]               │
└────────────────────────────────────┘
```

### Página: Filiais > Listar

```
┌────────────────────────────────────┐
│ Filiais (Multi-tenant)             │
├────────────────────────────────────┤
│                                    │
│  [Nova Filial]                     │
│                                    │
│  FILIAIS                           │
│  ┌──────────────────────────────┐  │
│  │ Matriz                       │  │
│  │ Tipo: Virtual (Principal)    │  │
│  │ URL: loja.com.br             │  │
│  │ Estoque: 450 unidades        │  │
│  │ [Editar] [Excluir]           │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Filial Rio                   │  │
│  │ Tipo: Virtual                │  │
│  │ URL: rio.loja.com.br         │  │
│  │ Estoque: 120 unidades        │  │
│  │ [Editar] [Excluir]           │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Filial São Paulo (Física)    │  │
│  │ Tipo: Physical (sem loja)    │  │
│  │ Estoque: 200 unidades        │  │
│  │ [Editar] [Excluir]           │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

### Página: Inventário > Consolidado

```
┌────────────────────────────────────────────────┐
│ Estoque Consolidado                            │
├────────────────────────────────────────────────┤
│                                                │
│  Filtro: [Categoria ▼] [Filial ▼]             │
│                                                │
│  │ Produto      │ Matriz │ Rio │ SP │ Total │ │
│  │──────────────┼────────┼─────┼────┼───────│ │
│  │ Tênis Pro    │   30   │  20 │ 15 │  65  │ │
│  │ Mochila X    │   50   │  30 │ 25 │ 105  │ │
│  │ Livro Dev    │   15   │   0 │  5 │  20  │ │
│  │ ...          │ ...    │ ... │... │ ...  │ │
│                                                │
│  [Exportar CSV] [Transferência Entre Filiais]│
│                                                │
└────────────────────────────────────────────────┘
```

---

## 8. Impacto Técnico

### 8.1 Serviços Afetados

| Serviço | Mudança | Prioridade |
|---------|---------|-----------|
| `checkout-service` | Adicionar `branch_id` em pedidos; validar visibilidade de filial ao checkout | Alta |
| `catalog-service` | Filtrar produtos por filial (se url de filial virtual) | Alta |
| `inventory-service` (novo ou evolução) | Gerenciar `inventory_reserves`, movimentações, consolidação | Alta |
| `backend-admin` (UI) | Páginas Módulos, Filiais, Estoque Consolidado | Alta |
| `auth-service` | Adicionar claim `branch_id` no JWT; validar acesso por filial | Alta |

### 8.2 Impacto de Dados

- **Migração:** Todos os tenants atuais recebem `primary_branch_id` apontando para uma filial "Matriz" criada automaticamente
- **Backward compatibility:** Queries sem `branch_id` retornam dados da filial primária
- **Índices:** Adicionar índices em `branches(tenant_id)`, `inventory_reserves(branch_id)`

### 8.3 Considerações de Segurança

1. **Cross-tenant leak:** Garantir que API sempre filtra por `tenant_id` explicitamente
2. **Cross-filial leak:** JWT deve conter `branch_id`; rotas devem validar acesso à filial solicitada
3. **Estoque race condition:** Usar `LOCK` em transaction ao reservar estoque

---

## 9. Decisões Abertas (para CEO validar)

### D1: Estoque compartilhado é obrigatório ou opcional?
- **A:** Sim, obrigatório — filial sempre compartilha estoque (mais flexível)
- **B:** Não — filial pode ter estoque isolado (mais seguro, mas menos flexible)
- **Recomendação:** Opção A com flag `share_inventory: bool` por filial para casos edge

### D2: Quantas filiais um tenant Starter pode ter?
- **A:** 1 apenas (matriz, que é a própria filial default)
- **B:** 3 filiais (matriz + 2)
- **C:** Ilimitado, mas módulos (ex: storefront) limitam
- **Recomendação:** Opção B — Starter = 3 filiais max

### D3: Plano é por tenant ou por filial?
- **A:** Único plano para todo tenant (todas filiais compartilham créditos)
- **B:** Plano por filial (cada filial paga separado, mais complexo)
- **Recomendação:** Opção A inicialmente, Opção B no roadmap

### D4: Qual é o modelo de URL para filial virtual?
- **A:** Subdomínio: `rio.loja.com.br`, `sp.loja.com.br`
- **B:** Path: `loja.com.br/rio`, `loja.com.br/sp`
- **C:** Domínio separado: `rio-loja.com.br` (requer compra de domínio)
- **Recomendação:** Opção A (subdomínio) — custo baixo, wildcard DNS suficiente

---

## 10. Roadmap de Implementação

### Sprint 1: Fundação
- [ ] Criar tabelas `branches`, `tenant_modules`, `inventory_reserves`
- [ ] Migração automática: criar `branches.master` para tenants atuais
- [ ] Adicionar middleware de autenticação para validar `branch_id`

### Sprint 2: Configuração de Módulos
- [ ] CRUD de módulos na UI (habilitar/desabilitar)
- [ ] Lógica de roteamento: se storefront=false, retornar 404
- [ ] Testes de isolamento de dados

### Sprint 3: Filiais Virtuais
- [ ] CRUD de filiais na UI
- [ ] Wildcard DNS para subdomínios
- [ ] Rotas do checkout filtradas por branch

### Sprint 4: Estoque Compartilhado
- [ ] CRUD de reservas por filial
- [ ] Dashboard consolidado
- [ ] Transferência de estoque (com aprovação)

---

## 11. Métricas de Sucesso

| Métrica | Target | Período |
|---------|--------|---------|
| Novos tenants (distribuidoras) | 5 até 30 dias | 1 mês |
| Uptake de multi-filial | 30% dos tenants | 3 meses |
| Taxa de retenção | +5 pp vs anterior | 3 meses |
| Receita média por tenant | +R$40 | 3 meses |

---

## 12. Dependências Externas

- **Nenhuma** (somente DB e API internas)
- **Nota:** Wildcard DNS (`*.loja.com.br`) deve estar configurado no Cloudflare/provider

---

## 13. Referências

- ADR: `docs/adr/001-inventory-storemake.md` (estoque centralizado)
- Backlog: StoreMake PLN (distribuidoras) — priorizar após feature flags
- Benchmark: Shopify "Locations" (multi-filial), WooCommerce "Warehouse Manager"
