---
layout: post
title:  "Tipos de Dados em Ruby"
description: "Notas sobre os tipos básicos de dados em Ruby — Integer, Float, String, Boolean e Nil"
permalink: "/tipos-de-dados-em-ruby"
date: 2025-10-29
categories: [Ruby]
---

A primeira coisa que precisa ficar clara desde o começo é que, em Ruby, não temos os tipos primitivos como em outras linguagens. Todos os tipos de dados são objetos. 

Mas Aline, preciso me preocupar com isso agora?! A resposta é não. Por enquanto, apenas absorva essa informação. 

Vamos entender os tipos básicos em Ruby, começando pelos numéricos.

## Numéricos

### Inteiro (`Integer`)

O tipo de dado inteiro se refere aos números inteiros, ou seja, **sem partes decimais**. Por exemplo: 5, -10, 1000, etc. 

O Ruby não tem limite de tamanho para inteiros, e você pode realizar operações matemáticas com eles. 

Exemplos:

```ruby
idade = 28
ano = 2025
saldo = -100
```

E, usando as variáveis, você pode realizar as operações normalmente:

```ruby
soma = idade + 2 
puts soma
```

### Decimal (`Float`)

Os números decimais são aqueles que possuem uma fração decimal, podendo ser positivos ou negativos, como -3.05, 10.5, -0.5, etc.

Uma observação importante é que a parte decimal é separada por `.` (isso mesmo, esqueça a `,`).

```ruby
preco = 19.99
temperatura = -3.5
```

## Texto (`String`)

O tipo de dado no formato de texto é chamado de **string**.

Para definir uma string, sempre usaremos aspas — podendo ser aspas simples (`'olá mundo'`) ou aspas duplas (`"olá mundo"`).

Sim, usando aspas simples ou duplas o seu código vai funcionar, mas aqui vai uma dica desde já: escolha um tipo e siga um padrão no seu código.

```ruby
nome = "José"
mensagem = 'Olá mundo!'
```

Mas existe uma diferença entre as aspas duplas e as simples: somente as **aspas duplas** permitem *interpolar variáveis*

E o que é interpolação de variável?!

A interpolação é um processo de substituir uma determinada posição em uma string pelo valor armazenado em uma variável. 

OBS: se tiver dúvidas sobre o conceito de variável, é só dar uma olhada [aqui](/variaveis-e-constantes-em-ruby)

No Ruby, a interpolação só pode ser feita com aspas duplas dessa forma:

```ruby
nome = "Aline"
puts "Olá, #{nome}!"   # => Olá, Aline!
```

## Boolean (`TrueClass` e `FalseClass`)

O tipo de dado boolean só possui dois valores possíveis: `true`(verdadeiro) ou `false`(falso). 

```ruby
ativo = true
admin = false
```

E em Ruby, tudo é considerado verdadeiro, exceto o `false` (por motivos óbvios) e o `nil`(vamos falar sobre ele logo a seguir).

## Nil (`NilClass`)

O `nil` representa a ausência de valor, seria basicamente o "nada" do Ruby.

```ruby
resultado = nil
```

E já tenha em mente que ausência de valor é diferente de 0 e de string vazia.

Bom, esses são os **tipos de dados mais básicos em Ruby**, com eles, já é possível representar praticamente qualquer informação simples no código. 

Mas é claro, que tem mais coisas no Ruby além disso, e vamos ver nos próximos posts. 




