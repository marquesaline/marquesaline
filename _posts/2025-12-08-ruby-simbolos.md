---
layout: post
title:  "Símbolos em Ruby (Symbols)"
description: "Descubra o que são variáveis e constantes em Ruby e entenda de forma simples quando usar cada uma"
permalink: "/simbolos-ruby"
date: 2025-12-08
categories: [Ruby]
published: false
---

Se você nunca viu um símbolo (symbols) em Ruby, deixa eu te apresentar. 

```ruby
:name
:email
:address
```

Isso são símbolos. E é sobre isso que vamos conversar hoje. 

À primeira vista parece simplemente uma string com `:` na frente. Mas na verdade eles tem um conceito diferente.

Os símbolos são entendidos como identificadores imutáveis, isso significa que eles são usados pra representar determinadas informações, como nomes e chaves.

Eu sei, eu sei, você deve está pensando "isso é muito parecido com o que fazemos com strings", mas tem uma diferencia, além da imutabilidade: 

- Pense assim, em alguns casos o código precisa apenas de um _identificador_, algo que não muda, símbolos pra serem usados em determinados casos. 
- Em outros casos, o código precisa armazenar um texto, algo que poderá ser manipulado e alterado, aí sim estamos falando de strings. 

Então, mantenha em mente que são coisas diferentes, beleza?!

## Por que símbolos existem?






