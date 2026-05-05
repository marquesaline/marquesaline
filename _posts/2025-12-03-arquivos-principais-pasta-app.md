---
layout: post
title:  "Entendendo os arquivos principais e a pasta app/ no Rails"
description: "Uma explicação simples e prática dos principais arquivos e do diretório app/ em um projeto Rails."
permalink: "/rails-arquivos-e-app"
date: 2025-12-03
categories: [Ruby on Rails]
---

Se você já criou um projeto em Rails sabe que o framework traz uma série de arquivos e diretórios que são essenciais para o funcionamento da aplicação.

Essas pastas e arquivos seguem uma estrutura padrão pensada para organizar a aplicação e facilitar o uso do MVC (Model-View-Controller), que é o padrão adotado pelo Rails.

Então hoje quero te ajudar a entender melhor cada um dos diretórios, ou pelo menos os principais.

![Diretórios de um projeto em Rails](assets/images/diretorios_rails.webp)

Olhando assim, dá para ver "de cara" que são muitas pastas e arquivos. Mas não se assuste, a gente vai entender melhor. E também não tente decorar tudo isso, prometo que a medida que você for usando o framework, vai ficando mais fácil saber onde encontrar cada coisa.

Vamos começar com os arquivos e depois vamos para as pastas.

## Arquivos

### Gemfile e Gemfile.lock

Esses arquivos são extremamente importantes em qualquer projeto em Ruby, eles são responsáveis por especificarem as dependências (gems) utilizadas no seu projeto.

Eles vão descrever os nomes das bibliotecas e a versão utilizada.

Sempre que quiser instalar uma biblioteca, você pode escrever manualmente a gem no `Gemfile` e o `Gemfile.lock` será atualizado automaticamente com todas as dependências utilizadas, inclusive as dependências das dependências.

### Rakefile

Antes de entendermos o Rakefile, é importante falar sobre o Rake.

Rake é um executor de tarefas para aplicações Ruby e Rails. Pensa nele como um automatizador de comandos repetitivos que você usaria no dia a dia.

Sabe quando você precisa rodar as migrations do banco de dados? Ou popular o banco com dados de teste? Ou ver todas as rotas da aplicação? Tudo isso são tasks do Rake.

Alguns exemplos de tasks que você vai usar bastante:

```bash
rails db:migrate    # Roda as migrations
rails db:seed       # Popula o banco com dados
rails routes        # Lista todas as rotas
rails test          # Executa os testes
```

E o Rakefile? Ele é o arquivo que carrega todas essas tasks automáticas do Rails. Quando você cria um projeto Rails, ele já vem pronto e você raramente vai precisar mexer nele.

### config.ru

Esse arquivo é responsável por configurar o Rack.

Mas o que é Rack?

Rack é uma interface que conecta o Rails ao servidor web. Pensa assim: quando você roda `rails server`, o servidor precisa "conversar" com a sua aplicação Rails, certo? O Rack é justamente essa ponte entre os dois.

Ele funciona como um protocolo padrão que permite que diferentes frameworks Ruby (como Rails, Sinatra) funcionem com diferentes servidores web (como Puma, Unicorn) sem precisar de configuração específica para cada combinação.

O arquivo `config.ru` é bem simples, basicamente carrega a aplicação e manda ela rodar:

```ruby
require_relative "config/environment"
run Rails.application
```

Você raramente vai precisar mexer nesse arquivo, mas é bom saber que ele existe e qual é o papel dele.

Além desses, você vai encontrar arquivos como `.gitignore` (define o que não vai pro Git), `.ruby-version` (especifica a versão do Ruby do projeto) e `README.md` (documentação básica do projeto).

Agora que os arquivos principais do projeto já ficaram claros, é hora de olhar para a pasta onde a maior parte do trabalho realmente acontece: o diretório `app/`.

## `app/`

É o diretório mais importante de uma aplicação Rails e é aqui que você vai passar a maior parte do tempo.

Ela é organizada seguindo o padrão MVC, então você vai encontrar três pastas centrais: `models`, `views` e `controllers`.

Pra entender como essas três pastas se encaixam, pensa no que acontece quando alguém acessa uma página da aplicação.

Quando o usuário faz uma requisição, seja clicando num link ou digitando uma URL, o **controller** é o primeiro a receber. Ele analisa o que foi pedido e decide o que fazer. Se precisar de dados, chama o model.

O **model** é quem sabe falar com o banco de dados. Ele busca o dado, aplica as regras de negócio que cabem a ele e devolve pro controller.

O controller pega esse dado e passa pra **view**. A view monta o HTML que o usuário vai ver com o que recebeu.

No fundo é isso: a requisição entra pelo controller, os dados vêm do model, a resposta sai pela view.

Se quiser entender mais sobre esse padrão, escrevi um post específico sobre o [MVC no Rails](/mvc-rails).

Além das três pastas principais, tem outras que você vai encontrar com frequência conforme a aplicação cresce. A `helpers/` guarda métodos pequenos que ajudam a deixar o código das views mais limpo. A `jobs/` é onde ficam as tarefas que precisam rodar em segundo plano, como processamento de dados ou envio de email de forma assíncrona. E a `mailers/` é onde o Rails organiza as classes responsáveis por montar e enviar esses emails.

Em outro post vou falar sobre outras pastas importantes do Rails, como `config/`, `db/`, `public/` e `bin/`. E se quiser explorar mais, o [Rails Guides](https://guides.rubyonrails.org) tem bastante conteúdo sobre cada parte da estrutura.
