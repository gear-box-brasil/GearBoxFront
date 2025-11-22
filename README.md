# ⚙️ MechanicMate MVP

## 🚀 Sobre o Projeto
O **MechanicMate MVP** é uma solução moderna e completa para gestão de oficinas mecânicas, desenvolvida com as tecnologias mais atuais do mercado. O sistema oferece uma interface intuitiva e responsiva para controlar todos os aspectos do seu negócio automotivo.

## ✨ Principais Funcionalidades
- **🏠 Dashboard Inteligente:** Visão geral completa com métricas em tempo real.
- **🔧 Gestão de Ordens de Serviço:** Controle completo do fluxo de trabalho.
- **👥 Cadastro de Clientes:** Gerenciamento detalhado de informações dos clientes.
- **🚗 Catálogo de Veículos:** Integração com API FIPE para dados precisos.
- **👨‍💼 Controle de Usuários:** Sistema de permissões para admin e funcionários.
- **🔐 Autenticação Segura:** Sistema robusto de login e controle de acesso.

## 🛠️ Stack Tecnológica

| Categoria | Tecnologia | Detalhes |
| :--- | :--- | :--- |
| **Frontend** | `React 18` + `TypeScript` | Base da aplicação moderna. |
| **Build Tool** | `Vite` | Desenvolvimento ultrarrápido. |
| **Styling** | `TailwindCSS` + `shadcn/ui` | Componentes elegantes e customizáveis. |
| **Roteamento** | `React Router DOM` | Navegação fluida entre páginas. |
| **Formulários** | `React Hook Form` + `Zod` | Gestão e validação robusta de formulários. |
| **Estado** | `TanStack Query` | Gerenciamento otimizado de estado servidor. |
| **API Externa** | `API FIPE` | Para dados de veículos precisos. |
| **Backend** | `AdonisJS` (Preparado) | Estrutura back-end robusta (documentação incluída). |

## 🎨 Design & UX
O projeto foi construído com foco em uma experiência de usuário de alta qualidade:

- Interface moderna e responsiva (Mobile-First).
- Suporte a **Tema Escuro** e **Tema Claro**.
- Componentes acessíveis seguindo padrões [WAI-ARIA](https://www.w3.org/WAI/standards-guidelines/aria/).
- Design system consistente com `shadcn/ui`.
- Animações suaves e microinterações para maior fluidez.

## 📱 Funcionalidades em Destaque

### 🏠 Dashboard
- Métricas em tempo real (ordens ativas, clientes, receita).
- Gráficos e estatísticas visuais.
- Lista de ordens recentes para acompanhamento rápido.
- Indicadores de status coloridos.

### 🔧 Ordens de Serviço
- Status personalizáveis (Ex: `Em Andamento`, `Aguardando`, `Concluído`).
- Busca avançada por cliente, veículo ou serviço.
- Interface *card-based* para fácil visualização do fluxo.

### 🚗 Gestão de Veículos
- Integração completa com **API FIPE**.
- Cadastro automático de marcas, modelos e anos.
- Controle de quilometragem e histórico de serviços.
- Paleta de cores para identificação visual.

### 👥 Clientes
- Cadastro completo com informações de contato.
- Histórico de veículos e ordens por cliente.
- Interface organizada com *badges* informativos.

## ⚙️ Como rodar o front-end

### 1. Pré-requisitos
- Node.js 20+
- bun ou npm (o projeto já traz `package-lock.json`, então usamos `npm` nos exemplos)

### 2. Variáveis de ambiente
Copie o exemplo e defina a URL da API AdonisJS:

```bash
cp .env.example .env
```

Edite o arquivo e configure:

```bash
VITE_API_BASE_URL=http://localhost:3333
```

> Ajuste o host/porta conforme onde o backend estiver rodando.

### 3. Instalação e execução

```bash
npm install
npm run dev
```

O Vite exibirá o link para acesso (por padrão `http://localhost:5173`).

### 4. Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o Vite em modo desenvolvimento |
| `npm run build` | Gera o bundle de produção |
| `npm run preview` | Faz o serve do bundle gerado |
| `npm run lint` | Executa o ESLint |

## 🔌 Integração com a Gear Box API

O front consome a API AdonisJS (pasta `gear-box-api`) via client central (`src/services/gearbox.ts`). Para que as telas mostrem dados reais:

1. Configure o banco do Adonis e rode as migrações.
2. Execute os seeders (`node ace db:seed`). Existem dois seeders principais:
   - `user_seeder` – cria o dono e os mecânicos padrão.
   - `data_seeder` – popula clientes, veículos e ordens para alimentar Dashboard, Ordens, Clientes e Veículos.
3. Inicie a API (`npm run dev` na pasta `gear-box-api`).
4. Garanta que `VITE_API_BASE_URL` aponta para esta instância.

### Credenciais padrão após as seeds

| Papel | E-mail | Senha |
| --- | --- | --- |
| Dono | `dono@gearbox.com` | `senha123` |
| Mecânico | `mec1@gearbox.com` | `senha123` |

> Apenas usuários com papel **dono** acessam o cadastro de usuários e rotas administrativas.

## 📂 Estrutura breve

- `src/contexts/AuthContext.tsx` — autenticação com Adonis (login/logout e persistência do token).
- `src/services/gearbox.ts` — todas as chamadas REST usadas pelo app.
- `src/pages/*` — telas já integradas ao backend (Dashboard, Ordens, Clientes, Veículos, Usuários).
- `src/components/VehicleFormDialog.tsx` — modal que combina FIPE + cadastro via API.

## 🧪 Próximos passos sugeridos
- Implementar os formulários de criação de clientes e ordens (botões hoje estão desabilitados até a API suportar todo o fluxo).
- Adicionar tratamento de expiração de token (logout automático ao receber 401).
- Expandir seeds/testes conforme novos cenários forem necessários para demonstrações.
