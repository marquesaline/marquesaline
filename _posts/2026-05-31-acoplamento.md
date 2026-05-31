---
layout: post
title: "Acoplamento: o que é, tipos e como desacoplar"
description: "Acoplamento é um dos conceitos mais importantes em arquitetura de software. Vamos explorar o que é acoplamento, por que ele importa e como pensar sobre ele além da dependência entre classes."
permalink: "/o-que-e-acoplamento"
date: 2026-05-31
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Quando falamos sobre arquitetura de software, uns dos tópicos que sempre aparece é a ideia de acoplamento e sempre que falamos sobre isso, pensamos muito em classes ou objetos que dependem uns dos outros. 

Esse tipo de pensamento não está errado, mas ele apenas resume uma ideia que vai além disso. 

Pra gente começar, vamos entender o que é acoplamento. 

## O que é acoplamento?

O acoplamento, segundo Mark Richards, é quando temos componentes conectados de tal forma que a alteração de um, vai impactar no comportamento de outro componente. 

Então, basicamente, estamos falando da dependência entre componentes de um sistema. 

Quanto mais acoplados os componentes, mais difícil se torna de manter ou testar, porque você sempre vai depender de outro componente pra isso.

E quando a gente fala de "componente", pode ser uma classe, um módulo, um serviço inteiro, ou até um time de desenvolvimento.

Vamos pensar em um exemplo.

Imagina um e-commerce com dois serviços separados: 

- Pedidos 
- Estoque

Toda vez que um novo pedido chega, o serviço de Pedidos chama o serviço de Estoque pra verificar se o produto está disponível, e só depois confirma o pedido pro cliente.

Esses dois serviços não compartilham código nenhum. São bases de código separadas, times diferentes. Mas eles são altamente acoplados, porque se o serviço de Estoque cair, o serviço de Pedidos para de funcionar junto.

Esse é um exemplo de acoplamento em nível de serviço, não de classe. E é justamente o tipo de coisa que a gente não enxerga quando pensa em acoplamento só no nível do código.

E pra entender melhor esse "além", o Mark Richards separa o acoplamento em dois tipos: estático e temporal.

## Tipos de acoplamento

### Estático

O acoplamento estático é sobre dependências estruturais, ou seja, coisas que existem independente do sistema estar rodando ou não. É o tipo de acoplamento que você vê olhando pra arquitetura, não pro comportamento.

Um exemplo clássico é o banco de dados compartilhado. Imagina que os serviços de Pedidos e de Relatórios do nosso e-commerce acessam a mesma tabela `orders` no banco.

```ruby
# order service
class OrderService
  def order_total(order_id)
    Order.where(id: order_id).sum(:value)
  end
end

# revenue report service
class RevenueReport
  def monthly_revenue
    Order.where("created_at >= ?", 30.days.ago).sum(:value)
  end
end
```

Os dois serviços nunca se chamam diretamente. Mas se a coluna `value` for renomeada pra `total_value`, os dois quebram. A dependência não está no código de um chamando o outro, está na estrutura compartilhada do banco.

### Temporal

O acoplamento temporal acontece quando dois componentes precisam estar disponíveis ao mesmo tempo pra que o sistema funcione.

Esse é exatamente o exemplo que a gente viu lá atrás: o serviço de Pedidos chamando o serviço de Estoque de forma síncrona. Se o Estoque estiver fora do ar, o Pedidos trava junto, porque ele precisa de uma resposta imediata pra continuar.

```ruby
# order service
class OrdersController < ApplicationController
  def create
    # se o InventoryService não responder, essa linha falha
    available = InventoryService.check_stock(params[:product_id])
    return render json: { error: "Out of stock" }, status: 422 unless available

    Order.create!(order_params)
  end
end
```

Não tem nada de errado no código em si. O problema é arquitetural: uma chamada síncrona cria uma dependência de tempo entre os dois serviços. Se um cai, o outro sente.

Agora que a gente entende o que é acoplamento e como ele aparece, vale falar sobre como reduzir isso.

## Como desacoplar

A resposta vai depender do tipo de acoplamento, então vamos olhar pra cada um separadamente.

Pra o acoplamento temporal, uma abordagem comum é trocar a chamada síncrona por comunicação assíncrona. Em vez de esperar uma resposta do Estoque pra confirmar o pedido, o serviço de Pedidos publica um evento e segue em frente.

```ruby
# antes: síncrono, acoplamento temporal
def create
  available = InventoryService.check_stock(params[:product_id])
  return render json: { error: "Out of stock" }, status: 422 unless available

  Order.create!(order_params)
end

# depois: assíncrono, sem acoplamento temporal
def create
  order = Order.create!(order_params.merge(status: :pending))
  OrderCreatedEvent.publish(order_id: order.id, product_id: params[:product_id])

  render json: order, status: :created
end
```

O pedido é criado com status `pending` e um evento é publicado. O serviço de Estoque escuta esse evento e processa quando conseguir. Se o Estoque estiver fora do ar, o Pedidos nem sabe, e nem precisa saber.

Já pra o estático, a ideia é evitar que um componente navegue pela estrutura interna de outro. É aqui que entra a **Lei de Demeter**.

### Lei de Demeter

A Lei de Demeter diz que um objeto deve falar só com seus vizinhos diretos, sem sair navegando pela estrutura de outros objetos. 

E o que seria vizinhos diretos?

Vizinhos diretos são o que o objeto conhece de primeira mão: ele mesmo, os parâmetros que ele recebe, e os objetos que ele criou ou já tem como atributo. Qualquer coisa que você precisa navegar por outro objeto pra chegar, não é vizinho direto.

O sinal de alerta é quando você vê uma cadeia longa de chamadas. 

Imagina um `InvoiceService` que precisa da cidade do cliente pra calcular o imposto:

```ruby
class InvoiceService
  def generate(order)
    city = order.customer.address.city
    tax_rate = TaxCalculator.rate_for(city)
    # ...
  end
end
```

O problema aqui é que `InvoiceService` sabe que `Order` tem um `Customer`, que tem um `Address`, que tem uma `city`. Ele está acoplado a toda essa cadeia. 

Se a estrutura de `Address` mudar, por exemplo, a cidade passar a ficar num objeto `Location`, o `InvoiceService` quebra mesmo sem ter nada a ver com esse modelo.

A solução é fazer `Order` expor só o que quem está de fora precisa saber. Em Rails, a gente faz isso com `delegate`:

```ruby
class Order < ApplicationRecord
  belongs_to :customer
  delegate :city, to: :shipping_address, prefix: :shipping

  def shipping_address
    customer.address
  end
end

class InvoiceService
  def generate(order)
    tax_rate = TaxCalculator.rate_for(order.shipping_city)
    # ...
  end
end
```

Agora `InvoiceService` só conhece `Order`. Se `Address` mudar internamente, só `Order` precisa ser atualizado. O acoplamento fica contido no lugar certo.

Não é uma regra absoluta, mas é um bom sinal de que um componente está sabendo demais sobre a estrutura interna de outro.

No fundo, a ideia é essa: cada objeto esconde a própria estrutura e expõe só o que precisa. Quem está de fora não precisa saber como as coisas estão organizadas por dentro.

Então, a gente entendeu um pouquinho sobre como funciona acoplamento. Esse é um daqueles conceitos que parece simples na definição, mas vai ficando mais interessante conforme você começa a enxergar ele em diferentes níveis.

Bom, espero que tenha conseguido te ajudar a entender um pouco mais sobre acoplamento.

Até a próxima!
