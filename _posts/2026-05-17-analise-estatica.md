---
layout: post
title: "Análise Estática: além do lint"
description: "Análise estática é frequentemente associada a padronização de código, mas vai muito além disso. Neste post exploro como ferramentas como RuboCop, Brakeman e Packwerk protegem características arquiteturais diferentes de uma aplicação Rails."
permalink: "/analise-estatica"
date: 2026-05-17
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Esses dias estudando Arquitetura de Software, me deparei com as fitness functions (funções de aptidão), que é um conceito que aparece bastante dentro da arquitetura e que se refere a mecanismos automatizados utilizados para verificar continuamente se a aplicação continua respeitando determinadas regras estruturais e características arquiteturais definidas pelo time.

A ideia é que a arquitetura de uma aplicação não dependa apenas da memória dos devs pra implementar ou de uma documentação que muitas vezes só é lida no onboarding. A arquitetura precisa ser validada continuamente, e as fitness functions ajudam justamente nisso.

Mas algo importante é que fitness function não é uma ferramenta específica, e sim um conceito arquitetural que pode ser aplicado de várias formas diferentes.

Ferramentas de análise estática, testes automatizados, pipelines de CI/CD, observabilidade e monitoramento podem ser utilizadas como formas de implementar fitness functions na prática, desde que estejam validando continuamente alguma regra importante ou característica arquitetural da aplicação.

Então, o que quero explorar neste post é uma dessas formas de aplicação: a análise estática.

## O que é análise estática?

A análise estática é uma técnica que envolve analisar o código sem executar a aplicação. Isso significa que não vamos subir o servidor, rodar requests, clicar em algo na interface ou executar algum fluxo real do sistema.

A análise acontece diretamente no código-fonte e tenta identificar padrões, riscos e problemas que conseguem ser detectados antes mesmo da aplicação rodar.

Dependendo da ferramenta, isso pode envolver análise de complexidade, dependências entre módulos, vulnerabilidades de segurança, convenções do projeto, [acoplamento](/o-que-e-acoplamento) indevido e outras questões relacionadas à estrutura do sistema.

Na prática, análise estática pode ser utilizada pra detectar coisas como código morto, variáveis não utilizadas, alta complexidade, vulnerabilidades, dependências proibidas entre partes da aplicação, quebras de convenção e vários outros tipos de problema.

Vamos a um exemplo:

```ruby
class OrdersController < ApplicationController
  def index
    if params[:status].present?
      @orders = Order.where("status = '#{params[:status]}'")
    else
      @orders = Order.all
    end

    if params[:user_id].present?
      @orders = @orders.where(user_id: params[:user_id])
    end

    @orders = @orders.order("created_at #{params[:direction]}")
  end
end
```

Lendo esse código, uma ferramenta de análise estática já poderia levantar alguns pontos de atenção.

O primeiro problema está na forma como a query é montada:

```ruby
Order.where("status = '#{params[:status]}'")
```

Como o valor vem direto de `params`, existe risco de SQL Injection. Uma ferramenta como o Brakeman poderia apontar esse trecho como vulnerável, porque a aplicação está interpolando input externo diretamente dentro de uma query SQL.

Outro ponto parecido aparece no `order`:

```ruby
@orders.order("created_at #{params[:direction]}")
```

Aqui também existe entrada do usuário influenciando diretamente a query. Mesmo que a intenção seja permitir apenas `asc` ou `desc`, o código não garante isso. O mais seguro seria validar explicitamente quais valores são permitidos antes de usar esse parâmetro.

Além da parte de segurança, uma ferramenta como RuboCop também poderia reclamar da complexidade do método. O `index` começa simples, mas já tem condicionais, montagem de query e regra de filtragem tudo no mesmo lugar. Em um caso real, esse tipo de método tende a crescer com mais filtros, mais ordenações e mais regras de permissão.

Esse exemplo mostra uma coisa importante: análise estática não precisa executar o fluxo para perceber riscos. Ela consegue olhar para a estrutura do código e identificar padrões que costumam indicar problema, como input externo usado em query, métodos crescendo demais ou responsabilidades misturadas no controller.

## Que tipos de problemas a análise estática tenta resolver?

Uma coisa que começou a me chamar atenção estudando análise estática é que ela não tenta resolver apenas um tipo de problema.

Antes de estudar isso, eu tinha uma visão muito simplificada de que ferramentas desse tipo serviam basicamente pra “padronizar código” ou reclamar de estilo. Mas na prática, existem ferramentas diferentes tentando proteger coisas completamente diferentes dentro do sistema.

Tem ferramentas mais voltadas pra consistência e convenções do projeto, outras focadas em vulnerabilidades de segurança, e outras tentando controlar complexidade ou acoplamento indevido entre módulos da aplicação.

Foi aí que a coisa ficou mais interessante: análise estática vai muito além de lint.

Em aplicações Rails, por exemplo, uma ferramenta pode tentar identificar risco de SQL Injection sem executar a aplicação, enquanto outra pode analisar se determinados módulos estão se acoplando de uma forma que o time decidiu evitar arquiteturalmente.

Ferramentas diferentes acabam protegendo características diferentes do sistema.

### Ferramentas no ecossistema Ruby/Rails

Quando comecei a pesquisar mais sobre análise estática no ecossistema Ruby/Rails, algumas ferramentas apareceram constantemente. Mas o que me chamou atenção foi que elas não tentam resolver o mesmo tipo de problema.

Cada uma delas parece focar em proteger uma característica diferente da aplicação.

#### Rubocop 

Uma das ferramentas mais conhecidas no ecossistema Ruby é o [RuboCop](https://rubocop.org){:target="_blank" rel="noopener noreferrer"}.

A princípio, é comum associar o RuboCop apenas a padronização de código, como aspas simples ou duplas, tamanho de linha, espaçamento e convenções de escrita. E isso realmente faz parte do papel dele.

Mas o RuboCop vai além disso. Ele também consegue observar problemas relacionados à complexidade e manutenibilidade do código.

Por exemplo, imagine um método assim:

```ruby
def process_order(order)
  if order.paid?
    if order.items.any?
      if order.customer.active?
        send_confirmation_email(order)
        update_inventory(order)
        notify_analytics(order)
      else
        cancel_order(order)
      end
    else
      mark_as_invalid(order)
    end
  else
    send_payment_reminder(order)
  end
end
```

Mesmo sem executar esse código, uma ferramenta como o RuboCop poderia apontar que esse método tem muita complexidade, muitos caminhos possíveis e responsabilidades demais concentradas no mesmo lugar, um sinal de que esse método está violando o [princípio da responsabilidade única](/single-responsibility).

O problema aqui não é apenas "o código está feio". Métodos assim tendem a ser mais difíceis de testar, mais difíceis de modificar e mais fáceis de quebrar quando uma nova regra de negócio aparece.

Nesse sentido, o RuboCop pode ajudar a proteger uma característica arquitetural importante: a **manutenibilidade**.

Ele não garante que a arquitetura da aplicação está boa, mas pode funcionar como um sinal de alerta quando partes do código começam a crescer demais ou acumular responsabilidades.

#### Brakeman

O [Brakeman](https://brakemanscanner.org){:target="_blank" rel="noopener noreferrer"} vai numa direção diferente. Em vez de olhar pra complexidade ou convenções, ele tenta identificar vulnerabilidades de segurança na aplicação.

Um exemplo:

```ruby
User.where(“email = '#{params[:email]}'”)
```

Esse trecho interpolando params direto na query é um padrão clássico de SQL Injection. O Brakeman consegue identificar isso sem precisar rodar o sistema, apenas lendo a estrutura do código.

Outro tipo de vulnerabilidade que o Brakeman também detecta é XSS, e um exemplo comum no Rails aparece com o `html_safe`:

```ruby
def show
  render html: params[:message].html_safe
end
```

O `html_safe` é uma forma de dizer pro Rails "pode confiar nessa string, não precisa escapar". Por padrão o Rails escapa qualquer conteúdo antes de renderizar no browser justamente pra evitar isso. Quando você usa `html_safe` com um valor de params, qualquer coisa que o usuário mandar vai ser renderizada direto na página, incluindo scripts. Isso abre espaço pra XSS, que é quando alguém consegue injetar e executar código no browser de outra pessoa.

O Brakeman aponta esse padrão porque a combinação de `html_safe` com input externo é um sinal claro de risco.

Isso foi o que começou a deixar mais claro pra mim que análise estática tem muito mais a ver com reduzir risco do que com padronizar código, e que isso se conecta diretamente com características arquiteturais como **segurança** e **confiabilidade**.

#### Packwerk 

Uma das ferramentas que mais me chamou atenção estudando esse assunto foi o [Packwerk](https://github.com/Shopify/packwerk){:target="_blank" rel="noopener noreferrer"}.

Enquanto ferramentas como RuboCop e Brakeman analisam mais qualidade e segurança do código, o Packwerk tenta resolver um problema mais arquitetural: controlar dependências entre partes da aplicação.

A ideia dele é permitir criar boundaries dentro de um monólito Rails, definindo quais partes do sistema podem ou não depender umas das outras.

Isso pode parecer exagero no começo, mas em aplicações grandes é muito comum que os módulos da aplicação comecem a se acoplar cada vez mais com o tempo.

Por exemplo:

- um módulo de billing acessando diretamente código interno de analytics
- um contexto de pagamentos dependendo de detalhes do sistema de notificações
- um serviço de envio de email acoplado a regras de negócio de outro domínio

No início isso pode parecer só um atalho pequeno. Mas conforme o sistema cresce, essas dependências começam a deixar a aplicação mais difícil de modificar, testar e evoluir.

O que o Packwerk faz é transformar essas regras arquiteturais em verificações automatizadas.

Ou seja, ao invés da arquitetura depender apenas de documentação ou code review, a própria ferramenta consegue avisar quando determinadas dependências consideradas inválidas começam a aparecer dentro do sistema.

Existem muitas outras ferramentas além dessas. Mas olhando pra RuboCop, Brakeman e Packwerk juntos, o que fica é que cada uma está tentando impedir que um tipo diferente de problema cresça silenciosamente dentro da aplicação, seja complexidade, vulnerabilidades ou acoplamento indevido.

Quando comecei a estudar esse assunto, achei que análise estática era basicamente uma ferramenta de estilo. O que não esperava é que ela fosse uma das formas mais práticas de fazer a arquitetura de uma aplicação parar de viver só na cabeça do time e começar a ser verificada automaticamente.

Não é sobre escolher a ferramenta certa. É sobre decidir quais características da aplicação precisam ser protegidas e garantir que essa proteção aconteça de forma contínua, não apenas no code review ou na documentação.

