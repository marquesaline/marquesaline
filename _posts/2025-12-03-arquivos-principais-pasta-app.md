---
layout: post
title:  "Entendendo os arquivos principais e a pasta app/ no Rails"
description: "Uma explicação simples e prática dos principais arquivos e do diretório app/ em um projeto Rails."
permalink: "/rails-arquivos-e-app"
date: 2025-12-03
categories: [Rails]
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

É o diretório mais importante de uma aplicação em Rails. É nesta pasta que você provavelmente mais vai mexer, pois é o local onde está a lógica central da aplicação. 

Além disso, ela é organizada seguindo o padrão de design MVC (Model-View-Controller).

OBS: Se você não conhece esse padrão, não se preocupe, vou falar mais sobre ele em outro post.

Bom, seguindo esse padrão, você verá as 3 principais pastas da aplicação: `models`, `views` e `controllers`.

- `models/`: aqui ficam os arquivos que representam as “entidades” da aplicação, como por exemplo, usuário, produto, pedido, etc. São nos arquivos desta pasta que vamos colocar tudo que está ligado aos dados e às regras de negócio que envolvem esses dados.
- `controllers/`: é onde ficam os arquivos responsáveis por receber as requisições e decidir o que fazer com elas, ou seja, vão chamar os models, definir qual view deve ser mostrada em resposta a requisição ou qual dado deve ser retornado. Então, os controllers vão ser a "ponte" entre o que chega (requisição) e o que sai (resposta).
- `views/`: nesta pasta ficam os arquivos responsáveis por montar as interfaces que serão exibidas pra o usuário. Em resumo, vão ficar os arquivos HTML com ERB, que basicamente é a forma do Rails misturar Ruby dentro do HTML. 

Além dessas 3 pastas principais, existem outras pastas dentro de app que também são importantes no dia a dia:

- `helpers/`: geralmente aqui ficam os arquivos com as funções que ajudam a deixar o código das views mais limpo. São métodos pequenos que a gente pode reaproveitar em vários lugares quando precisamos montar alguma parte da interface ou manipular algum dado antes de exibir pra o usuário.
- `assets/`: essa pasta, assim como na maioria dos frameworks, guarda os arquivos de front-end como imagens, arquivos CSS e scripts de JS
- `javascript`: em projetos Rails mais atuais esta pasta tem aparecido cada vez mais. É nela que ficam os arquivos de JS modernos, como controllers do Stimulus. 
- `jobs/`: aqui ficam as tarefas que precisam ser rodadas de forma assíncrona, ou seja, meio que "em segundo plano", como um envio de email, processamento ou atualização de dados, etc. 
- `mailers/`: nesta pasta vão está as classes responsáveis por enviar emails. Geralmente cada arquivo vai representar um tipo de email que sua aplicação vai enviar. Essa é a forma do Rails facilitar todo o processo de montar e enviar essas mensagens. 

Com isso, os arquivos e o diretório `app/` já estão mais claros. Em outro post vou falar sobre outras pastas importantes do Rails, como `config/`, `db/`, `public/` e `bin/`.