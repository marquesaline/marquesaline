---
layout: post
title: "Controllers no Rails: como funcionam e qual o papel no MVC"
description: "Entenda o papel do controller no Rails, como ele recebe requisições HTTP e decide qual resposta retornar dentro do padrão MVC."
permalink: "/controllers-rails"
date: 2026-05-02
categories: [Ruby on Rails]
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

## Estrutura de um controller

No Rails, um controller nada mais é do que uma classe Ruby que herda de `ApplicationController`.

```ruby
class PostsController < ApplicationController
end
```

Na prática, todos os controllers compartilham comportamentos comuns definidos nessa classe base.

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

Mas criar o controller é só o começo, a parte importante mesmo são as actions.

Uma action no controller do Rails é um método público que corresponde a uma requisição HTTP específica, como `GET`, `POST`, etc. 

Isso quer dizer que quando uma requisição é feita a uma rota do app, isso vai levar pra um action de um determinado controller. E essa action vai orquestrar o que deve ser feito com essa requisição e retornar a resposta. 

No Rails, temos 7 actions básicas:

- `index`: responsável por listar vários registros
- `show`: responsável por exibir um único registro
- `new`: normalmente usada para renderizar o formulário de criação de um registro
- `create`: responsável por criar um novo registro
- `edit`: normalmente usada para renderizar o formulário de edição de um registro
- `update`: responsável por atualizar um registro existente
- `destroy`: responsável por remover um registro

Essas actions representam as ações básicas do CRUD (Create, Read, Update e Delete) no Rails.

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

Quando o método `index` é chamado, o Rails tenta renderizar automaticamente a view `index.html.erb`, que fica dentro de `views/posts/`.

O mesmo acontece nos demais métodos que não têm o `render` ou o `redirect_to` explícitos.

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

- `GET /posts` => `index`
- `GET /posts/:id` => `show`
- `POST /posts` => `create`

E assim vai seguir pra o update e delete...

Ou seja, existe uma conexão direta entre as rotas, as requisições HTTP e as actions do controller. Quando uma requisição chega na aplicação, o Rails usa a rota para descobrir qual controller e qual action devem ser executados.

Mas isso só funciona de forma automática se a gente mantiver o padrão de nomes conforme a convenção do Rails determina, beleza?!

Se quiser saber mais detalhes sobre o resources, vale dá uma olhada na <a href="https://guides.rubyonrails.org/routing.html#resource-routing-the-rails-default" target="_blank" rel="noopener">documentação do Rails</a> sobre isso.

## Respostas do controller

A gente já entendeu que o controller vai receber uma requisição e orquestrar o que vai ser feito com ela. 

Então, depois de processar, o controller precisa retornar uma resposta. 

Na maioria dos casos, essa resposta pode vir de 2 formas:

- renderizando uma view ou um `json` com `render`
- redirecionando o usuário com `redirect_to`

Agora vamos entender um pouquinho como funciona a renderização e redirecionamento no Rails. 

### `render`

O `render` é a forma mais comum de retornar uma resposta no controller.

Quando usamos `render`, estamos dizendo ao Rails qual conteúdo deve ser enviado de volta para o usuário.

Na maioria dos casos, esse conteúdo é uma view.

```ruby
def show
  @post = Post.find(params[:id])
  render :show
end
```

Nesse exemplo, o Rails vai renderizar a view `show.html.erb` e enviar esse conteúdo como resposta, que será um HTML.

Repare que usamos `render :show`.

O `:show` é um símbolo em Ruby que representa o nome da view que queremos renderizar.

Não estamos chamando a action `show` novamente, mas sim dizendo ao Rails qual view deve ser exibida.

Por convenção, o Rails entende que `render :show` significa:

```text
app/views/posts/show.html.erb
```

O nome passado no render corresponde diretamente ao nome do arquivo da view.

Por isso também é comum vermos:

```ruby
render :new
render :edit
```

Sempre indicando qual template deve ser usado como resposta.

Além do uso mais comum, o `render` também permite outras formas de especificar o que deve ser retornado.

Por exemplo, é possível renderizar uma view de outro controller:

```ruby
render 'admin/posts/index'
```

Nesse caso, o Rails vai buscar a view em:

```text
app/views/admin/posts/index.html.erb
```

Também podemos passar opções adicionais, como o status da resposta:

```ruby
render :new, status: :unprocessable_entity
```

Ou até retornar JSON:

```ruby
render json: @post
```

O render é bem flexível: permite definir não só qual conteúdo será retornado, mas também como essa resposta deve ser enviada.

Mas na maioria das vezes nem precisamos chamar o render explicitamente, porque o Rails já faz isso automaticamente quando o nome da action corresponde ao nome da view.

Lembra o que comentei que o Rails prioriza muito a convenção? Então, o `render` é um ótimo exemplo, por isso que muitas vezes você nem vê o `render` no código.

Por exemplo, na action `index`:

```ruby
def index
  @posts = Post.all
end
```

O Rails já entende que deve renderizar `index.html.erb`.

### `redirect_to`

O `redirect_to` é utilizado quando queremos redirecionar o usuário para outra rota.

Enquanto o `render` apenas retorna um conteúdo como resposta, o `redirect_to` faz com que o navegador realize uma nova requisição.

```ruby
def create
  @post = Post.new(post_params)

  if @post.save
    redirect_to @post
  else
    render :new, status: :unprocessable_entity
  end
end
```

Aqui, quando o post é criado com sucesso, o usuário é redirecionado para a página do post.

Na prática, ao invés de simplesmente renderizar uma view, o Rails envia uma resposta informando ao navegador que ele deve acessar outra URL.

Isso faz com que uma nova requisição seja feita para a action correspondente, que nesse caso é a action `show`.

E aqui entra novamente a convenção do Rails.

Quando usamos `redirect_to @post`, o Rails entende que deve redirecionar para a rota daquele recurso, que segue o padrão `/posts/:id`.

Ele sabe que deve chamar a action `show` do `PostsController`, sem que a gente precise escrever isso explicitamente.

Assim como no `render`, também podemos usar diferentes formas de escrever o `redirect_to`.

Uma forma comum é passar o próprio objeto:

```ruby
redirect_to @post
```

Aqui, o Rails usa as rotas definidas (como `resources :posts`) para descobrir automaticamente qual URL deve ser gerada.

Além disso, também é possível passar uma URL diretamente:

```ruby
redirect_to "/posts"
```

Ou até para um site externo:

```ruby
redirect_to "https://google.com"
```

Em todos esses casos, o `redirect_to` sempre indica para qual rota o navegador deve ir na próxima requisição, beleza?!

Mas tem um detalhe: em alguns casos, precisamos executar uma lógica antes de chegar na action principal.

É aí que entra o `before_action`.

## `before_action`

Se você observar o exemplo anterior, vai perceber que em várias actions estamos repetindo o mesmo código para buscar o post:

```ruby
@post = Post.find(params[:id])
```

Essa repetição aparece nas actions show, edit, update e destroy.

Para evitar esse tipo de duplicação, o Rails oferece o before_action.

O `before_action` permite executar um método antes de determinadas actions do controller.

Por exemplo, podemos extrair essa lógica para um método separado:

```ruby
before_action :set_post, only: [:show, :edit, :update, :destroy]

def set_post
  @post = Post.find(params[:id])
end
```

Sempre que uma dessas actions for chamada, o método set_post será executado antes.

Isso garante que o `@post` já vai estar disponível dentro da action, sem precisar repetir o código em cada uma delas.

Também é possível controlar em quais actions o `before_action` será executado usando:

- `only`: define em quais actions ele deve rodar
- `except`: define em quais actions ele não deve rodar

Por exemplo:

```ruby
before_action :set_post, except: [:index, :new, :create]
```

Ou seja, o before_action ajuda a organizar melhor o controller, evitando repetição e deixando o código mais claro.

## Params

Ao fazer uma requisição a uma determinada action, também é possível enviar informações adicionais, essas informações são chamadas de parâmetros. 

É através dos parâmetros que conseguimos personalizar, passar dados, etc. pro servidor.

Então, toda vez que você preenche um formulário, as informações que preencheu são enviadas via parâmetros. 

No Rails, esses dados ficam disponíveis através de `params`, que é um método disponível dentro do controller.

Esse método retorna um objeto do tipo `ActionController::Parameters`, que armazena os dados em uma estrutura de chave e valor, de forma parecida com um hash.

Se você não está familiarizado com `hashes`, é só dar uma olhadinha nesse [post](/ruby-hashes).

Existem alguns tipos de parâmetros, vamos conversar sobre isso.

### Query params

Esses são os parâmetros de consulta (query params). Eles costumam ser usados quando queremos filtrar, ordenar ou paginar informações.

Eles aparecem na URL depois do `?`. Tenho certeza de que você já se deparou com algum deles na internet.

```text
/posts?category=music
/posts?max_price=1000
/posts?page=2
```

Esse tipo de parâmetro pode ser acessado na action através do objeto `params`:

```ruby
def index
  category = params[:category]
  max_price = params[:max_price]
  page = params[:page]
end
```

Então, no exemplo `/posts?category=music`, o valor de `params[:category]` será `"music"`.

E uma observação importante é que query params sempre chegam como `string`.

Isso significa que, mesmo quando o valor parece ser um número ou um booleano, o Rails ainda vai considerar um texto. Então fique atento com as conversões quando for necessário. 

### Route params

Além dos query params, também existem os parâmetros de rota (route params). Eles aparecem diretamente na URL e normalmente são usados para acessar um recurso específico.

Imagine que você queira acessar um post utilizando o `id` dele:

```text
/posts/5
```
Nesse caso, o `5` é o parâmetro da rota.

Isso acontece porque a rota foi definida para esperar um valor nesse trecho da URL:

```ruby
get '/posts/:id', to: 'posts#show'
```

OBS: se você tiver usando o `resources` que falei anteriormente, não precisa se preocupar, porque ele cria essa rota automaticamente. 

O `:id` funciona como uma variável dinâmica da rota. Então, quando alguém acessa `/posts/5`, o Rails entende que o valor de `id` é `5`.

Dentro da action, esse valor pode ser acessado através de:

```ruby
def show
  @post = Post.find(params[:id])
end
```

Nesse exemplo, `params[:id]` terá o valor `"5"`.

Inclusive, esse tipo de parâmetro é muito usado em todas as actions que precisam acessar um recurso específico, como `edit`, `update` e `destroy`.

### Form params

Os form params são os parâmetros enviados quando um formulário é submetido. Toda vez que alguém preenche um formulário e clica no botão, os valores preenchidos chegam no controller através de parâmetros.

Imagine, por exemplo, um formulário para criar um post com os campos `title` e `content`. Quando esse formulário for enviado, os dados podem chegar no controller mais ou menos assim:


```ruby 
params = {
  post: {
    title: "Meu primeiro post",
    content: "Conteúdo do post"
  }
}
```

Com isso, conseguimos acessar esses valores através de:

```ruby
params[:post][:title]
params[:post][:content]
```

Inclusive, é por isso que no exemplo anterior da action `create` usamos:

```ruby
Post.new(post_params)
```

Porque o Rails agrupa os campos do formulário dentro de uma chave principal, que nesse caso é `post`.

Esse tipo de parâmetro vai ser muito usado no `create` (POST) e no `update` (PATCH/PUT), pois são justamente as actions que recebem dados do usuário. 

## O que deve (e não deve) estar no controller

Mas uma coisa que muita gente fica em dúvida no começo é: o que realmente deveria ficar dentro de um controller?

Como vimos ao longo do post, o controller é responsável por receber a requisição, organizar o fluxo e retornar uma resposta.

O papel dele é muito mais de orquestração do que de execução.

Na prática, o controller deve:

- receber e tratar parâmetros
- chamar outras partes da aplicação
- definir qual resposta será retornada (`render` ou `redirect_to`)

Por outro lado, o controller não deve concentrar lógica de negócio complexa.

Por exemplo, imagine um fluxo que envolve múltiplas etapas, validações ou integrações com serviços externos.

Colocar tudo isso dentro de uma action pode funcionar no começo, mas tende a deixar o código difícil de manter e testar.

Nesses casos, é comum extrair essa lógica para outras partes da aplicação, como service objects.

Se quiser entender melhor como fazer isso na prática, dá uma olhadinha nesse [post sobre service objects](/services-objects-rails).

No fim das contas, a ideia é manter o controller simples e focado na sua responsabilidade principal: lidar com requisições e respostas.

Bom, espero que tenha conseguido te ajudar a entender um pouco mais sobre o papel do controller.

Até a próxima!