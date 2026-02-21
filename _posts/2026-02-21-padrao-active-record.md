---
layout: post
title: "Padrão Active Record"
description: "Entenda o que é o padrão Active Record, como ele funciona e quando faz sentido utilizá-lo."
permalink: "/padrao-active-record"
date: 2026-02-21
categories: [Arquitetura de Software]
---

Se você já teve algum contato com Ruby, já deve ter ouvido falar sobre o ActiveRecord, a gem que usamos pra fazer operações no banco de dados de forma mais fácil. Pra mais detalhes, é só dar uma olhada neste [post](/models-crud-rails).

Mas hoje a gente vai conversar sobre o padrão Active Record que nada mais é do que um padrão de arquitetura de software, no qual, como você deve imaginar, a gem ActiveRecord é baseada nesse padrão. 

Antes de tudo, vamos entender o que é esse padrão. 

## O que é o Padrão Active Record?

O Active Record é um padrão arquitetural que, segundo Martin Fowler, em seu livro <a href="https://martinfowler.com/books/eaa.html" target="_blank">Patterns of Enterprise Application Architecture</a>, é um objeto que representa uma linha de uma tabela, encapsula o acesso ao banco e adiciona lógica de domínio aos dados.

Beleza, mas o que isso quer dizer?!

No padrão Active Record, o objeto vai concentrar as duas coisas, dados e comportamentos. Além disso, ele vai ser um espelho de uma linha da tabela em um banco de dados.

Dessa forma, o objeto funciona como a interface entre a aplicação e o banco de dados permitindo realizar operações no banco por meio do próprio objeto, já que cada instância corresponde diretamente a uma linha da tabela. Assim, o objeto vai ser o meio de consultar, inserir, atualizar e excluir no banco. 

Eu sei que você deve tá pensando que é isso que a gente faz quando usamos Ruby on Rails (RoR). E sim, a gente faz por o RoR adotou justamente esse padrão e o utiliza muito bem como base pra seus models. 

Além do Rails, tem vários outros frameworks que utilizam esse padrão, como o Django e Laravel.

## O que o Active Record resolve?

Quando trabalhamos com POO e com banco de dados, estamos lidando com dois mundos diferentes, isso porque o banco relacional trabalha com linhas e tabelas, enquanto o POO trabalha com classes e objetos. 

Então, pra lidar com esse problema, o Active Record propõe justamente conectar objetos ao banco de dados de forma simples e intuitiva. Isso abstrai a necessidade de escrever SQL diretamente na maior parte dos casos.

Com isso, de maneira geral, o padrão cria uma "ponte" entre o modelo de orientação a objetos e a estrutura relacional do banco de forma que a classe representa uma tabela, o objeto (instância) representa uma linha da tabela e os atributos do objeto representam as colunas da tabela.


Vamos imaginar um e-commerce onde temos no banco as tabelas `orders` e `order_items`.

Orders:

| id | customer_name | total_amount | status |
| --- | --- | --- | --- |
| 1 | Aline | 250.00 | pending |


Order Items:

| id | order_id | product_name | quantity | price |
| --- | --- | --- | --- | --- |
| 1 | 1 | Notebook | 1 | 200 |
| 2 | 1 | Mouse | 1 | 50 |

No padrão Active Record, isso poderia ser representado assim:

```ruby
class Order
  # Atributos representando as colunas da tabela
  attr_accessor :id, :customer_name, :total_amount, :status

  # Comportamentos
  def total
    total_amount
  end

  def mark_as_paid
    self.status = "paid"
  end
end

class OrderItem
  attr_accessor :id, :order_id, :product_name, :quantity, :price

  def subtotal
    quantity * price
  end
end

```

Além da correspondência da estrutura, existe outro ponto importante no Active Record: a persistência dos dados.

Até agora, falamos apenas da relação entre classe e tabela. Mas o padrão vai além disso.

E aqui vale deixar claro: estamos falando do Active Record como conceito arquitetural, não da implementação específica do Rails.

No padrão, o próprio objeto também sabe como salvar a si mesmo no banco.

Isso significa que, se você criar um `Order`, é o próprio objeto `Order` que vai saber como inserir ou atualizar aquele registro na tabela. Não existe, necessariamente, uma classe separada só para fazer isso.

Ou seja, o modelo não guarda apenas os dados, ele também sabe como persistir esses dados.

```ruby
class Order
  attr_accessor :id, :customer_name, :total_amount, :status

  def save
    # aqui entraria a lógica para inserir ou atualizar no banco
  end
end
```

Nesse caso, o método `save` estaria dentro da própria classe. É isso que caracteriza o padrão: o objeto não depende de outra camada para ser persistido, ele mesmo assume essa responsabilidade.

## Quando o Active Record funciona bem

Agora que já entendemos o conceito e o problema que o Active Record resolve, precisamos conversar sobre quando esse padrão realmente brilha.

O Active Record funciona muito bem em aplicações centradas em dados, o que, convenhamos, é a maioria dos sistemas web hoje em dia.  

Por exemplo:

- Um e-commerce, onde você precisa gerenciar produtos, pedidos e usuários.

- Um sistema de gestão interna, como controle de clientes, contratos ou faturas.

- Uma aplicação de blog, com posts, comentários e categorias.

- Um sistema de cadastro, como CRM ou plataforma educacional.

Em todos esses casos, a maior parte das operações gira em torno de criar, consultar, atualizar e remover registros. Como o modelo já concentra dados e persistência, a estrutura da aplicação fica simples e direta. Você cria um objeto, altera seus atributos e salva.

Agora, isso não quer dizer que o Active Record seja a única forma de resolver esse problema. Ele funciona muito bem em muitos cenários, mas dependendo da complexidade do sistema, outras abordagens podem fazer mais sentido.

## Quando o Active Record não é indicado

Existem algumas críticas ao Active Record, e quase todas giram em torno da mesma ideia: ele funciona muito bem quando a estrutura do sistema se parece bastante com a estrutura do banco.

Ou seja, quando cada model representa diretamente uma tabela e as regras de negócio estão bem próximas dos próprios dados.

O problema é que nem sempre o mundo é tão organizado assim.

Conforme a aplicação cresce, o domínio começa a ficar mais complexo e já não encaixa tão perfeitamente na estrutura das tabelas. Você começa a precisar de objetos que representam conceitos do negócio, e que não correspondem diretamente a uma única tabela no banco.

E aí o que acontece? O model começa a virar o lugar onde tudo vai parar.

### Quando o model começa a fazer coisa demais

Se você já trabalhou em um projeto Rails maior, talvez já tenha visto isso:

- models com dezenas de métodos

- vários callbacks encadeados

- validações condicionais complexas

- regras diferentes dependendo do contexto

- lógica que não tem nada a ver com persistência

Nesse momento, o model deixa de ser apenas um "espelho da tabela" e vira quase um centro de comando da aplicação.

Isso acontece porque, no Active Record, estado, persistência e regra vivem juntos.


### Testabilidade

Outro ponto que costuma aparecer é a testabilidade.

Como o model já está diretamente ligado ao banco, muitas vezes você precisa de banco até para testar regras que são puramente de negócio.

Não é impossível testar (Rails facilita bastante isso), mas o acoplamento existe.

### Quando o domínio não é igual ao banco

Active Record assume que sua modelagem de objetos está bem alinhada com sua modelagem relacional.

Mas quando o domínio começa a ficar mais sofisticado, essa correspondência direta pode começar a ficar forçada.

E aí surgem gambiarras para "encaixar" o modelo de negócio na estrutura do banco.

Isso não significa que o Active Record seja um erro ou uma má escolha. Significa apenas que ele faz uma escolha arquitetural clara: prioriza simplicidade e proximidade com o banco. Em muitos cenários isso é excelente. Em outros, pode exigir mais cuidado na organização do código.

É por isso que é importante conhecer padrões de arquitetura de software. No fim, a escolha certa sempre depende do contexto.

Ah e caso você tenha interesse em aprofundar sobre esse e outros padrões, o livro de Martin Fowler pode ajudar.

Até a próxima!