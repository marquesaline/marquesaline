---
layout: post
title: "Arquitetura em Camadas"
description: "Entenda o que é arquitetura em camadas, como o isolamento entre elas funciona, a diferença entre camadas fechadas e abertas, e os trade-offs desse estilo arquitetural."
permalink: "/arquitetura-em-camadas"
date: 2026-06-14
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Se você já trabalhou com Rails, provavelmente já usou arquitetura em camadas sem perceber. Ela está presente de um jeito ou outro em boa parte das aplicações que a gente constrói no dia a dia.

Mas o que exatamente é isso e por que importa? Vamos conversar sobre isso.

## O que é Arquitetura em Camadas?

Segundo o Mark Richards, a arquitetura em camadas (layered architecture) é um dos estilos arquiteturais mais comuns, especialmente em aplicações corporativas. A ideia é organizar o sistema em grupos de responsabilidades bem definidos, que chamamos de camadas. Cada camada tem um papel específico, e elas se comunicam de forma organizada entre si.

O objetivo principal é separar as responsabilidades pra que cada parte do sistema cuide de uma coisa só, sem precisar saber detalhes de implementação das outras.

Percebeu como isso é muito parecido com a forma que o Rails separa as pastas e arquivos?!

Um exemplo clássico é a divisão em três camadas: apresentação, negócio e dados.

- **Apresentação** é a camada que interage com o usuário. No contexto web, é onde estão as views, os controllers, as respostas HTTP.
- **Negócio** é onde fica a lógica da aplicação. As regras, os processos, o que o sistema realmente faz.
- **Dados** é responsável pelo acesso e persistência das informações, seja num banco de dados, cache, ou serviço externo.

Em uma aplicação Rails, isso aparece de uma forma bem direta:

```
Apresentação  →  Controllers, Views
Negócio       →  Models, Service Objects
Dados         →  ActiveRecord, repositórios
```

Quando um usuário faz uma requisição, ela chega no controller (apresentação), que chama a lógica de negócio, que por sua vez acessa os dados. O fluxo vai descendo pelas camadas.

## Isolamento entre Camadas

Beleza, mas ter camadas não é suficiente. O que faz esse estilo funcionar de verdade é o isolamento entre elas.

Isolamento significa que cada camada conhece só o que precisa pra fazer o próprio trabalho. 

A camada de apresentação não precisa saber como os dados são armazenados no banco. A camada de dados não precisa entender as regras de negócio.

Isso é garantido pelos **contratos entre as camadas**. Cada camada expõe uma interface clara pro que está acima dela. A camada de cima chama essa interface, sem depender dos detalhes de como ela foi implementada por baixo.

Pensa assim comigo: o controller chama `OrderService.complete(order)`. Ele não precisa saber se isso vai no banco, mandar um email, chamar uma API externa ou qualquer outra coisa. Ele só sabe que existe esse contrato e o que vai receber de volta.

Isso reduz o acoplamento entre as partes do sistema. Se você precisar mudar como o pedido é finalizado, muda o service. O controller não precisa ser tocado.

Ahh e se quiser saber mais sobre acoplamento, sugiro que você dê uma olhada nesse post [aqui](/o-que-e-acoplamento).

Vamos ver um exemplo. Imagina um controller que busca os pedidos recentes de um usuário:

```ruby
# sem isolamento: o controller sabe demais
class OrdersController < ApplicationController
  def index
    @orders = Order.where(user_id: current_user.id)
                   .where("created_at >= ?", 30.days.ago)
                   .order(created_at: :desc)
  end
end
```

Esse controller está navegando direto pela estrutura do banco. Se a query mudar, o controller muda junto.

Com isolamento:

```ruby
# com isolamento: o controller só conhece o contrato
class OrdersController < ApplicationController
  def index
    @orders = Order.recent_for(current_user)
  end
end

class Order < ApplicationRecord
  scope :recent_for, ->(user) {
    where(user: user)
      .where("created_at >= ?", 30.days.ago)
      .order(created_at: :desc)
  }
end
```

Agora o controller só sabe que existe um `recent_for`. Os detalhes ficam escondidos dentro da camada de dados.

E o que acontece quando esse contrato é ignorado? 

Imagina que outro lugar da aplicação também precisa dos pedidos recentes de um usuário. Sem isolamento, alguém vai copiar a mesma query no novo controller. Quando a regra mudar, por exemplo, o prazo passar de 30 pra 60 dias, quem lembra de atualizar em todo lugar? Esse é o tipo de problema que começa pequeno e vai crescendo junto com a aplicação.

Com o `recent_for` centralizado no model, a mudança acontece em um lugar só. Quem chama não precisa nem saber que algo mudou.

Esse isolamento define também como o fluxo acontece. Cada requisição percorre as camadas em sequência, de cima pra baixo. A apresentação chama o negócio, o negócio chama os dados. Sempre nessa ordem.

Mas aí surge uma pergunta: esse fluxo é sempre obrigatório? Toda requisição precisa passar por todas as camadas?

A resposta depende de como as camadas estão definidas no sistema. E é aí que entra a distinção entre camadas fechadas e abertas.

## Tipos de Camadas

### Camadas Fechadas

Num modelo de camadas fechadas, uma requisição precisa passar por todas as camadas, em ordem, sem pulos.

Ou seja, a requisição vem da apresentação, passa pelo negócio, chega nos dados. Ela não pode ir direto da apresentação pro banco, pulando o meio do caminho.

```
Apresentação
     ↓
  Negócio
     ↓
   Dados
```

Isso reforça o isolamento porque garante que cada camada só vai interagir com a camada imediatamente abaixo dela. Nenhuma camada tem acesso direto a coisas que não são da sua vizinhança.

**Vantagens:**

O principal ganho é que o isolamento fica garantido pela estrutura, não pela disciplina dos devs. Isso é importante especialmente em times maiores, com devs entrando e saindo. Confiar que todo mundo vai respeitar os contratos por conta própria é arriscado. Com camadas fechadas, a arquitetura impõe isso automaticamente.

Além disso, o fluxo de uma requisição fica fácil de acompanhar. Você sabe que ela sempre vai percorrer a mesma sequência, então quando algo quebra, você sabe onde procurar.

**Desvantagens:**

O problema aparece nos casos simples. 

Imagina uma tela de relatório que só precisa contar quantos pedidos foram feitos no mês. Não tem regra de negócio nenhuma envolvida, é só uma consulta direta ao banco. Mas com camadas fechadas, você ainda assim precisa criar um service que chama o model, que chama o banco. São camadas só pra cumprir o protocolo, sem agregar nada.

Em sistemas com muito volume, isso também pode pesar na performance. Cada requisição passa por mais pontos, o que significa mais tempo de execução. 

Mark Richards chama esse problema de _sinkhole anti-pattern_: quando a maior parte das requisições só passa pelas camadas sem nenhuma lógica, o custo da indireção começa a não valer a pena.

E aí vem a alternativa pra quando esse caminho obrigatório começa a pesar mais do que ajuda.

### Camadas Abertas

No modelo de camadas abertas, algumas camadas são opcionais. A requisição pode pular uma delas quando fizer sentido.

```
Apresentação
     ↓
  Negócio   ← pode ser pulado
     ↓
   Dados
```

Imagina que você tem um endpoint que só precisa listar os status disponíveis de um pedido. Não tem lógica de negócio nenhuma envolvida. Nesse caso, faz sentido o controller acessar o dado direto:

```ruby
class OrdersController < ApplicationController
  def statuses
    render json: Order.statuses.keys
  end
end
```

Sem passar por serviço nenhum, sem indireção. Simples, rápido, direto.

**Vantagens:**

Pra casos assim, onde a camada do meio não faz nada de útil, a flexibilidade de pular é bem-vinda. O código fica mais enxuto e você evita criar abstrações que existem só pra existir.

**Desvantagens:**

O risco é o time começar a pular camadas com frequência, sem critério. No começo parece razoável: "esse caso é simples, não precisa do service". Mas isso vai acumulando, e com o tempo fica difícil saber quais exceções foram justificadas e quais viraram atalho. O fluxo de uma requisição deixa de ser previsível, e entender o sistema inteiro fica mais trabalhoso.

Na prática, a maioria das aplicações usa uma mistura dos dois modelos. Camadas fechadas como regra geral, com exceções pontuais onde pular faz sentido, desde que o time seja disciplinado em distinguir um do outro.

Agora que já entendemos o que são as camadas e como elas se relacionam, vale a pena olhar pra esse estilo com um olho mais crítico: o que ele resolve bem e onde ele começa a mostrar limitações?

## Trade-offs da Arquitetura em Camadas

Como qualquer decisão de arquitetura, não tem certo ou errado absoluto. Vai depender do contexto da aplicação.

Do lado positivo, é um estilo simples de entender e fácil de explicar pra times. Qualquer dev que chega num projeto organizado em camadas consegue se localizar rapidamente: onde fica a lógica? No negócio. Onde fica a query? Nos dados. O fluxo segue uma direção clara e cada parte tem uma responsabilidade definida, o que facilita manter e testar.

Do lado negativo, em sistemas simples pode gerar indireção desnecessária. Às vezes você cria uma camada de serviço que só repassa a chamada pro model, sem fazer nada de especial. Código a mais sem ganho real.

Tem também o risco de exagerar nas abstrações. Pode virar hábito criar [service objects](/services-objects-rails), repositórios e interfaces pra tudo, mesmo quando não precisa. Abstrações têm custo. São mais arquivos, mais saltos pra entender o código, mais coisa pra manter.

E quando a aplicação cresce muito, aparecem dois problemas que andam juntos:

- A camada de negócio pode virar um balaio enorme, com service objects de domínios completamente diferentes jogados no mesmo lugar.
- Esse modelo te leva a pensar em "onde tecnicamente esse código vai?" mas não necessariamente em "a que parte do negócio isso pertence?". Em sistemas maiores, organizar por domínios costuma fazer mais sentido do que organizar por tipo técnico.

Dito isso, esses problemas tendem a aparecer quando a aplicação já cresceu bastante. Pra maior parte dos casos do dia a dia, a arquitetura em camadas resolve bem o que precisa ser resolvido.

Espero que tenha ficado mais claro como esse estilo funciona!

Até a próxima.
