---
layout: post
title: "Entendendo Models no Rails: CRUD Básico com ActiveRecord"
description: "Entenda como funcionam os models no Rails e aprenda as operações CRUD básicas com ActiveRecord: create, find, update e destroy."
permalink: "/models-crud-rails"
date: 2026-01-30
categories: [Ruby on Rails]
---

Se você já conhece o Rails, sabe que ele segue o padrão MVC, onde o Model é quem cuida dos dados. É ali que ficam as validações, as regras de negócio e toda parte de comunicação com banco de dados.

Pra mais detalhes, escrevi um post sobre o [MVC e como funciona o Rails](/mvc-rails).

No dia a dia, trabalhar com models é basicamente fazer quatro coisas o tempo todo: criar, buscar, atualizar e excluir registros. Isso vale pra qualquer aplicação, pequena ou grande.

Essas quatro operações formam o famoso CRUD: Create, Read, Update e Delete. E o ActiveRecord facilita bastante esse trabalho.

O ActiveRecord, de maneira geral, é a gem responsável por fazer essa ponte entre o Rails e o banco de dados. Ele facilita nosso trabalho com as tabelas do banco, de forma que elas se tornam objetos Ruby. Então, no dia a dia, a gente não precisa escrever em SQL, o ActiveRecord vai fazer isso pra gente. 

Já te adianto que por trás disso existe um padrão de arquitetura muito mais amplo. Se você quiser entender melhor esse conceito, escrevi um post específico sobre o [padrão Active Record](/padrao-active-record)

Hoje, a ideia é olhar pra o ActiveRecord de forma mais prática pra entender como usar os principais métodos de CRUD. 

OBS: vou mostrar alguns exemplos aqui, se você quiser testar localmente, é necessário ter o Ruby e o ActiveRecord ou ter um projeto em Rails configurado.

OBS²: embora nosso foco acabe sendo o Rails, saiba que dá pra usar o ActiveRecord sem ele.

Pra que os exemplos de CRUD façam sentido, a gente precisa de um model e de uma tabela no banco. 

## Criando um model

No Rails, isso é feito de forma bem simples usando o generator de model:

```bash
rails generate model NomeDoModel atributo:tipo
```

O nome do model deve começar com letra maiúscula e, em seguida, você informa quais atributos ele vai ter e o tipo de cada um. O Rails cuida de criar o arquivo do model e a migration referente a esse model. 

Pra os exemplos deste post, vou usar o seguinte model:

```bash
rails generate model User name:string email:string age:integer active:boolean
```

Esse comando cria o arquivo `app/models/user.rb` e também uma migration responsável por criar a tabela users no banco de dados.

Pra que a tabela exista de fato, é só rodar no terminal: `rails db:migrate`

Pronto, feito isso, estamos prontos pra começar o CRUD.

Antes disso, um detalhe importante: se você quiser testar os exemplos localmente, o lugar mais simples pra fazer isso é o **Rails console**.  

Ele carrega toda a aplicação e permite executar código diretamente, sem precisar criar controller, rota ou view, beleza?!

## Create

Uma vez que o model existe, uma das primeiras coisas que precisamos fazer é criar os dados. 
E aí já te adianto uma coisa, a lógica de criação é sempre a mesma, não importa o tipo de aplicação que você tá fazendo. 

No Rails, o ActiveRecord oferece algumas formas de fazer isso, mas duas aparecem o tempo todo: `Model.new` + `save` e `create`.

Vamos entender melhor a diferença entre essas formas. 

Usando o `new` e o `save`, a gente cria assim:

```ruby
user = User.new(
  name: "Ana",
  email: "ana@email.com",
  age: 28,
  active: true
)

user.save
```

Quando a gente usa o `new` precisamos usar o `save` depois pra garantir que o dado persista no banco. O `save` retorna `true` ou `false`. Então se o dado não for salvo por algum motivo, o código não quebra. 

Essa primeira forma é bem útil pra garantir algum ajuste antes do dado ser efetivamente salvo.

Já o `create` usamos assim:

```ruby
User.create(
  name: "Ana",
  email: "ana@email.com",
  age: 28,
  active: true
)
```

Perceba que não precisamos de um comando específico pra salvar, porque ele já faz tudo, cria o objeto e salva no banco.

Mas mesmo já fazendo tudo, se algo der errado, o comportamento é o mesmo, ele não salva e não quebra o código.

## Read

Uma vez criado os dados, podemos buscar esses dados no banco, e como sempre, o ActiveRecord facilita muito isso pra gente. 

Pra buscar esses dados existem algumas formas. Vamos lá falar sobre elas. 

### `find`

O find é usado quando a gente sabe o ID do dado que queremos buscar. 

```ruby
User.find(1)
```

Se existir um usuário com esse ID, ele é retornado normalmente. Se não existir, o `find` levanta uma exceção.

### `find_by`

Agora quando você quer buscar com base em outro atributo, o `find_by` tende a ser o mais usado: 

```ruby
User.find_by(email: "ana@email.com")
```

Se encontrar o registro, ele retorna o objeto. Se não encontrar, retorna `nil`.

Ele sempre vai retornar o primeiro dado que atenda a condição.

O `find_by` é mais comum de ser usado por permitir buscas mais flexíveis e evitar quebrar o código se não encontrar. 

### `where`

O `where` permite buscar mais de um dado usando a condição:

```ruby
User.where(active: true)
```

Nesse caso, o retorno é uma coleção (vulgo array), ainda que não tenha nenhum dado ou só tenha um. 

Também é possível usar condições mais específicas, como comparações:

```ruby
User.where("age > ?", 18)
```

E além desses, ainda tem alguns métodos bem comuns de serem usados no dia a dia: 

```ruby
User.all
User.first
User.last
```

Os nomes desses métodos são bem descritivos, né? Eles fazem exatamente o que sugere e você vai ver bastante em testes e sendo usado no console.

## Update

Quando precisamos atualizar um dado, seja o dado inteiro ou apenas um atributo, podemos usar o update.

Em geral, atualização é bem direto, só que primeiro você precisa buscar o dado correto que você quer atualizar. 

Por isso, a forma mais comum de usar o update é assim: 


```ruby
user = User.find(1)
user.update(active: false)
```

Você já sabe que o `find` está buscando o dado pelo ID (falamos sobre isso agora pouco) e aí o `update` faz tudo de uma vez: altera o valor e já salva no banco. 

Assim como o `save`, ele também retorna `true` ou `false`. 

Mas também existe outra forma de atualizar sem o update diretamente. 

```ruby
user = User.find(1)
user.active = false
user.save
```

Nessa segunda forma, a gente está alterando o atributo diretamente (o que não deixa de ser uma atualização) e depois salvando. 

No final, as duas formas geram o mesmo resultado, a única diferença é que essa segunda forma pode ser útil caso você precise de alguma verificação ou ajuste. 

## Delete

Agora vamos pra última operação, que é a exclusão de dados. 

No ActiveRecord, existem duas formas principais: `destroy` e `delete`. 

### `destroy`

Esse é o mais comum, é o que você mais vai ver e também tende a ser o mais seguro:


```ruby
user = User.find(1)
user.destroy
```

O `destroy` remove o dado do banco respeitando as regras definidas no model. Ou seja, qualquer comportamento que dependa da exclusão do dado ainda é executado.

Assim, se você tem alguma regra de negócio específica como limpeza de outros dados relacionados, registro de logs, etc., o `destroy` acaba sendo a melhor opção.

### `delete`

O `delete` é mais direto na exclusão, embora o código seja muito parecido:

```ruby
user = User.find(1)
user.delete
```

Essa exclusão é mais "bruta", justamente porque não vai executar nenhuma regra ou validações que estejam associados ao model. 

Então, cuidado com o `delete`, na dúvida, vá pelo `destroy`. 

Bom, esse é o CRUD que você vai usar na maior parte do tempo quando estiver trabalhando com models no Rails.

Criar registros, buscar dados, atualizar informações e remover o que não faz mais sentido são tarefas que aparecem o tempo todo no dia a dia e o ActiveRecord deixa isso bem mais simples.

A partir daqui, já dá pra explorar outros temas com mais tranquilidade, como validações, associações entre models e regras de negócio mais complexas.

Mas isso é conversa pra o próximo post, então até a próxima!
