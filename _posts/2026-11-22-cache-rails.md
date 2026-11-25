---
layout: post
lang: pt
page_id: post-cache-rails
title: "Cache no Rails: tipos, TTL, invalidação e trade-offs"
description: "Entenda como os tipos de cache do Rails funcionam e como TTL, chaves, invalidação e falhas afetam desempenho e consistência."
permalink: "/cache-rails"
date: 2026-11-22
categories: ["Ruby on Rails", "Arquitetura de Software"]
published: true
---

Cache é um daqueles assuntos que todo mundo já ouviu falar. A gente sabe que existe, usa no dia a dia, coloca um `Rails.cache.fetch` aqui, um `cache` na view ali, e segue a vida.

Mas eu sinto que quase nunca a gente para pra conversar de verdade sobre ele. O que exatamente está sendo guardado? Por quanto tempo? O que acontece quando o dado muda, ou quando o próprio cache sai do ar?

Pra começar com algo concreto, vamos imaginar uma livraria online em que a página inicial mostra os dez livros mais vendidos da semana. Pra montar esse ranking, a aplicação soma todos os itens de pedido, agrupa por livro e ordena. Em toda requisição.

A consulta não está errada, é assim que precisa ser feito, mas o resultado quase não muda de um minuto pro outro. Recalcular tudo a cada acesso pode ser um desperdício, e é exatamente esse tipo de problema que o cache resolve.

Só que cache não é de graça. Ele resolve um custo, mas acaba criando outros, como dado desatualizado, invalidação, infraestrutura nova e falhas que antes não existiam.

Por isso, quero olhar não só pros tipos de cache do Rails, mas também pras decisões que vêm junto com eles, como TTL, invalidação, consistência e falhas.

## O que é cache?

Cache é uma estratégia de armazenar e reutilizar informações pra evitar repetir operações custosas. 

Pode ser o resultado de uma consulta, um cálculo, a resposta de uma API externa ou um pedaço de HTML já renderizado.

Dois termos aparecem o tempo todo quando falamos sobre isso:

- **cache hit**: a aplicação procura um dado no cache e encontra. Não precisa ir até a fonte original, que normalmente é mais lenta, como o banco de dados ou um serviço externo.
- **cache miss**: a aplicação procura e não encontra, seja porque o dado nunca foi armazenado ou porque expirou. Aí ela precisa buscar na fonte original.

Mas o que acontece depois de um miss? A aplicação busca o dado na fonte e, além de devolver o dado, guarda uma cópia no cache. Assim, a próxima leitura do mesmo dado já vira um _hit_.

Esse fluxo de olhar primeiro no cache e, em caso de _miss_, buscar na fonte e preencher o cache se chama **cache-aside**. O cache fica "ao lado" da aplicação, e é ela quem decide quando ler, quando buscar na fonte e quando gravar.

Ele também é chamado de _lazy loading_, porque o dado só é carregado no cache quando alguém pede. Se ninguém pede, nada é calculado. 
Esse é o padrão mais comum em aplicações Rails, e é exatamente o que o `Rails.cache.fetch` faz.

## Antes de cachear: qual é o gargalo?

Entendemos o que é cache, mas por que usamos?

Uma aplicação pode ficar lenta por muitos motivos. Pode ser por causa de N+1 queries, índice faltando, consulta mal escrita, processamento pesado em Ruby, chamada externa lenta ou renderização cara.

Colocar cache em cima de qualquer uma delas pode até deixar a página mais rápida, mas também pode esconder a causa sem resolver de fato o problema. Até porque, uma consulta sem índice continua sem índice, só que agora roda com menos frequência.

Por isso, antes de adicionar cache, vale medir e responder algumas perguntas:

- A operação é repetida muitas vezes? Ela é realmente custosa?
- O resultado pode ser reutilizado entre requisições ou entre usuários?
- Quanto atraso na atualização o negócio aceita?
- Qual é a fonte de verdade, e que informação nunca pode estar errada no momento de uma operação crítica?
- O que acontece se o cache expirar ou ficar indisponível?
- Qual ganho foi medido? Latência, quantidade de consultas, uso de CPU, taxa de hit?

No exemplo da livraria, se a regra de negócio tolera que o ranking tenha alguns minutos de atraso, usar cache pode fazer sentido. Já se a consulta é barata e o tráfego é pequeno, talvez a complexidade não compense. 

Então tenha em mente que cache não deveria entrar só porque já existe um Redis disponível.

## Tipos de cache no Rails

O Rails oferece mecanismos de cache em camadas diferentes da aplicação. E talvez você, assim como eu, tenha dúvida sobre quando usar cada um deles. A pergunta que me ajuda a escolher entre esses mecanismos é **o que exatamente está custando caro?** O HTML, o cálculo, a consulta repetida ou a resposta inteira?

### Fragment caching

O _fragment caching_ armazena partes de uma página que mudam com pouca frequência. É uma opção direta quando o custo está na renderização de partes da página.

Na livraria, imagina a listagem de livros, em que cada card mostra capa, título, autor, preço e avaliação média:

```erb
<% @books.each do |book| %>
  <% cache book do %>
    <%= render partial: "books/book", locals: { book: book } %>
  <% end %>
<% end %>
```

O helper `cache` gera uma chave a partir do livro e de um digest do template. Na primeira renderização, o HTML do card é armazenado. Nas seguintes, o Rails lê o fragmento pronto em vez de renderizar o partial de novo.

E quando o livro muda? O Active Record usa o `updated_at` do registro como versão. Quando o livro é atualizado, a versão muda e o fragmento antigo deixa de ser usado.

O digest do template também faz parte da chave. Então, se alguém alterar o HTML do partial, o Rails trata como uma entrada nova, sem precisar limpar nada na mão.

Pra coleções, existe uma forma mais direta:

```erb
<%= render partial: "books/book", collection: @books, cached: true %>
```

Com `cached: true`, o Rails busca todos os fragmentos da coleção numa única leitura ao cache (um _multi-fetch_), em vez de uma leitura por livro.

### Russian doll caching

O _Russian doll caching_ (cache de boneca russa) é uma técnica de aninhar fragmentos uns dentro dos outros. Ele não é um tipo separado de armazenamento, é mais como um fragment caching organizado em níveis.

Imagina uma página que lista autores e, dentro de cada autor, os livros dele:

```erb
<% @authors.each do |author| %>
  <% cache author do %>
    <h2><%= author.name %></h2>

    <% author.books.each do |book| %>
      <% cache book do %>
        <%= render partial: "books/book", locals: { book: book } %>
      <% end %>
    <% end %>
  <% end %>
<% end %>
```

Cada nível é armazenado separadamente. A ideia é que, se um livro muda, só o fragmento dele precisa ser renderizado de novo, e os outros livros daquele autor continuam vindo do cache.

Mas tem uma armadilha aqui. Pra entender, primeiro é preciso saber como o helper `cache` decide o que fazer:

- se ele encontra o fragmento no cache, usa o HTML guardado e **não executa nada do que está entre o `do` e o `end`**;
- se não encontra, aí sim ele executa esse código, gera o HTML e guarda.

Agora imagina que a autora Ana Souza tem dois livros na página, e um deles, _Noites de Inverno_, custa R$ 50. Depois da primeira renderização, o cache fica mais ou menos assim (de forma simplificada):

```text
fragmento do livro "Noites de Inverno":
  <div>Noites de Inverno, R$ 50</div>

fragmento do livro "Manhãs de Verão":
  <div>Manhãs de Verão, R$ 35</div>

fragmento da autora Ana:
  <h2>Ana Souza</h2>
  <div>Noites de Inverno, R$ 50</div>
  <div>Manhãs de Verão, R$ 35</div>
```

Repara que o fragmento da Ana tem uma cópia do HTML dos livros. É texto pronto, igual ao que vai pra página. Se o fragmento de um livro mudar depois, essa cópia não muda junto.

Agora o preço de _Noites de Inverno_ muda pra R$ 40. O `updated_at` do livro muda, então a versão do livro muda. Mas o `updated_at` da Ana continua o mesmo, porque ninguém alterou a Ana.

Na próxima requisição, o primeiro `cache` que o Rails encontra no código é o `cache author`. Ele procura o fragmento da Ana e encontra, porque a versão dela não mudou. Então usa aquele HTML guardado, com "R$ 50" dentro, e não executa o código do bloco.

E o `cache book` fica justamente dentro desse bloco. Como o bloco não é executado, o Rails nunca chega a perceber que o livro mudou. A página continua mostrando R$ 50.

A solução é usar `touch: true` na associação:

```ruby
class Book < ApplicationRecord
  belongs_to :author, touch: true
end
```

Com isso, toda vez que o `updated_at` de um livro muda, o do autor também muda. A versão do fragmento externo muda junto, e o Rails renderiza o autor de novo, reaproveitando do cache os livros que não mudaram.

Esse é o ponto que mais confunde no _Russian doll_ e que a gente precisa manter em mente. **A invalidação de um fragmento interno não se propaga sozinha pro fragmento de fora.** A dependência precisa estar explícita.

### Low-level caching

Mas às vezes o custo não está no HTML, e sim num cálculo, numa consulta pesada ou na resposta de uma API externa. 

Pra isso existe o _low-level caching_, que armazena qualquer valor serializável e permite que a gente reutilize entre requisições.

No Rails, a forma mais comum é o `Rails.cache.fetch`. Voltando ao ranking dos mais vendidos:

```ruby
class BestSellers
  CACHE_KEY = "books/best_seller_ids"
  CACHE_TTL = 10.minutes
  RANKING_SIZE = 10

  def self.call
    best_seller_ids = ids
    books_by_id = Book.where(id: best_seller_ids).index_by(&:id)
    best_seller_ids.filter_map { |id| books_by_id[id] }
  end

  def self.ids
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
      OrderItem.group(:book_id)
               .order(Arel.sql("SUM(quantity) DESC"))
               .limit(RANKING_SIZE)
               .sum(:quantity)
               .keys
    end
  end
end
```

O `fetch` funciona exatamente como o _cache-aside_ que a gente viu lá no começo. Se a chave existe no cache (_hit_), o bloco nem é executado. Se não existe (_miss_), o Rails executa o bloco, guarda o resultado e devolve.

O cache guarda só os IDs dos livros, não os objetos `Book`, e isso é proposital, porque a documentação do Rails recomenda evitar guardar listas de objetos Active Record no cache.

O motivo é que o objeto guardado é uma foto do registro naquele momento. O livro pode mudar de preço, ser removido, e em desenvolvimento isso ainda se comporta mal com recarregamento de código. Guardando só os IDs, a parte cara (a agregação) fica no cache, e a busca por chave primária continua trazendo os dados atuais.

Por isso o `call` busca os livros com `where`, e não com `find`. O `Book.find(ids)` levantaria um erro se algum livro do ranking tivesse sido removido depois que os IDs foram guardados. O `where` simplesmente ignora o ID que não existe mais.

Como o `where` não garante a ordem, o `index_by` organiza os livros por ID e o `filter_map` remonta a lista na ordem do ranking, pulando os que sumiram.

Repara também na chave, `"books/best_seller_ids"`. É ela que identifica o valor no cache, então precisa diferenciar tudo aquilo que faz o resultado mudar.

O ranking é o mesmo pra todo mundo, então uma chave fixa resolve. Mas quando o resultado depende de quem está acessando, a chave precisa dizer isso:

```ruby
# Wrong: every user would see the same recommendations
Rails.cache.fetch("recommendations") { Recommendations.for(current_user) }

# Right: the key includes who the result belongs to
Rails.cache.fetch(["recommendations", current_user]) { Recommendations.for(current_user) }
```

No primeiro caso, a primeira pessoa que acessar define as recomendações de todo mundo. Em dados como carrinho ou permissões, isso deixa de ser um bug visual e vira vazamento de informação.

Mas tem o trade-off, pois durante esses dez minutos, o ranking pode estar desatualizado. A gente vai voltar nisso quando falar de TTL.

### SQL query caching

O _query_ cache é um mecanismo automático do Active Record. Se a mesma consulta SQL, com os mesmos parâmetros, rodar mais de uma vez durante uma requisição, o resultado da segunda vez vem do cache.

Ele não precisa de Redis nem de Solid Cache. O cache é criado no começo da action e descartado no final.

```ruby
class BooksController < ApplicationController
  def show
    title = Book.find(params[:id]).title
    price = Book.find(params[:id]).price

    render json: { title: title, price: price }
  end
end
```

A segunda chamada a `Book.find` aparece no log como `CACHE Book Load`, sem ir ao banco.

Onde esse tipo de cache ajuda de verdade é quando partes diferentes do código, que não se conhecem, acabam fazendo a mesma consulta na mesma requisição. 

Só que ele tem duas limitações importantes.

Primeiro, ele vive só durante a requisição. Não serve pra guardar um resultado por vários minutos, como o `Rails.cache.fetch`.

Segundo, ele guarda os dados que vieram do banco, não o objeto `Book`. No exemplo, cada `Book.find` ainda cria um objeto `Book` novo a partir desses dados. O banco é poupado, mas o Ruby continua tendo o trabalho de montar o objeto toda vez.

Por isso, buscar o livro uma vez e guardar numa variável continua sendo melhor do que contar com o query cache.

### HTTP caching

O _HTTP caching_ funciona em outra camada, a do protocolo HTTP. Ele usa cabeçalhos como `ETag`, `Last-Modified` e `Cache-Control` pra que o navegador (e caches intermediários, como uma CDN) possa reutilizar uma resposta ou perguntar ao servidor se ela mudou.

Pensa num leitor que abre de novo a página de um livro que não foi alterado desde a última visita:

```ruby
class BooksController < ApplicationController
  def show
    @book = Book.find(params[:id])
    fresh_when @book
  end
end
```

O `fresh_when` define o `ETag` e o `Last-Modified` a partir do livro. Na próxima visita, o navegador envia esses valores numa requisição condicional. Se nada mudou, o Rails responde `304 Not Modified`, sem corpo, e o navegador usa a cópia que já tem.

Um detalhe que costuma passar despercebido é que **o 304 não significa que o banco deixou de ser consultado.** O `Book.find` rodou do mesmo jeito, porque o Rails precisa do livro pra calcular o `ETag`. O que se economiza é a renderização e a transferência da resposta.

Por padrão, essas respostas são marcadas como privadas, ou seja, só o navegador do próprio usuário pode guardá-las. Existe a opção `public: true` pra permitir que proxies e CDNs também guardem.

Aqui é preciso ter cuidado. Uma página que mostra algo específico do usuário, como os itens do carrinho ou um "você já comprou este livro", nunca deveria ser marcada como pública. Senão um cache compartilhado pode entregar a página de uma pessoa pra outra.

A action também não chama `render`. Se nada mudou, o Rails responde com o 304. Se mudou, segue com a renderização padrão da view, como qualquer action. 

Se quiser relembrar como o controller monta a resposta, com `render`, `redirect_to` e o próprio `fresh_when`, tem o post sobre [controllers no Rails](/controllers-rails).

### Page caching e action caching (legado)

Esses dois aparecem em material mais antigo, então vale saber o que são, mesmo que não sejam a recomendação pra projetos novos. Os dois foram extraídos do Rails e hoje dependem de gems separadas (`actionpack-page_caching` e `actionpack-action_caching`).

O **page caching** salva o HTML gerado pela action como um arquivo na pasta `public/`. A partir daí, o servidor web entrega esse arquivo direto, sem passar pelo Rails, como se fosse uma página estática.

É muito rápido, mas só serve pra páginas iguais pra todos os visitantes, e o arquivo precisa ser apagado sempre que o conteúdo muda.

O **action caching** guarda a resposta da action, mas ainda deixa os filtros do controller rodarem antes, como uma autenticação. O risco é a chave não levar em conta o usuário ou a permissão, e uma pessoa receber o conteúdo montado pra outra.

Pra aplicações Rails atuais, faz mais sentido olhar primeiro pra HTTP caching, CDN e fragment caching.

## Como esses tipos se relacionam

Agora que a gente entendeu os tipos, vamos aprofundar no relacionamento entre eles, pois os nomes parecidos fazem tudo parecer uma coisa só, mas cada mecanismo guarda algo diferente:

| Mecanismo | O que guarda | Por quanto tempo |
| --- | --- | --- |
| Fragment caching | Pedaços de HTML renderizado | Até a versão ou o template mudar (ou expirar) |
| Russian doll | Fragmentos aninhados | Igual ao fragment caching, com dependências via `touch` |
| Low-level caching | Qualquer valor serializável | Até o TTL ou uma invalidação |
| Query cache | Resultado de SQL repetido | Só durante a requisição |
| HTTP caching | A resposta inteira, no cliente ou num proxy | Conforme os cabeçalhos HTTP |

A tabela mostra o que cada mecanismo guarda. Mas, no caso do fragment caching e do low-level caching, ainda falta responder **onde** esses dados ficam guardados e **até quando** eles valem.

É isso que a gente vai ver a seguir, começando pelo lugar onde o cache fica.

## Onde o cache fica

_Fragment caching_ e _low-level caching_ precisam de um lugar pra guardar os dados, o _cache store_, configurado em `config/environments/production.rb`.

Duas opções especialmente relevantes no ecossistema Rails hoje são o **Redis**, que guarda o cache em memória, e o **Solid Cache**, que guarda numa tabela de banco de dados e é o padrão em aplicações novas desde o Rails 8. Eles não são mais um tipo de cache, e sim o lugar onde esses tipos guardam o que precisam.

O código da aplicação não muda entre os dois, e o `Rails.cache.fetch` funciona da mesma forma. O que muda é custo, latência, capacidade e infraestrutura, e isso rende uma conversa à parte.

Se quiser entender essa comparação com calma, inclusive por que um cache guardado num banco de dados ainda consegue aliviar o banco, tem o post sobre [Redis e Solid Cache](/redis-vs-solid-cache).

## TTL: por quanto tempo uma entrada vale?

TTL (_Time To Live_) é o intervalo em que uma entrada do cache pode ser reutilizada. No Rails, é o `expires_in`.

Uma confusão comum é achar que TTL é um agendamento. **Ele não atualiza o valor a cada intervalo.** Ele só diz quando a entrada deixa de valer.

Pensa no ranking com TTL de 10 minutos:

- às 14h00, alguém acessa a página, dá _miss_, o ranking é calculado e guardado;
- às 14h02, acontecem várias compras novas;
- às 14h05, o ranking ainda mostra o resultado das 14h00;
- às 14h10, a entrada expira;
- se ninguém acessar a página até 14h30, nada é recalculado nesse meio tempo. O recálculo acontece na primeira leitura depois da expiração.

Isso é consequência direta do _cache-aside_, pois o cache só é preenchido quando alguém pede.

E se o negócio aceita dez minutos de atraso no ranking, mostrar o resultado das 14h00 às 14h05 não é um bug. É uma decisão.

### Como escolher o TTL?

TTL menor reduz o tempo de desatualização, mas aumenta os _misses_, os recálculos e a carga na fonte. TTL maior aproveita melhor o cache, mas aumenta o risco de mostrar informação antiga.

E o maior TTL que o negócio tolera não é necessariamente o melhor. A escolha também depende de:

- **custo da consulta**: quanto mais cara, mais vale reutilizar o resultado;
- **frequência de acesso**: um dado acessado poucas vezes por hora quase não aproveita o cache, mesmo com TTL longo;
- **experiência do usuário**: mesmo que 15 minutos sejam aceitáveis, talvez seja desejável mostrar algo mais recente.

No fim, o ideal é conversar com o time pra entender quanto tempo é aceitável a informação ficar desatualizada. Tudo vai depender de que dado estamos falando e da regra de negócio da aplicação.

## Invalidação: quando o tempo não basta

O TTL resolve a validade pelo tempo, mas às vezes o dado precisa refletir uma mudança antes disso. Se a livraria muda o preço de um livro, não dá pra esperar o TTL pra parar de mostrar o preço antigo.

Invalidar o cache é impedir que uma entrada antiga continue sendo usada quando a origem muda. Além do TTL, existem duas estratégias que ajudam a reagir às mudanças antes da expiração, que são a invalidação explícita e as chaves versionadas.

### Invalidação explícita

A aplicação remove a entrada quando acontece um evento relevante:

```ruby
book.update!(price: new_price)
Rails.cache.delete("book:#{book.id}:price")
```

| TTL | Invalidação explícita |
| --- | --- |
| A entrada expira depois de um tempo | A entrada é removida quando um evento acontece |
| Não precisa conhecer cada alteração na origem | Precisa saber quais alterações afetam quais entradas |
| Aceita dado antigo durante o intervalo | Reduz o período de desatualização |
| Mais simples de manter | Exige coordenação com todo lugar que altera o dado |

O exemplo parece simples, mas esconde um problema. Atualizar o banco e apagar o cache são duas operações separadas, e muita coisa pode acontecer entre elas.

Imagina duas requisições ao mesmo tempo. A requisição A dá _miss_ e lê o preço antigo no banco. Antes de ela gravar no cache, a requisição B atualiza o preço e apaga a entrada. Aí a A termina e grava o preço antigo no cache. Agora o valor desatualizado fica lá até o próximo TTL ou a próxima invalidação.

Por isso é comum combinar invalidação explícita com um TTL, que funciona como uma rede de segurança.

Um outro cuidado é que a invalidação explícita em dados que mudam o tempo todo pode acabar com o benefício do cache. Se cada compra invalidasse o ranking de mais vendidos, ele seria recalculado quase a cada requisição, então não faz sentido.

### Chaves versionadas

Em vez de apagar a entrada antiga, a gente passa a usar uma chave diferente quando o dado muda. É o que o Rails faz com registros do Active Record, e é o mesmo mecanismo que vimos no _fragment caching_:

```ruby
BOOK_SUMMARY_TTL = 1.hour

Rails.cache.fetch([book, "summary"], expires_in: BOOK_SUMMARY_TTL) do
  BookSummary.call(book)
end
```

Quando o livro é atualizado, o `updated_at` muda, a versão muda, e a entrada antiga simplesmente deixa de ser encontrada. Ninguém precisa lembrar de apagar nada.

Por baixo, o Rails usa dois métodos do registro. O `cache_key` identifica o livro (algo como `books/1`), e o `cache_version` vem do `updated_at`. Já o `cache_key_with_version` junta os dois numa string só.

Aqui vale a mesma atenção que no _Russian doll_. Se o resumo também depende das avaliações do livro, e uma avaliação nova não muda o `updated_at` do livro, a versão não muda. As dependências precisam estar refletidas na chave ou no `touch`.

### Granularidade: o tamanho de cada entrada

Nos exemplos de invalidação até aqui, cada alteração afetava uma única entrada. Mas isso depende de uma decisão tomada antes, quando a gente escolhe o que vai dentro de cada entrada do cache.

Essa decisão se chama **granularidade do cache**. Ela define se cada entrada guarda uma informação pequena e específica, ou um conjunto maior de informações de uma vez.

Pensa na página de autores em destaque da livraria, que mostra o perfil de três autores. Dá pra guardar isso de dois jeitos.

O primeiro é guardar a lista inteira numa entrada só. Isso é a **granularidade grossa**:

```ruby
FEATURED_AUTHORS_TTL = 1.hour

Rails.cache.fetch("authors:featured", expires_in: FEATURED_AUTHORS_TTL) do
  featured_authors.map { |author| AuthorProfile.call(author) }
end
```

A página inteira sai de uma única leitura ao cache. Mas, se um dos autores atualiza a biografia, a entrada fica desatualizada e a única saída é invalidar a lista toda. Os perfis dos outros dois, que continuavam corretos, são recalculados junto.

O segundo é dar a cada autor a própria entrada. Isso é a **granularidade fina**:

```ruby
AUTHOR_PROFILE_TTL = 1.hour

def cached_profile(author)
  Rails.cache.fetch("author:#{author.id}:profile", expires_in: AUTHOR_PROFILE_TTL) do
    AuthorProfile.call(author)
  end
end
```

Agora, quando um autor muda a biografia, dá pra apagar só a entrada dele:

```ruby
author.update!(bio: new_bio)
Rails.cache.delete("author:#{author.id}:profile")
```

Os outros perfis continuam vindo do cache, sem recálculo nenhum. Isso é a **invalidação granular**, e ela só é possível porque cada autor tem uma chave própria.

O custo é que montar a página passa a exigir uma leitura ao cache por autor, e mais trabalho pra juntar o resultado. Com muitos itens, isso começa a pesar, e é pra esse caso que o Rails tem o `Rails.cache.fetch_multi`, que busca várias chaves de uma vez.

Então a escolha vai depender de como o dado muda. Se os itens mudam separadamente e com frequência, a granularidade fina evita recálculos desnecessários. Se o conjunto costuma mudar inteiro, ou quase nunca muda, a granularidade grossa é mais simples.

O Russian doll, que a gente viu lá atrás, é uma forma de ter um pouco dos dois. Cada livro tem o próprio fragmento (fino), e o autor agrupa todos eles (grosso). Quando um livro muda, o fragmento do autor é refeito, mas os outros livros vêm prontos do cache.

## Consistência: o cache é uma cópia

Tudo isso leva a uma ideia que vale guardar. **O cache é uma cópia derivada da fonte de verdade.** E a fonte pode mudar antes de a cópia ser renovada.

Quando isso acontece, a gente tem um **dado desatualizado** (_stale data_). O banco já registra 320 vendas de um livro, mas o cache ainda guarda um ranking calculado quando eram 300.

Aceitar isso por um tempo é o que se chama de **consistência eventual**. Nesse caso, o sistema tolera divergência temporária, desde que exista um mecanismo (TTL, invalidação, versão) que faça a cópia convergir pro valor atual. Não é garantia de atualização imediata.

O quanto de divergência é aceitável depende da criticidade do dado. Um ranking pode estar alguns minutos atrasado sem prejuízo nenhum. A quantidade em estoque do último exemplar de um livro, no momento da compra, não pode.

Nesse caso, a vitrine pode até usar cache pra mostrar "em estoque", mas a finalização da compra precisa validar a disponibilidade atual no banco:

```ruby
Book.transaction do
  book = Book.lock.find(book_id)
  raise OutOfStockError if book.stock.zero?

  book.decrement!(:stock)
end
```

Invalidar o cache não resolveria esse problema sozinho. A invalidação não atualiza uma página que o cliente já abriu, e não impede que duas pessoas comprem o último exemplar ao mesmo tempo. Quem protege a regra crítica é a transação com lock no banco, não o cache.

Concorrência e transações merecem um post só delas, então aqui fica só a ideia central. Cache serve pra leitura tolerante a atraso, e a regra crítica fica na fonte de verdade.

## Quando o cache falha

Um cache bem configurado muda a forma como a aplicação se comporta sob carga. E isso significa que, quando ele falha, o comportamento muda de novo, às vezes de forma brusca.

### E se o Redis cair?

Vamos considerar um cenário ilustrativo, com 3.000 requisições por minuto num endpoint e 90% de cache hit. Só 300 delas chegam de fato ao banco.

Se o Redis fica indisponível e todas essas requisições passam a consultar o PostgreSQL, a carga pode ir de 300 pra 3.000 consultas por minuto. Dez vezes mais, de uma vez.

É uma simplificação, porque o impacto real depende das rotas e de como a aplicação trata o erro. Mas mostra que o banco pode ter sido dimensionado contando com o cache e talvez não aguente a mesma carga sem ele.

Existem algumas formas de lidar com isso:

**Fallback** é buscar os dados na fonte original quando o cache falha. Ajuda na disponibilidade, mas é exatamente o que gera a sobrecarga do exemplo. E não dá pra assumir que esse fallback acontece sempre do mesmo jeito, porque o comportamento depende do cache store, da configuração e do tratamento de erros da aplicação.

**Degradação graciosa** (_graceful degradation_) é desligar ou simplificar temporariamente funcionalidades não essenciais pra preservar as essenciais. Na livraria, isso seria parar de calcular o ranking de mais vendidos enquanto o banco está sob pressão, mantendo a busca e o checkout funcionando.

Um detalhe que faz diferença é que esconder o ranking só na interface não basta se o backend continuar executando a consulta cara.

**Circuit breaker** (disjuntor) é um mecanismo que, depois de várias falhas seguidas de uma dependência, para de tentar por um tempo e depois testa de novo de forma controlada. Ele evita insistir num Redis que está fora, mas não resolve sozinho a sobrecarga do banco.

### Cache stampede

O cache stampede acontece quando muitas requisições encontram a mesma entrada expirada ao mesmo tempo, e todas tentam recalculá-la juntas.

Imagina o ranking da página inicial expirando num horário de pico. Em vez de uma requisição recalcular e as outras aproveitarem, dezenas rodam a mesma agregação pesada no banco ao mesmo tempo.

O `Rails.cache.fetch` tem uma opção pra isso:

```ruby
RACE_CONDITION_TTL = 10.seconds

Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL, race_condition_ttl: RACE_CONDITION_TTL) do
  # expensive ranking query
end
```

Com `race_condition_ttl`, quando a entrada expira, a primeira requisição que encontra a expiração passa a recalcular o valor. Enquanto isso, as outras continuam recebendo o valor antigo por um breve período, em vez de irem todas ao banco.

Outras estratégias possíveis são coordenar o recálculo com um lock (só um processo recalcula, os outros esperam), espalhar a expiração de entradas parecidas pra que não expirem todas no mesmo instante, e servir o dado antigo por mais tempo quando o negócio permitir.

## Pra revisar depois

O raciocínio pra decidir sobre cache pode ser resumido assim:

1. **Investigar e medir** o gargalo antes de escolher cache.
2. **Escolher o que armazenar**: HTML renderizado (fragment), resultado de uma operação (low-level), consulta repetida na requisição (query cache) ou a resposta HTTP.
3. **Definir quanto de desatualização é aceitável** junto com o negócio.
4. **Escolher TTL, chave e invalidação** coerentes com o custo da leitura e a frequência das alterações.
5. **Proteger operações críticas** na fonte de verdade, não só com invalidação de cache.
6. **Planejar falhas e picos**: queda do cache store, stampede e o limite do banco sem o cache.
7. **Medir depois**: hit rate, latência e carga na fonte, pra confirmar que o ganho existe.

E alguns cenários pra consulta rápida:

| Cenário | Estratégia inicial plausível | Principal cuidado |
| --- | --- | --- |
| Endpoint JSON com ranking caro | Low-level caching com TTL | Atraso tolerável e custo de recalcular |
| Partial com HTML caro de renderizar | Fragment caching | Dependências que não mudam a versão do registro |
| Lista aninhada (autor com livros) | Russian doll com `touch: true` | Propagar a mudança do filho pro pai |
| Página pública de um livro | HTTP caching com `fresh_when` | Nunca marcar como pública uma resposta personalizada |
| Estoque no checkout | Sem cache na validação, só na vitrine | Transação e concorrência no banco |
| Cache store indisponível | Fallback controlado e degradação graciosa | Efeito cascata sobre o banco |

No fim, o cache troca parte do custo de processamento e leitura por armazenamento, complexidade operacional e desafios de consistência. Ele vale a pena quando essa troca é consciente, ou seja, quando a gente sabe o que está guardando, por quanto tempo, e o que acontece quando a cópia e a fonte divergem.

Pra se aprofundar:

- [Caching with Rails](https://guides.rubyonrails.org/caching_with_rails.html), o guia oficial, que cobre os mecanismos atuais de cache apresentados no post e a configuração dos cache stores;
- [Active Record Query Interface](https://guides.rubyonrails.org/active_record_querying.html), pra entender melhor as consultas que a gente está tentando evitar repetir.

Espero ter ajudado a deixar esse assunto um pouco mais claro.

Até a próxima!
