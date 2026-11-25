---
layout: post
lang: pt
page_id: post-redis-solid-cache
title: "Redis ou Solid Cache: onde guardar o cache no Rails"
description: "Entenda a diferença entre Redis e Solid Cache no Rails, por que um cache guardado num banco de dados ainda pode aliviar o banco, como cada um ocupa a infraestrutura e quais critérios ajudam a escolher entre memória e disco."
permalink: "/redis-vs-solid-cache"
date: 2026-11-24
categories: ["Ruby on Rails", "Arquitetura de Software"]
published: true
---

Quando eu estava estudando cache, uma dúvida me travou por um tempo. A gente usa cache justamente pra não precisar ir ao banco de dados toda hora, certo? Então por que o Rails 8 passou a usar por padrão um cache que guarda as próprias entradas... num banco de dados?

Parece contraditório, mas entender por que essa escolha faz sentido acabou me ajudando a compreender cache como um todo.

No [post sobre cache no Rails](/cache-rails), a gente viu os tipos de cache que o framework oferece. Aqui a pergunta muda, e o foco é **onde** esse cache fica guardado. Vamos comparar Redis e Solid Cache, entender como cada um ocupa a infraestrutura e quando um faz mais sentido que o outro.

## Estratégia e tecnologia são decisões diferentes

Antes de comparar os dois, vale lembrar que Redis e Solid Cache não são estratégias de cache. Eles são tecnologias usadas pra armazenar o cache, o que o Rails chama de _cache store_.

Na prática, isso quer dizer que, independentemente do store escolhido, o `Rails.cache.fetch` continua igual. O ranking de mais vendidos da livraria continua sendo escrito do mesmo jeito:

```ruby
CACHE_KEY = "books/best_seller_ids"
CACHE_TTL = 10.minutes
RANKING_SIZE = 10

Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
  OrderItem.group(:book_id)
           .order(Arel.sql("SUM(quantity) DESC"))
           .limit(RANKING_SIZE)
           .sum(:quantity)
           .keys
end
```

O que decide onde esse resultado vai parar é a configuração, em `config/environments/production.rb`:

```ruby
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"] }
```

ou:

```ruby
config.cache_store = :solid_cache_store
```

O fluxo do `fetch` é o mesmo nos dois casos. Ele procura a chave e, se não encontrar, executa o bloco e guarda o resultado. O que muda é onde e como esse resultado fica armazenado.

Então são duas decisões separadas:

- **estratégia**: como os dados vão ser lidos, guardados e invalidados (TTL, chaves, invalidação);
- **tecnologia**: onde esses dados ficam.

## Redis: cache em memória

O Redis mantém as informações principalmente na memória RAM, o que costuma resultar em latência muito baixa. Aqui, latência é o tempo entre a aplicação pedir um valor e receber a resposta.

O Redis também oferece persistência em disco, mas suas leituras e escritas continuam acontecendo principalmente na memória.

E de qual memória a gente está falando?

Quando a gente diz que o Redis guarda o cache "em memória", é fácil imaginar a memória do servidor onde o Rails está rodando. Mas normalmente não é isso.

Em produção, o Redis costuma rodar como um serviço separado, com a própria CPU e a própria RAM. Uma infraestrutura simplificada ficaria assim:

| Serviço | O que faz | Onde guarda |
| --- | --- | --- |
| Aplicação Rails | Recebe as requisições e executa o código | Na RAM dela, só o que a aplicação precisa pra rodar |
| PostgreSQL | Banco principal | Dados persistentes (livros, pedidos, usuários) |
| Redis | Cache | Na RAM do próprio serviço Redis |

A aplicação Rails se conecta ao Redis pela rede, do mesmo jeito que se conecta ao PostgreSQL. Então, quando falamos de memória do Redis, estamos falando da RAM do serviço Redis, que precisa ser dimensionada e paga à parte.

### O que acontece quando a memória acaba?

A RAM tem tamanho fixo. Quando o Redis atinge o limite configurado (o `maxmemory`), ele precisa decidir o que fazer com as escritas novas.

Isso é definido pela política de remoção, a `maxmemory-policy`. Pra um Redis usado só como cache, o guia do Rails recomenda uma das variantes `allkeys`, que permitem remover qualquer chave pra abrir espaço. A `allkeys-lfu`, que remove as chaves menos usadas, é sugerida como uma boa escolha padrão.

Esse ponto ajuda a entender por que é comum ter um Redis só pra cache. Se a mesma instância também guardasse dados que não podem sumir, como filas de jobs, uma política que remove qualquer chave poderia apagar esses dados pra abrir espaço pro cache.

## Solid Cache: cache em tabela

O Redis resolve o cache com memória, mas isso traz junto um serviço a mais pra manter e um limite de espaço que custa caro aumentar. O Solid Cache, que virou o cache store padrão das aplicações novas no Rails 8, vai pelo caminho contrário.

Em vez de manter o conjunto de dados principalmente na RAM, o Solid Cache guarda as entradas em um banco relacional, normalmente apoiado por armazenamento SSD. Ele não exige um serviço Redis, embora o banco usado pelo cache também possa ficar numa infraestrutura separada.

Na prática, o cache vira uma tabela, a `solid_cache_entries`. Cada linha é uma entrada, com a chave e o valor associado a ela. Quando o `Rails.cache.fetch` procura a chave `books/best_seller_ids`, por exemplo, o que acontece por baixo é uma busca nessa tabela.

### Mesmo banco ou banco separado?

O Solid Cache pode usar o mesmo banco da aplicação ou um banco dedicado só ao cache.

Numa aplicação Rails 8 nova, a configuração já vem preparada pra um banco separado. No `config/database.yml`, o ambiente de produção ganha uma entrada `cache`:

```yaml
production:
  primary:
    <<: *default
    database: bookstore_production
  cache:
    <<: *default
    database: bookstore_production_cache
    migrations_paths: db/cache_migrate
```

E o `config/cache.yml` aponta o Solid Cache pra ela:

```yaml
production:
  database: cache
  <<: *default
```

Um detalhe importante é que "banco separado" não quer dizer necessariamente "servidor separado". O `bookstore_production_cache` pode ser outro banco dentro da mesma instância de PostgreSQL, ou uma instância totalmente diferente. Isso depende da infraestrutura.

Ou seja, usar Solid Cache não obriga a contratar mais um servidor. A proposta é justamente aproveitar uma infraestrutura que a aplicação já sabe operar, em vez de manter um serviço Redis só pra cache.

Se nenhuma conexão for configurada, o Solid Cache usa a mesma conexão do Active Record da aplicação, ou seja, o banco principal. Isso tem algumas consequências, que a gente vai ver mais pra frente.

### E quando o espaço acaba?

O Solid Cache também precisa de um limite, senão a tabela cresce pra sempre. Ele é configurado no `config/cache.yml`, com opções como:

- `max_age`: idade máxima de uma entrada (o padrão é duas semanas);
- `max_size`: tamanho máximo do cache;
- `max_entries`: quantidade máxima de entradas.

A remoção segue a estratégia FIFO (_first in, first out_), em que as entradas mais antigas saem primeiro, independentemente de quantas vezes foram lidas. É diferente da `allkeys-lfu` do Redis, que leva em conta o uso.

Essa limpeza não roda num horário fixo. O Solid Cache conta as escritas e, a cada tantas escritas, dispara uma limpeza em segundo plano. Se ninguém escreve no cache, nada é limpo, mas também nada cresce.

## Comparando os dois

Agora que a gente conhece os dois, fica uma pergunta. Se o Redis tem latência menor, por que não usar ele sempre?

A resposta começa pelo espaço disponível. Os dois precisam de um limite, mas o limite do Redis é a RAM, que costuma custar bem mais por gigabyte do que o SSD usado pelo Solid Cache.

Pra um cache pequeno, essa diferença quase não aparece. Mas imagina uma aplicação que quer manter 100 GB de dados em cache.

Com Redis, seria preciso ter 100 GB de RAM disponíveis no serviço, ou aceitar que a política de remoção vai descartar entradas com frequência, o que significa mais cache _misses_.

Com Solid Cache, esses 100 GB ficam em disco, que é bem mais barato. Cada leitura pode ser um pouco mais lenta, mas o cache pode ser muito maior.

O argumento do próprio Solid Cache é que os SSDs modernos são rápidos o suficiente pra que, na maioria dos casos de cache, a diferença de tempo entre disco e RAM seja pequena. A proposta é que, em muitos cenários, compense manter um cache grande em disco em vez de um cache pequeno em memória.

| Critério | Redis | Solid Cache |
| --- | --- | --- |
| Armazenamento principal | RAM do serviço Redis | Tabelas de um banco relacional, normalmente em SSD |
| Latência | Geralmente menor | Geralmente maior |
| Custo por GB | Geralmente maior | Geralmente menor |
| Caches grandes | Podem ficar caros | Podem ser mais econômicos |
| Infraestrutura | Normalmente um serviço separado | Um banco, que pode ser o mesmo servidor do PostgreSQL |
| Remoção quando enche | Política configurável, como `allkeys-lfu` | FIFO, com `max_age` e `max_size` |
| Carga sobre o banco relacional | Fica isolada no Redis | Pode competir por recursos se compartilhar o banco principal |

Então a escolha não depende só de qual é mais rápido. Depende do volume de dados, da frequência de acesso, do orçamento e da infraestrutura que a gente já tem.

## A contradição: um cache que consulta um banco

Agora vamos voltar na dúvida do começo. Se cache serve pra evitar consultas ao banco, por que usar um cache que também consulta um banco?

A resposta é que **o custo de buscar um resultado pronto pode ser muito menor do que o custo de calculá-lo de novo.**

Pensa no ranking de livros mais vendidos. Pra montar o ranking, o PostgreSQL precisa percorrer a tabela de itens de pedido, que pode ter milhões de linhas, agrupar por livro, somar as quantidades e ordenar:

```sql
SELECT book_id, SUM(quantity) AS total
FROM order_items
GROUP BY book_id
ORDER BY total DESC
LIMIT 10;
```

Dependendo do volume de dados e dos índices, essa consulta pode ser cara. Vamos supor que ela demore 2 segundos.

Com Solid Cache, a primeira requisição executa essa consulta e guarda o resultado na `solid_cache_entries`, associado à chave `books/best_seller_ids`. Nas seguintes, o que o banco faz é buscar uma linha pela chave.

| | O que o banco faz | Tempo (hipotético) |
| --- | --- | --- |
| Sem cache | Lê os itens de pedido, agrupa, soma e ordena | 2 s |
| Com Solid Cache | Busca uma linha pronta pela chave | 5 ms |

Os tempos são inventados, só pra ilustrar a ordem de grandeza. Não são medições do Solid Cache.

Repara que os dois casos acessam um banco. A diferença não está no lugar onde o dado fica, e sim no **trabalho** que o banco precisa fazer pra responder.

Tem mais uma nuance aqui. A divisão entre "Redis é memória" e "banco é disco" não é tão rígida.

O PostgreSQL também usa RAM, tanto pra executar consultas quanto pra manter em memória as páginas de dados acessadas com frequência. Então nem toda leitura no Solid Cache precisa, obrigatoriamente, ir até o SSD.

A diferença é de projeto. O Redis foi feito pra ser um armazenamento predominantemente em memória. O Solid Cache usa um banco relacional como mecanismo de armazenamento, com tudo o que vem junto, como disco, transações e conexões. É por isso que o Redis geralmente tem latência menor, e não porque o banco nunca usa memória.

## Quando o Solid Cache não compensa

Se o benefício vem de evitar trabalho caro, a conclusão inversa também vale. Quando o trabalho já é barato, o custo do cache pode ser maior do que o ganho.

Imagina cachear isso:

```ruby
Book.find(book_id)
```

Uma busca por chave primária, com índice, costuma levar poucos milissegundos. Guardar esse resultado no Solid Cache seria trocar uma consulta simples na tabela `books` por outra consulta simples na tabela de cache.

O ganho pode ser pequeno, e ainda viriam junto todos os custos do cache, como expiração, invalidação e o risco de mostrar um dado desatualizado.

| Situação | Solid Cache faz sentido? |
| --- | --- |
| Consulta simples por ID, já rápida | Talvez não |
| Consulta com agregações caras | Pode fazer bastante sentido |
| Resultado de um processamento complexo | Pode fazer bastante sentido |
| Resposta de uma API externa lenta | Pode fazer bastante sentido |
| Dado que muda o tempo todo e é barato de consultar | Talvez não |

Essa tabela, na verdade, vale pra qualquer cache, não só pro Solid Cache. Com Redis, a busca por ID cacheada poderia ficar mais rápida, dependendo da rede, da serialização e da carga dos serviços, mas o custo de manter a consistência continuaria lá.

## O que pode dar errado

Até aqui, a gente comparou os dois pelo que eles oferecem, como velocidade, custo e espaço. Mas cada um também traz riscos próprios, e eles costumam aparecer em dois momentos, quando o cache divide recursos com a aplicação e quando ele para de responder.

### Quando o cache divide o banco com a aplicação

Lá na seção do Solid Cache, a gente viu que, se nenhuma conexão for configurada, ele usa o banco principal da aplicação. Isso funciona, e o cache ainda pode ajudar, porque buscar o ranking pronto continua sendo mais barato do que recalcular.

O problema é que as leituras e escritas do cache passam a consumir CPU, memória, disco e conexões do mesmo banco que atende a aplicação. Se esse banco já está no limite, o cache vira mais trabalho justamente pra quem a gente queria aliviar.

Tem ainda um efeito menos óbvio. Usando a mesma conexão, as operações do cache entram em qualquer transação que esteja aberta. Se a transação for desfeita, a escrita no cache também é.

É por isso que as aplicações Rails 8 novas já vêm com um banco separado pro cache. E, se a carga crescer, dá pra levar esse banco pra outra instância. O que ajuda a decidir é medir a latência das leituras de cache, a carga no banco e a taxa de hit.

### Quando o cache store para de responder

No [post sobre cache no Rails](/cache-rails), a gente viu o cenário de o Redis cair e toda a carga ir direto pro banco. Agora dá pra entender melhor por que isso acontece.

Segundo o guia do Rails, o `:redis_cache_store` não levanta exceções quando o Redis falha. As leituras e escritas simplesmente devolvem `nil`, como se a chave não existisse. Pro `Rails.cache.fetch`, isso é um cache miss, então ele executa o bloco e vai até o banco.

Isso evita que a falha do Redis derrube a requisição na hora, mas pode transferir toda a carga pro PostgreSQL. Pra pelo menos saber que isso está acontecendo, o store aceita um `error_handler`, que é chamado a cada erro e pode avisar um serviço de monitoramento.

Com o Solid Cache, o risco volta pro ponto anterior. Se ele estiver no mesmo servidor do banco principal, um problema nesse servidor derruba o cache e os dados ao mesmo tempo. Separar o cache em outra instância também separa as falhas.

## Pra revisar depois

A ideia que amarra o post inteiro é que **o benefício do cache não vem necessariamente de guardar os dados num lugar mais rápido, mas de evitar repetir uma operação mais cara do que recuperar o resultado dela.**

Essa frase explica tanto o Redis quanto o Solid Cache. O Redis prioriza baixa latência usando memória. O Solid Cache prioriza capacidade e custo, evitando o recálculo mesmo armazenando o resultado num banco.

Na hora de escolher, algumas perguntas ajudam:

- **Qual é o tamanho do cache?** Se o cache cabe com folga na memória e a infraestrutura já opera Redis, ele tende a oferecer menor latência. Se é grande, o disco do Solid Cache tende a sair mais barato.
- **A latência do cache é crítica?** Se cada milissegundo importa, Redis leva vantagem.
- **Que infraestrutura a gente já tem?** Manter um Redis é mais um serviço pra monitorar, atualizar e pagar. O Solid Cache pode aproveitar a infraestrutura de banco existente.
- **O banco principal aguenta mais carga?** Se não, vale considerar um banco separado pro Solid Cache ou avaliar se Redis faz mais sentido.
- **A operação que está sendo cacheada é cara de verdade?** Se não for, talvez nenhum dos dois seja necessário.

Pra se aprofundar:

- [Caching with Rails](https://guides.rubyonrails.org/caching_with_rails.html), o guia oficial, com a configuração dos dois cache stores;
- o [README do Solid Cache](https://github.com/rails/solid_cache), que explica a configuração, a remoção FIFO e a motivação de usar disco;
- a documentação do Redis sobre [políticas de remoção](https://redis.io/docs/latest/develop/reference/eviction/).

Espero ter ajudado a deixar esse assunto um pouco mais claro.

Até a próxima!
