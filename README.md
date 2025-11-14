# Nexus API 🚀

![Nexus Banner](https://i.imgur.com/sC9A6A5.png)

**Nexus** é o backend de um sistema de suporte ao cliente omnichannel, projetado para centralizar a comunicação de diversas plataformas (como WhatsApp e Telegram) em uma única interface. O nome "Nexus" reflete seu papel como o ponto central de conexão entre a empresa e seus clientes.

Esta API foi construída com foco em escalabilidade, resiliência e uma excelente experiência para o desenvolvedor, utilizando uma arquitetura moderna baseada em filas de processamento para garantir que nenhuma mensagem seja perdida e que a aplicação permaneça responsiva sob qualquer carga.

---

## ✨ Principais Funcionalidades

*   **Central de Mensagens:** Recebe, processa e armazena mensagens de múltiplos canais.
*   **Gerenciamento de Tickets:** Agrupa conversas em tickets que podem ser atribuídos, priorizados e resolvidos.
*   **Processamento Assíncrono:** Utiliza **Redis** e **BullMQ** para enfileirar tarefas pesadas (como o envio de mensagens para APIs externas), garantindo respostas rápidas e resiliência contra falhas.
*   **Notificações em Tempo Real:** Emprega **WebSockets (Socket.IO)** para notificar o frontend instantaneamente sobre novos tickets, mensagens e atualizações de status.
*   **Arquitetura Escalável:** Construído em camadas (rotas, serviços, repositórios) para facilitar a manutenção e a adição de novas funcionalidades.

---

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído com as seguintes tecnologias:

*   **[Node.js](https://nodejs.org/)**: Ambiente de execução JavaScript.
*   **[TypeScript](https://www.typescriptlang.org/)**: Para um código mais robusto e auto-documentado.
*   **[Express.js](https://expressjs.com/)**: Framework para a construção da API REST.
*   **[Redis](https://redis.io/)**: Banco de dados em memória, utilizado para o sistema de filas.
*   **[BullMQ](https://bullmq.io/)**: Sistema de filas robusto e de alta performance para Node.js.
*   **[Socket.IO](https://socket.io/)**: Para comunicação bidirecional e em tempo real.
*   **[Prisma](https://www.prisma.io/)** (ou seu ORM/Banco de Dados preferido): Para interação com o banco de dados SQL/NoSQL.
*   **[Docker](https://www.docker.com/)**: Para criar um ambiente de desenvolvimento consistente e facilitar o deploy.

---

## ⚙️ Configuração do Ambiente de Desenvolvimento

Siga os passos abaixo para executar o projeto localmente.

### Pré-requisitos

*   [Node.js](https://nodejs.org/) (v18.x ou superior)
*   [Docker](https://www.docker.com/get-started) e Docker Compose
*   Um gerenciador de pacotes como [NPM](https://www.npmjs.com/) ou [Yarn](https://yarnpkg.com/)

### Passos para Instalação

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/nexus.git
    cd nexus
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```
    *ou*
    ```bash
    yarn install
    ```

3.  **Configure as variáveis de ambiente:**
    *   Renomeie o arquivo `.env.example` para `.env`.
    *   Preencha as variáveis com as suas credenciais (chaves de API, conexão com o banco, etc.).
    ```env
    # Configurações do Servidor
    PORT=3001

    # Conexão com o Banco de Dados (Exemplo com PostgreSQL)
    DATABASE_URL="postgresql://user:password@localhost:5432/nexusdb?schema=public"

    # Conexão com o Redis
    REDIS_HOST=localhost
    REDIS_PORT=6379

    # Chaves de API para serviços externos
    WHATSAPP_API_KEY="sua-chave-aqui"
    TELEGRAM_BOT_TOKEN="seu-token-aqui"
    ```

4.  **Inicie os serviços com Docker Compose:**
    *   Este comando irá iniciar os contêineres do banco de dados (ex: PostgreSQL) e do Redis.
    ```bash
    docker-compose up -d
    ```

5.  **Execute as migrações do banco de dados:**
    *   (Se estiver usando Prisma)
    ```bash
    npx prisma migrate dev
    ```

6.  **Inicie a aplicação:**
    *   O comando abaixo iniciará o servidor da API e o worker que processa as filas.
    ```bash
    npm run dev
    ```

7.  A API estará disponível em `http://localhost:3001`.

---

## 🗂️ Estrutura do Projeto

O projeto segue uma arquitetura em camadas para promover a separação de responsabilidades:

