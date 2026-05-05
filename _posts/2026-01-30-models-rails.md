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

Já te adianto que por trás disso existe um padrão de arquitetura muito mais amplo. Se você quiser entender melhor esse conceito, escrevi um post específico sobre o [padrão Active Record](/padrao-active-record).

Hoje, a ideia é olhar pra o ActiveRecord de forma mais prática, entender como usar os principais métodos de CRUD e também falar sobre alguns comportamentos que costumam pegar as pessoas de surpresa.

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

No Rails, o ActiveRecord oferece algumas formas de fazer isso, mas duas aparecem o tempo todo: `new` + `save` e `create`.

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

Quando a gente usa o `new` precisamos usar o `save` depois pra garantir que o dado persista no banco. O `save` retorna `true` ou `false`. Então se o dado não for salvo por algum motivo (uma validação falhou, por exemplo), o código não quebra, ele simplesmente retorna `false`.

Essa separação entre o `new` e o `save` é útil quando você precisa fazer algum ajuste no objeto antes de decidir se vai salvar ou não. É bem comum isso acontecer em situações onde você precisa preencher algum campo extra com base em uma lógica antes de persistir.

Já o `create` usamos assim:

```ruby
User.create(
  name: "Ana",
  email: "ana@email.com",
  age: 28,
  active: true
)
```

Perceba que não precisamos de um comando específico pra salvar, porque ele já faz tudo, cria o objeto e salva no banco. Se algo der errado, o comportamento é o mesmo do `save`, ele não salva e não quebra o código.

**Uma coisa que pega muita gente:** existe também o `create!` (com exclamação). A diferença é que o `create!` levanta uma exceção se algo der errado, enquanto o `create` simplesmente retorna o objeto sem salvar. O mesmo vale pro `save!`. Se você não está ciente disso, pode achar que o dado foi salvo quando não foi.

## Read

Uma vez criados os dados, podemos buscá-los no banco, e como sempre, o ActiveRecord facilita muito isso pra gente.

### `find`

O `find` é usado quando a gente sabe o ID do dado que queremos buscar.

```ruby
User.find(1)
```

Se existir um usuário com esse ID, ele é retornado normalmente. Se não existir, o `find` levanta uma exceção do tipo `ActiveRecord::RecordNotFound`.

Isso importa porque, se você usar o `find` num controller sem tratar essa exceção, a aplicação vai retornar um erro 500 pra quem estiver usando. Por isso, sempre que o ID vem de uma rota (e pode não existir), é bom usar `find_by` ou tratar o erro com `rescue`.

### `find_by`

Quando você quer buscar com base em outro atributo, o `find_by` tende a ser o mais usado:

```ruby
User.find_by(email: "ana@email.com")
```

Se encontrar o registro, ele retorna o objeto. Se não encontrar, retorna `nil`.

Ele sempre vai retornar o primeiro dado que atenda a condição. Se você precisa de todos que atendam, o `find_by` não é a ferramenta certa.

O `find_by` é mais comum de ser usado por permitir buscas mais flexíveis e por não quebrar o código quando o registro não existe. Mas atenção: retornar `nil` ainda pode causar um `NoMethodError` se você tentar chamar um método no resultado sem verificar antes.

### `where`

O `where` permite buscar mais de um dado usando uma condição:

```ruby
User.where(active: true)
```

Nesse caso, o retorno é uma coleção, ainda que não tenha nenhum dado ou só tenha um.

Também é possível usar condições mais específicas, como comparações:

```ruby
User.where("age > ?", 18)
```

**Algo que confunde bastante no começo:** o `where` não bate no banco na hora que você chama. Ele retorna um objeto do tipo `ActiveRecord::Relation`, que é como uma query "pendente". O banco só é consultado quando você realmente precisar dos dados, por exemplo, quando você iterar sobre o resultado com um `.each` ou chamar um `.first`. Isso é chamado de lazy loading e é importante entender pra não se surpreender com o comportamento.

E além desses, ainda tem alguns métodos bem comuns de serem usados no dia a dia:

```ruby
User.all
User.first
User.last
```

Os nomes desses métodos são bem descritivos. Você vai ver bastante em testes e sendo usado no console.

## Update

Quando precisamos atualizar um dado, seja o dado inteiro ou apenas um atributo, podemos usar o `update`.

Em geral, atualização é bem direta, só que primeiro você precisa buscar o dado correto que você quer atualizar.

Por isso, a forma mais comum de usar o `update` é assim:

```ruby
user = User.find(1)
user.update(active: false)
```

Você já sabe que o `find` está buscando o dado pelo ID e aí o `update` faz tudo de uma vez: altera o valor e já salva no banco. Ele também retorna `true` ou `false`, assim como o `save`.

Mas também existe outra forma de atualizar sem o `update` diretamente:

```ruby
user = User.find(1)
user.active = false
user.save
```

Nessa segunda forma, a gente está alterando o atributo diretamente e depois salvando. As duas formas geram o mesmo resultado. Essa segunda pode ser útil quando você precisa fazer alguma verificação ou lógica antes de decidir se vai salvar.

**Uma armadilha comum:** usar `update_attribute` (no singular). Ele existe e atualiza um único campo, mas ignora as validações do model. Então, se você tem uma validação de email, por exemplo, o `update_attribute` vai salvar mesmo com um email inválido. Na dúvida, prefira o `update` normal, que respeita tudo que você definiu no model.

## Delete

Agora vamos pra última operação, que é a exclusão de dados.

No ActiveRecord, existem duas formas principais: `destroy` e `delete`.

### `destroy`

Esse é o mais comum e também o mais seguro:

```ruby
user = User.find(1)
user.destroy
```

O `destroy` remove o dado do banco respeitando as regras definidas no model. Ou seja, qualquer comportamento que dependa da exclusão do dado ainda é executado.

Isso é especialmente importante quando você tem associações. Se um `User` tem muitos `Post` e você configurou `dependent: :destroy` no model, o `destroy` vai apagar os posts junto. O `delete` não faz isso.

### `delete`

O `delete` é mais direto na exclusão, embora o código seja muito parecido:

```ruby
user = User.find(1)
user.delete
```

Essa exclusão é mais direta, justamente porque não vai executar nenhuma regra ou callback associados ao model. Ela manda um `DELETE` SQL diretamente pro banco, sem passar pela camada do Rails.

O problema é que se você usa `delete` num registro que tem associações com `dependent: :destroy`, esses registros filhos ficam lá, soltos no banco, sem o pai. Isso pode causar inconsistência nos dados sem nenhum erro aparente.

Então, na dúvida, vá pelo `destroy`.

Bom, esse é o CRUD que você vai usar na maior parte do tempo quando estiver trabalhando com models no Rails. A sintaxe em si é simples, o que faz diferença é entender quando cada método se comporta diferente do esperado, porque esses detalhes aparecem cedo no dia a dia.

A partir daqui, já dá pra explorar outros temas com mais tranquilidade, como validações, associações entre models e regras de negócio mais complexas. Se quiser entender como organizar essa lógica de negócio quando ela começa a crescer, escrevi um post sobre [service objects](/services-objects-rails).

Mas isso é conversa pra o próximo post, então até a próxima!
