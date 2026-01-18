---
layout: post
title: "Each, Map e Select: Iteradores de Arrays em Ruby"
description: "Entenda como usar each, map, select e outros iteradores essenciais para percorrer e transformar arrays em Ruby de forma prática."
permalink: "/ruby-iterando-arrays"
date: 2025-12-30
categories: [Ruby]
---

Hoje vamos conversar sobre como é possível percorrer os dados de um array em Ruby. 

Aqui eu vou falar sobre os principais métodos pra iterar arrays. 

Se você ainda não sabe o que é um array, sugiro dar uma olhada antes no post sobre [arrays](/ruby-arrays), lá eu coloquei toda explicação sobre o que são arrays e como acessamos, modificamos e removemos elementos. 

Pra gente começar entendendo sobre a iteração de arrays, primeiro vamos entender o que é iteração.

## Iteração

Quando falamos de iteração na programação, estamos nos referindo ao ato de percorrer ou de processar de alguma forma cada elemento individualmente de uma coleção de dados.

Como você já sabe, um array é justamente uma coleção de dados, isso significa que podemos ter uma grande quantidade de dados e com a iteração podemos executar uma determinada ação pra cada elemento do array.

Não ficou totalmente claro?!

Imagina que existe uma lista de notas de alunos. Cada valor representa a nota de uma pessoa diferente.

Em algum momento, foi decidido que todo mundo vai ganhar 1 ponto extra.

Na prática, isso quer dizer que a nota 6 vira 7, a 7 vira 8, a 5 vira 6 e assim por diante.

Repare que a regra é sempre a mesma, o que muda é só o valor.
Ou seja, é algo que precisa acontecer para cada item da lista, um por um.

É justamente pra esse tipo de situação que a iteração existe: quando há vários dados e a mesma ação precisa ser aplicada em cada um deles.

Beleza, agora vamos conversar sobre os métodos que vão nos ajudar a iterar.

## Métodos

### `each`

Este é um dos métodos mais usados pra iterar arrays em Ruby (talvez seja até o mais usado).

É com ele que o Ruby permite passar pelos elementos de um array sem precisar lidar com índice, posição ou tamanho da lista. 

Na prática, o each serve pra executar um código usando um elemento de cada vez do array.

Vamos ver um exemplo:

```ruby
nomes = ['José', 'Maria', 'Carlos', 'Helena']

nomes.each do |nome|
  puts nome
end
```

Então nesse código a gente tem um array com vários nomes e com o `each` estamos percorrendo o array, pegando nome por nome e exibindo (`puts`).

Abrindo um parênteses rápido pra falar da sintaxe, porque isso vai se repetir nos outros métodos.

Repara que o each sempre vem acompanhado de um bloco, e dentro desse bloco a gente cria uma variável (nome, nesse caso). Essa variável vai "representar" cada elemento do array, um de cada vez.

Ou seja, a cada volta do each, o Ruby pega um valor do array e coloca dentro dessa variável. É com ela que a gente trabalha dentro do bloco.

Lendo o código em voz alta, dá até pra entender o que está acontecendo: para cada (`each`) nome, faça (`do`) alguma coisa com ele.

Um último ponto sobre esse método é que ele **não tem como objetivo modificar o array e nem gerar um novo**.

Mantenha em mente que ele serve pra **percorrer os elementos e executar alguma coisa com cada um deles**.

Ou seja, o array original continua exatamente como estava.

No dia a dia, o each costuma aparecer em situações como:

- validar dados um por um, como passar por uma lista de nomes e checar se algum está vazio ou fora do padrão;

- aplicar alguma regra ou verificação, por exemplo analisando uma lista de notas pra ver quais estão abaixo da média;

- disparar alguma ação para cada item, como percorrer uma lista de usuários e enviar uma notificação.

Vamos agora pra o próximo método!

### `each_with_index`

Acho que depois do método anterior, esse aqui é bem fácil de entender. 

Na maioria das vezes, usar o `each` vai resolver a maioria dos seus problemas, mas em algumas situações, além do valor, também é importante saber a posição daquele elemento no array.

É pra isso que existe o `each_with_index`.

Ele funciona como o each, mas entrega dois valores a cada volta:

- o elemento do array

- o índice (posição) desse elemento

Só te lembrando que explico tudo sobre índice no array no post [arrays](/ruby-arrays).

O uso desse método, como você deve imaginar, é praticamente igual ao anterior. 


```ruby
nomes = ['José', 'Maria', 'Carlos']

nomes.each_with_index do |nome, index|
  puts "#{index + 1}. #{nome}"
end
```

Então, agora, além de poder acessar o elemento, podemos pegar exatamente a posição que ele se encontra no array. 

Bem fácil, né?! Vamos pra o próximo!

### `map`

Agora vamos pra o método `map` e de cara já quero deixar claro pra você que diferente do `each`, este método vai retornar um array novo com os resultados. 

Aí você deve está pensando, resultado de que?!

O `map` serve pra realizar alguma operação em cada um dos elementos do array.

Em linhas gerais, ele vai percorrer o array assim como o `each` faz, mas com uma diferença importante: o valor que resulta dessa operação é guardado e usado pra montar um novo array.

Um ponto importante é que, assim como o `each`, **o `map` não altera o array original.**

A diferença é que aqui o resultado de cada operação importa, porque é ele que vai compor o array retornado no final.

Hora do exemplo!

Imagina que você tem uma lista de nomes cadastrados, mas todos vieram em letras minúsculas e você quer gerar uma nova lista com esses nomes em letras maiúsculas.

```ruby
nomes = ['joão', 'maria', 'carlos']

nomes_em_maiusculo = nomes.map do |nome|
  nome.upcase
end
```

Vamos entender o que está acontecendo aqui.

Assim como no `each`, o `map` vai percorrer o array elemento por elemento. A variável `nome` vai representar cada valor do array, um de cada vez.

A diferença é que, no `map`, o valor que aparece como última linha do bloco é usado pra montar um novo array.

Nesse caso, para cada nome, o Ruby chama o método upcase e guarda esse resultado.

No final, o map retorna um novo array com os nomes já formatados e o array original permanece o mesmo:

```ruby
p nomes_em_maiusculo
# => ['JOÃO', 'MARIA', 'CARLOS']

p nomes
# => ['joão', 'maria', 'carlos']
```

Então, sempre que precisar ajustar dados antes de serem usados, o `map` é uma boa forma de fazer isso. 


### `select` ou `filter`

Agora vamos falar sobre o método para filtrar ou selecionar elementos do array com base em um critério específico que você vai definir. 

Isso significa que esses métodos vão **retornar um novo array** apenas com os elementos que atenderam a esse critério.

Assim como os outros métodos, ele vai percorrer o array elemento por elemento.
A diferença é que aqui só entram no novo array os valores que atendem à condição definida.

OBS: o `select` também não altera o array original

Vamos pra o exemplo!

```ruby
notas = [7, 5.5, 8, 4.5, 6.5]

aprovados = notas.select do |nota|
  nota >= 6
end

p aprovados
# => [7, 8, 6.5]
```

Nesse código temos um array de notas e usamos o `select` pra filtrar as notas que foram aprovadas. 

Perceba que dentro do loop usamos apenas a condição de `nota >=6`, então pra cada uma ele vai validar essa condição, se o resultado for `true`, ele vai colocar o elemento no novo array, `aprovados`.

Fácil, né?!

E aí pra gente fechar, só uma observação, no Ruby, o `select` e o `filter` fazem a mesma coisa. 

Aqui eu usei o `select` por ser mais comum de encontrar no dia a dia.

Bom, vamos finalizar por aqui, com esses métodos já te adianto que você vai conseguir fazer muita coisa. 

Mas existem outros métodos úteis como `reject`, `find`, `reduce` e `find_index` que podemos conversar em outros posts. 

Até a próxima!