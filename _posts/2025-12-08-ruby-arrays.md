---
layout: post
title: "Arrays em Ruby"
description: "Entenda o que são arrays em Ruby, por que eles são necessários e como usá-los no dia a dia da programação."
permalink: "/ruby-arrays"
date: 2025-12-08
categories: Ruby
---

Em muitos casos no dia a dia da programação precisamos trabalhar com vários valores ao mesmo tempo. Pra armazenar esses valores, nem sempre é possível (ou eficiente) criar muitas variáveis. 

Se você ainda não viu o que são variáveis em Ruby, recomendo dar uma olhada neste post: [Variáveis e constantes em Ruby](/variaveis-e-constantes-em-ruby).

Imagine um cenário em que você precisa armazenar todos os itens que o usuário colocou no carrinho de compras. A gente não tem como saber quantos itens serão adicionados, então criar variáveis pra cada fica complicado. 

Além disso, o usuário pode querer remover o item do carrinho, como saber qual remover? Você ainda vai precisar mostrar a soma de todos, vamos pegar variável por variável pra somar?

Perceba que quanto mais funcionalidades, mais vai ficando complicado pensar em soluções que envolvam variáveis. É justamente nesse ponto que entram as estruturas de dados. 

E o que é isso?

Estrutura de dados é uma forma organizada de armazenar e gerenciar dados pra facilitar o uso, desde acesso a cada um dos dados, a manipulação e o processamento.

Na programação existem várias estruturas de dados, entre elas, os **arrays**. E é sobre isso que vamos conversar hoje. 

## O que é um array?

Array é uma coleção de dados ordenada. Em outras palavras, isso quer dizer que é possível armazenar vários valores dentro dessa estrutura e esses valores vão ser colocados em uma posição específica.

Com isso, a gente não precisa criar várias variáveis. Vamos poder armazenar todos juntos dentro dessa coleção e, como vou te mostrar mais pra frente, vamos poder acessar e manipular com facilidade.

Antes de seguir, tem um detalhe importante:  
cada valor dentro do array fica em uma **posição**, e cada posição é identificada por um **índice** que sempre começa em **0**.

![Exemplo de array com posições e índices](/assets/images/array-posicoes-indices.webp)

Como dá pra ver na imagem acima, no array vamos armazenar diversos valores ao mesmo tempo, e todos eles tem uma posição. O primeiro valor, sempre vai ter o índice 0, o segundo o índice 1, o terceiro o índice 2... você entendeu, não é?!

Agora que já entendemos isso, vamos entender como criar um array em Ruby.

## Manipulação de Arrays

### Criando arrays

Pra criar arrays em Ruby você pode fazer assim:

```ruby
array_1 = [1, 2, 3, 4, 5]
array_2 = ["José", "Maria", "Carlos", "Vanessa"]
```

Percebeu a estrutura?! Arrays são criados usando `[]`. Colocamos os dados dentro dele e usamos a `,` pra separar os elementos.

Neste caso, eu já criei os arrays com os elementos, mas também é possível criar um array vazio usando o `[]` (colchetes vazios).

Essa é a forma que dia a dia mais usamos pra criar um array. 

Mas também é possível criar usando o chamando o método `Array.new`, olha só:

```ruby
Array.new # é o mesmo que [] 
```

Além disso, usando esse método, podemos determinar a quantidade de elementos que queremos no array.

```ruby
Array.new(2) # o resultado disso é [nil, nil]
```

Lembrando que `nil` é um tipo de dados que indica ausência de valor. Pra entender melhor os tipos de dados em Ruby tem esse post [aqui](/tipos-de-dados-em-ruby)

Ahh mas também dá pra criar o array com valores dentro usando esse método:

```ruby
Array.new(2, 5) # o resultado disso é [5, 5]
```

### Acessando os elementos

Lembra que te falei agora pouco que cada elemento no array possui uma posição específica e que cada posição é identificada pelo índice?!

Pois é, é com base nesses índices que vamos conseguir acessar os elementos de forma individualizada. 

Quando temos um array, como por exemplo `["José", 25, 1.75, false]`, cada elemento tem sua posição, o elemento `"José"` está na posição 0, o `25` está na posição 1, o `1.75` na posição 2 e o `false` na posição 3.

Então, pra gente conseguir acessar, só precisamos chamar o array dessa forma:

```ruby
array_1 = ["José", 25, 1.75, false]
puts array_1[0]  # José
puts array_1[1]  # 25
puts array_1[2]  # 1.75
puts array_1[3]  # false
```

Além de usar valores positivos, é possível acessar os elementos usando índices negativos, como por exemplo:

```ruby
array_1 = ["José", 25, 1.75, false]
puts array_1[-1]  # false
puts array_1[-2]  # 1.75
```

Perceba que quando usamos índices negativos estamos acessando os elementos da direta pra esquerda. 

E ainda podemos usar um intervalo para pegar todos os elementos dentro deste intervalo. 

```ruby
array_1 = ["José", 25, 1.75, false]
puts array_1[1..3] # 25 1.75 false
```

Já te adianto que essa forma com o intervalo é bem útil. 

Bom, além desse formato pelo índice, podemos pegar o primeiro e último elemento usando os métodos `first` e `last`:

```ruby
array_1 = ["José", 25, 1.75, false]
puts array_1.first # José
puts array_1.last # false
```

Agora que a gente entendeu como pegar os elementos, vamos ver como adicionar. 

### Adicionando elementos no array

Existem 3 formas principais de adicionar novos elementos no array.

O primeiro deles, e talvez o mais usado, seja o `<<` que é a forma "ruby-like" de escrever.

Esse método **adiciona um elemento no final do array**. 

```ruby
novo_array = [10, 'a']
novo_array << 'b' # o resultado será [10, 'a', 'b']
```

O método `push` também tem um comportamento parecido e funciona da mesma forma, **adicionando um elemento ou mais no final do array**.

```ruby
novo_array = [10, 'a']
novo_array.push('b', 'c') # [10, 'a', 'b', 'c']
```

A diferença entre o `push` e o `<<` é que o primeiro vai permitir a gente adicionar mais de um elemento de uma vez no final do array. 

E além desses, ainda vamos ter o `unshift` que permite **adicionar um elemento ou mais no início do array**


```ruby
novo_array = [10, 'a']
novo_array.unshift('b', 'c') # ['b', 'c', 10, 'a']
```

OBS: tenha cuidado com o `unshift` porque ele modifica completamente os índices dos elementos do array. No exemplo acima, o valor 10 que estava na posição 0, passou para posição 2.

### Removendo elementos

Bom, para remover elementos do array vamos ter alguns métodos para nos ajudar, começando com o `pop` que permite **remover o último elemento** do array:


```ruby
novo_array = [10, 'a']
novo_array.pop #remove o 'a'
puts novo_array # [10]
```

Ainda temos o `shift` que permite **remover o primeiro elemento** do array. E aí, fique ligado, porque a mesma observação que passei sobre adicionar, vale sobre o remover do começo. 


```ruby
novo_array = [10, 'a']
novo_array.shift #remove o 10
puts novo_array # ['a']
```

Além de remover o primeiro e o último elemento, podemos remover um elemento específico pelo valor dele usando o `delete`:

```ruby
novo_array = ['a', 'b', 'c', 'd']
novo_array.delete('b') # remove o valor 'b' (todos os valores 'b' que ele encontrar no array)
puts novo_array # ['a', 'c', 'd']
```

E o `delete_at` ainda permite remover pelo índice:

```ruby
novo_array = ['a', 'b', 'c', 'd']
novo_array.delete_at(2) # remove o 'c' que está na posição 2 do array
puts novo_array # ['a', 'b', 'd']
```

## Outros métodos úteis

Quando a gente trabalha com arrays, nunca é demais saber uns métodos úteis que vão nos ajudar no dia a dia. E já te adianto que é super normal para um dev usar arrays. Então vamos lá!

### Tamanho do array

Se você precisa saber quantos elementos tem no array existem dois métodos no Ruby que podem te ajudar. 

```ruby
novo_array = ['a', 'b', 'c', 'd']
puts novo_array.length  # 4
puts novo_array.size    # 4
```

Sim, os dois fazem a mesma coisa. Tem algum que você deva usar? Neste caso é realmente uma questão de preferência. Use o que fizer mais sentido para você!

Outro método útil é o `empty?` que serve para verificar se o array está vazio:

```ruby
novo_array = []
novo_array.empty?  # true

outro_array = [1, 2, 3]
outro_array.empty?  # false
```

Lembre-se que o `length` e o `size` também indicam quando o array está vazio retornando 0.

Bom, falamos bastante sobre arrays. Tem vários métodos que podem te ajudar a manipular ou extrair informações. A gente ainda vai ver outros mais pra frente. 

Sei que é muita coisa, mas fica tranquilo, com o tempo e a prática, a gente começa a memorizar alguns desses. Mas lembre-se, você não precisa saber tudo de cabeça, a documentação tá aí pra nos ajudar. 

Até a próxima!