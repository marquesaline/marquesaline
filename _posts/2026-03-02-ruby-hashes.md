---
layout: post
title: "Hashes em Ruby"
description: "Entenda o que são hashes em Ruby, por que eles são necessários e como usá-los no dia a dia da programação."
permalink: "/ruby-hashes"
date: 2026-03-02
categories: [Ruby]
---

Hoje vamos conversar sobre mais uma estrutura de dados do Ruby, o hash.

Assim como no array, o hash vai permitir a gente armazenar um conjunto de dados, isso significa que em vez de precisar criar várias [variáveis](/variaveis-e-constantes-em-ruby) pra armazenar dados relacionados, você pode simplesmente usar um hash e armazenar tudo junto e, obviamente, isso vai facilitar a manipulação desses dados. 

Essa facilidade é justamente o que torna o hash, junto com o [array](/ruby-arrays), uma das estruturas de dados mais usadas no Ruby.

## O que é um hash?

Bom, como eu já falei, o hash também é uma estrutura usada pra armazenar dados. 

Mas diferente do array, ele organiza essas informações usando pares de chave e valor.

Isso significa que cada valor armazenado dentro do hash tem uma chave associada a ele, que funciona como uma referência pra gente acessar aquele dado depois.

Na prática, isso significa que em vez de acessar um elemento pela posição (usando o índice), como fazemos em um array, acessamos os dados usando a chave correspondente.

Agora que já entendemos o conceito, vamos ver como criar um hash em Ruby.

## Como criar um hash?

Existem algumas formas de criar um hash no Ruby, ama forma de criar um hash é usando a classe:

```ruby
dados = Hash.new
=> {}
```

Quando criamos um hash dessa forma, estamos criando um hash vazio. Isso dá no mesmo que criar um hash assim: 

```ruby
dados = {}
=> {}
```

As duas formas estamos inicializando com um hash vazio, então não tem diferença e você pode usar a forma que preferir. 

Agora, quando a gente precisa criar um hash com dados, precisamos seguir esse formato:

```ruby
usuario = {
  nome: "José", 
  idade: 25,
  status: true
}
```

Nessa estrutura `nome`, `idade`, `status` são as chaves. Veja que os valores podem ser de qualquer tipo, nesse exemplo temos uma string (`"José"`), um número (`25`) e um valor booleano (`true`). Isso é o legal do hash: armazenar vários tipos de dados ao mesmo tempo.

## Como acessar valores de um hash?

Para acessar um valor dentro de um hash usamos colchetes `[]` e passamos a chave correspondente.

```ruby
usuario[:nome]
# => "José"

usuario[:idade]
# => 25
```

Ou seja, se quisermos acessar o nome da pessoa, usamos a chave `:nome`.

E só pra lembrar, a chave precisa ser exatamente a mesma que foi usada na criação do hash.

Mais pra frente eu vou falar sobre o uso dos `:` antes da chave. 

## Como adicionar/atualizar valores

Também é possível adicionar novos dados ao hash depois que ele já foi criado.

Pra isso, usamos novamente os colchetes com a nova chave e atribuímos um valor a ela:

```ruby
usuario[:cidade] = "São Paulo"
```

Agora o hash passa a ter mais uma informação:

```ruby
{
  nome: "José",
  idade: 25,
  status: true,
  cidade: "São Paulo"
}
```

Esse mesmo método serve pra **atualizar valores**, isso porque se a chave não existir, o Ruby cria, mas se já existir, ele atualiza o valor. 

```ruby
usuario[:idade] = 26
# => 26
```

Como `idade` já existe no hash, ele simplesmente vai atualizar o valor. 

## Como remover valores

Caso seja necessário remover um dado do hash, podemos usar o método `delete`.

```ruby
usuario.delete(:status)
=> true
```
Depois disso, a chave junto com o valor deixa de existir no hash. 

Ah, quando usamos o `delete`, o Ruby retorna nesse método o valor da chave, então você consegue pegar o valor que está sendo removido.

E caso a chave que você está usando não exista no hash, ele vai retornar simplesmente `nil`, o que é bom, porque você não vai ter nenhum erro estourando no código. 

## Símbolos e strings como chave

Quando falamos sobre hashes, sempre tem um assunto que surge junto que são os símbolos, pois eles costumam ser usados como chaves (só usei símbolos nos exemplos anteriores).

Pra gente poder conversar melhor sobre isso, vamos primeiro entender o que são símbolos. 

De forma bem direta: um símbolo é um tipo de dado do Ruby usado principalmente como **identificador**.

Ele lembra uma string porque também é "texto", mas ele costuma ser usado quando aquele valor representa algo mais fixo, como:

- nomes de chaves em hashes
- nomes de métodos
- opções/configurações (muito comum em gems e no Rails)

Um símbolo é escrito com `:` no começo:

```ruby
:nome
:idade
:status
```

Eu não vou aprofundar aqui, porque esse tópico merecia um post único, mas entenda que símbolo é um tipo de dado específico pra representar algo. 

Por isso, quando usamos `nome:` como chave de um hash, estamos dizendo pro Ruby: "essa chave é um identificador fixo, ela representa o conceito de nome".

Vale dizer que essa sintaxe `nome:` é um atalho moderno introduzido no Ruby. Antes disso, a forma de escrever era assim:

```ruby
usuario = {
  :nome => "José",
  :idade => 25
}
```

Você vai encontrar muito código usando essa sintaxe, e está tudo bem, funciona! Só tente manter o padrão. 

Mas você pode estar se perguntando: e se eu usar uma string como chave?

Sim, o Ruby aceita:

```ruby
usuario = {
  "nome" => "José",
  "idade" => 25
}
```

O problema é que símbolo e string são tipos diferentes, e isso tem uma consequência bem prática: se o hash foi criado com símbolo, você precisa acessar com símbolo. Se misturar, o Ruby retorna `nil`:

```ruby

usuario = { nome: "José" }

usuario[:nome]   # => "José"
usuario["nome"]  # => nil

```

Por isso a convenção no Ruby é usar símbolos como chave, além de evitar essa confusão, eles também são mais eficientes na memória. Mas isso é assunto pra um post só sobre símbolos!

Bom, com isso a gente fecha esse post inicial sobre hash, mas saiba que ainda tem mais coisas pra gente conversar sobre hashes em outro post. 

De toda forma, sugiro que você treine bastante o uso desse tipo de dado, porque usamos ele constantemente quando trabalhamos com Ruby. 

Espero ter conseguido te ajudar a entender um pouco mais sobre esse assunto. 

Até a próxima!
