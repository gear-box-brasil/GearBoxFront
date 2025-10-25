# Configuração do Backend AdonisJS

Este projeto está configurado para se conectar a um backend AdonisJS. Você precisa configurar as seguintes rotas no seu backend:

## Endpoints Necessários

### 1. Login (POST)
```
POST http://localhost:3333/api/auth/login
```

**Body:**
```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta esperada:**
```json
{
  "token": "seu-jwt-token-aqui",
  "user": {
    "id": "uuid-ou-id",
    "email": "usuario@exemplo.com",
    "name": "Nome do Usuário",
    "role": "admin" // ou "funcionario"
  }
}
```

### 2. Criar Usuário (POST) - Apenas Admin
```
POST http://localhost:3333/api/users
```

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "name": "Novo Usuário",
  "email": "novo@exemplo.com",
  "password": "senha123",
  "role": "funcionario" // ou "admin"
}
```

**Resposta esperada:**
```json
{
  "id": "uuid-ou-id",
  "email": "novo@exemplo.com",
  "name": "Novo Usuário",
  "role": "funcionario"
}
```

## Configuração no Frontend

Por padrão, o frontend está configurado para se conectar em `http://localhost:3333`.

Para alterar a URL do backend, edite os seguintes arquivos:

1. **src/contexts/AuthContext.tsx** - linha ~24
2. **src/pages/UserManagement.tsx** - linha ~23

Substitua `http://localhost:3333` pela URL do seu backend.

## Estrutura de Banco de Dados Sugerida

### Tabela: users
```sql
- id (uuid/integer, primary key)
- email (string, unique)
- name (string)
- password (string, hashed)
- role (enum: 'admin', 'funcionario')
- created_at (timestamp)
- updated_at (timestamp)
```

## CORS

Não esqueça de configurar o CORS no seu backend AdonisJS para aceitar requisições do frontend:

```typescript
// config/cors.ts
{
  origin: ['http://localhost:5173', 'http://localhost:8080'],
  credentials: true
}
```

## Fluxo de Autenticação

1. Usuário faz login com email e senha
2. Backend valida credenciais e retorna JWT token + dados do usuário
3. Frontend armazena token e dados no localStorage
4. Token é enviado em todas as requisições subsequentes via header Authorization
5. Backend valida o token e retorna os dados solicitados

## Segurança

- **Sempre** use HTTPS em produção
- Armazene senhas com hash (bcrypt)
- Valide tokens JWT no backend
- Implemente refresh tokens para melhor segurança
- Rate limiting para prevenir ataques de força bruta
