---
layout: post
title:  "Variáveis e Constantes em Ruby: entenda a diferença e como usar"
description: "Descubra o que são variáveis e constantes em Ruby e entenda de forma simples quando usar cada uma"
permalink: "/variaveis-e-constantes-em-ruby"
date:   2025-10-27
categories: Ruby
---

Antes da gente entender como definimos variáveis em Ruby, temos que entender o que são variáveis. 

Variável, na programação, é um **espaço na memória que vai guardar um valor que poderá ser usado durante a execução do programa**.Você pode pensar como uma gaveta, onde você pode colocar dados. E toda vez que você precisar desse dado, você só precisa abrir a gaveta, neste caso, chamando a variável pelo nome dela. 

E obviamente, como o próprio nome já diz, se é uma variável, significa que o dado ele pode variar ao longo da execução. 

Em contraponto, também temos as **constantes**. A ideia é a mesma, armazenar um dado na memória que pode ser acessado durante a execução do programa...

A diferença? Se a variável varia... a constante não varia.

Então, em linhas gerais, as constantes são usadas pra armazenar valores que não serão alterados.

Até aqui, beleza?! Vamos seguir.

## Variáveis em Ruby

Já sabemos o que são variáveis, agora vamos entender como definir no ruby.

Pra criar uma variável local (a que mais utilizamos) você só precisa dá um nome a ela, com todas as letras minúsculas e sem caracteres especiais, seguido do valor que você deseja armazenar. 

```ruby

idade = 25

```

Se as variáveis variam, isso significa que você pode alterar os valores a qualquer momento durante a execução, basta atribuir um novo valor a variável.


```ruby

idade = 45

```
Mas o que nos interessa mesmo na variável é o valor que ela armazena, e como eu disse agora pouco, pra acessar esse valor só precisamos chamar a variável pelo nome dela. 

```ruby

idade = 45
puts idade

```
PS: o `puts` é o método que usamos pra imprimir o valor na tela. Neste caso, o valor que vai ser mostrado é 45, que é o valor armazenado em `idade`. 

## Constantes em Ruby

Bom, já sabemos que constantes são dados que não são alterados.

No Ruby, as constantes são definidas com letras maiúsculas, como nesse exemplo:


```ruby

CIDADE = 'São Paulo'

```

Embora a ideia de uma constante é que não seja alterável, o Ruby ainda é possível alterar. Ele apenas vai te alertar que não deve ser alterada, mas no geral, o Ruby confia em você pra não fazer isso. 

```ruby

CIDADE = 'São Paulo'
CIDADE = 'Rio de Janeiro' # warning: already initialized constant CIDADE
puts CIDADE
```

Então neste exemplo, o `puts CIDADE` vai imprimir na tela `Rio de Janeiro`, ou seja, a constante vai ser alterada.

Mas porque o Ruby permite, isso significa que você deve fazer isso?! Com certeza não. Se é uma constante, não altere. 

## Convenção de nomes

Você já sabe que pra criar uma variável ou uma constante vai precisar dá um nome a ela. Só que esse nome não pode ser qualquer nome ou ser colocado de qualquer jeito, pois saiba que existe uma convenção pra isso. 

Sim, a gente que trabalha com programação adora uma convenção pra tudo, inclusive pra dar nome as coisas. 

Então, quando você estiver nomeando uma variável, lembre-se dos seguintes pontos:

- Variáveis sempre são escritas com letras minúsculas e constantes com letras maiúsculas
- Se tiverem mais de uma palavra, usamos o *snake_case* (com underline). Exemplo `nome_completo`
- Não fazemos muito isso, mas se você estiver usando nomes em português, não use acentos, cedilhas ou qualquer outro caractere especial no nome de variáveis

Tranquilo, né?!

E é isso, esse é o básico de variáveis em Ruby. 


