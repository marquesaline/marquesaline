---
layout: post
title:  "Entendendo a pasta `config/` em projetos Rails"
description: "Como funciona o diretório config/ no Rails: rotas, ambientes, banco de dados e arquivos essenciais de configuração."
permalink: "/rails-config"
date: 2025-12-04
categories: [Ruby on Rails]
published: false
---

No [primeiro post sobre a estrutura do Rails](/rails-arquivos-e-app) a gente conversou sobre os principais arquivos do projeto e sobre a principal pasta que é a `app/`.

Agora o nosso foco vai ser entender outra parte fundamental na estrutura do Rails que é o diretório `config/`.

E só pra te lembrar, aqui está a estrutura de um projeto em Rails.

![Diretórios de um projeto em Rails](assets/images/diretorios_rails.png)

Vamos lá!

## `config/`

Além do diretório `app/`, outro diretório bem importante é o `config/`, pois é nela que vão está as configurações essenciais da aplicação, como rotas, banco de dados e outras. 

É nesta pasta que você vai encontrar os arquivos que determinam como sua aplicação deve se comportar, quais são as regras e recursos ativados, conexão com o banco e etc. 

Vamos conhecer os principais arquivos e pastas dentro do `config/`

### Arquivos

#### `application.rb`

Este arquivo vai conter a configuração global da aplicação. Geralmente não mexemos muito nele, mais podemos colocar algumas configurações, como time zone, idioma padrão da aplicação

#### `environment.rb`

O arquivo environment é responsável por inicializar a aplicação Rails como um todo, ou seja, basicamente quando a gente roda o servidor, é esse arquivo que é lido pra preparar o ambiente. 

Este é um daqueles arquivos que raramente mexemos.

#### `boot.rb`

Também um daqueles arquivos que a gente raramente mexe. Este arquivo faz parte do processo de _boot`, vulgo inicialização do Rails. 

Ele é responsável por iniciar o ambiente de runtime que o Rails precisa pra funcionar. 

Isso significa que este arquivo é um dos primeiros a serem executados quando iniciamos a aplicação e garante que o Rails seja carregado corretamente. 

#### `database.yml`

É um arquivo essencial pra configurar a conectividade da aplicação com o banco de dados. 

Ele também vai trazer as configurações separadas pra cada ambiente (desenvolvimento, testes e produção).

Inclusive, por padrão o Rails vai criar a aplicação usando o SQLite, mas você pode alterar as configurações pra usar outro banco de dados. 

#### `routes.rb`

Ahh esse arquivo é um dos mais importantes, pois é nele que definimos as rotas da aplicação. Isso quer dizer que é nele que definimos qual controller vai ser chamado quando alguém acessar determinada URL do nosso app. 

#### `credentials.yml.enc`

Este arquivo criptografado serve pra guardar informações sensíveis do app, como API keys, tokens e outros valores sensíveis. 

A chave de criptografia vai está no arquivo `master.key`que também fica na pasta `config/`

#### `cable.yml`

O arquivo `cable.yml` é usado pra configurar o Action Cable, um dos componentes essenciais do Rails. 

O Action Cable é um tema tão importante que merece um post só sobre ele, mas de forma resumida, é a funcionalidade que permite recursos em tempo real, como notificações ou atualizações instantâneas na página.

Com isso, este arquivo é justamente o responsável por fazer a configuração dessa funcionalidade em cada ambiente da aplicação. 

#### `puma.rb`

#### `importmap.rb`

#### `storage.yml`

### Diretórios

#### `environments/`

Existe o arquivo `environment.rb` que acabamos de falar e existe a pasta `/environments/`, são duas coisas diferentes. 

É nesta pasta que ficam as configurações da aplicação pra cada ambiente:

- `development.rb`: configurações da aplicação pra quando estiver rodando localmente
- `test.rb`: a mesma coisa, só que pra ambientes de teste
- `production.rb`: também a mesma coisa, só que pra quando a aplicação estiver em produção

Essas configurações vão permitir que a aplicação se comporte de forma diferente a depender do contexto específico. 

Um exemplo claro é que normalmente em ambiente de desenvolvimento o Rails mostra todos os erros de forma mais detalhada. Isso é essencial pra que a gente consiga entender eventuais erros que aparençam. 

Enquanto em produção, esses erros não são tão detalhados por motivos de segurança. 

Ah, é bom sempre lembrar de configurar certinho essas informações pra evitar usar ambientes errados. 

#### `initializers/`

#### `locales/`



