---
layout: post
title: "Entendendo Controllers no Rails"
description: "Entenda como funcionam os models no Rails e aprenda as operações CRUD básicas com ActiveRecord: create, find, update e destroy."
permalink: "/controllers-rails"
date: 2026-03-16
categories: [Ruby on Rails]
published: false
---

Hoje vamos conversar sobre o Controller. 

No Rails, o controller tem um papel essencial dentro da estrutura MVC. Ele é responsável por receber as requisições da aplicação e determinar qual resposta será retornada.

Se quiser mais detalhes sobre o MVC, dá uma olhadinha nesse [post](/mvc-rails).

## O que é o controller?

Pensando de forma prática, o controller é a camada que recebe uma requisição HTTP e decide o que fazer com ela.

Quando alguém acessa uma página ou envia um formulário, essa requisição chega até um controller. A partir daí, ele pode:

- buscar dados no model
- executar alguma lógica necessária
- retornar uma resposta, geralmente renderizando uma view ou redirecionando o usuário

Ou seja, o controller funciona como um intermediário entre o que acontece na aplicação e a resposta que será enviada para quem fez a requisição.

Agora que já entendemos o papel do controller, vamos ver como ele é definido no Rails.

## Estrutura de um controller

No Rails, um controller nada mais é do que uma classe Ruby que herda de `ApplicationController`.

```ruby
class PostsController < ApplicationController
end
```

Isso significa que todos os controllers compartilham comportamentos comuns definidos nessa classe base.

Além disso, o `ApplicationController` herda de `ActionController::Base`, que é responsável por fornecer toda a infraestrutura necessária para lidar com requisições HTTP.

Na prática, isso permite que os controllers tenham acesso a métodos como `params`, `render`, `redirect_to` e outros recursos do Rails que vamos conversar mais pra frente.

## Como criar um controller

Pra criar um controller você pode usar o comando:

```bash
rails generate controller NomeDoController
```

Esse comando vai gerar o controller na pasta `app/controllers`.

Os controllers seguem algumas convenções importantes:

- o nome do arquivo deve corresponder ao nome da classe (`posts_controller.rb`)
- o nome da classe deve estar no plural (`PostsController`)

Essas convenções permitem que o Rails consiga mapear automaticamente as rotas para os controllers, principalmente quando a gente usa o `resources`.

É possível usar nomes diferentes? Sim.

Mas, nesse caso, será necessário configurar as rotas manualmente. E não tem problema, beleza?! Vez ou outra a gente precisa fazer isso. 

## Actions

Agora que a gente já sabe criar o controller, temos que entender as funcionalidades que podemos implementar. 

Uma action no controller do Rails é um método público do controller que validar com uma requisição HTTP em específico, ou seja, `GET`, `POST`, etc. 

Isso quer dizer que quando uma requisição é feita a uma rota do app, isso vai levar pra um action de um determinado controller. E essa action vai orquestrar o que deve ser feito com essa requisição e retornar a resposta. 

No Rails, temos 7 actions básicos:

- `index`: responsável por listar vários registros
- `show`: responsável por exibir um único registro
- `new`: normalmente usada para renderizar o formulário de criação de um registro
- `create`: responsável por criar um novo registro
- `edit`: normalmente usada para renderizar o formulário de edição de um registro
- `update`: responsável por atualizar um registro existente
- `destroy`: responsável por remover um registro

Esses actions representam as ações básicas do CRUD (Create, Read, Update e Delete) no Rails.

Deixa eu te mostrar um exemplo:

```ruby
class PostsController < ApplicationController
  def index
    @posts = Post.all
  end

  def show
    @post = Post.find(params[:id])
  end

  def new
    @post = Post.new
  end

  def create
    @post = Post.new(post_params)

    if @post.save
      redirect_to @post
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @post = Post.find(params[:id])
  end

  def update
    @post = Post.find(params[:id])

    if @post.update(post_params)
      redirect_to @post
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @post = Post.find(params[:id])
    @post.destroy

    redirect_to posts_path
  end

  private

  def post_params
    params.require(:post).permit(:title, :content)
  end
end
```

Como essas actions seguem convenções do Rails, algumas coisas já acontecem automaticamente.

Por exemplo, nem sempre precisamos deixar explícito qual view deve ser renderizada, porque o Rails já conecta o nome da action com o nome do arquivo dentro da pasta `views/`.

Isso significa que, quando o método `index` é chamado, o Rails tenta renderizar automaticamente a view `index.html.erb`, que fica dentro de `views/posts/`.

O mesmo acontece nos demais métodos que não tem o `render` ou o `redirect_to` explícitos.

E não é por acaso que essas 7 actions aparecem com tanta frequência.

No Rails, elas seguem a **convenção REST**, que é uma forma bastante comum de organizar os recursos em aplicações web.

No exemplo acima, estamos trabalhando com o exemplo de `posts`.

Por isso, faz sentido existir uma action para listar posts (`index`), exibir um post específico (`show`), criar (`create`), atualizar (`update`) e remover (`destroy`).

Inclusive, quando usamos uma rota como:

```ruby
resources :posts
```

O Rails já entende automaticamente que o `PostsController` deve ter essas actions.

Isso quer dizer que todas as rotas do CRUD já serão criadas, como:

- `GET /posts` => `index
- `GET /posts/:id` => `show`
- `POST /posts` => `create`

E assim vai seguir pra o update e delete...

Mas isso só funciona de forma automática se a gente mantiver o padrão de nomes conforme a convenção do Rails determina, beleza?!

Se quiser saber mais detalhes sobre o resources, vale dá uma olhada na <a href="https://guides.rubyonrails.org/routing.html#resource-routing-the-rails-default" target="_blanket">documentação do Rails</a> sobre isso.


## Params










