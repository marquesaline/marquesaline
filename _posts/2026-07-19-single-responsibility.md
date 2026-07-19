---
layout: post
title: "Single Responsibility (SRP): pensando além das classes"
description: "Entenda o princípio da responsabilidade única (SRP), como ele funciona nas classes e como pensar sobre ele em aplicações maiores, com vários serviços."
permalink: "/single-responsibility"
date: 2026-07-19
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Hoje vamos conversar sobre o Single Responsibility. Se você já ouviu falar do SOLID, com certeza já esbarrou nesse princípio, ele é o "S" do acrônimo.

É um dos princípios mais conhecidos quando o assunto é design de código. A Sandi Metz dedica um capítulo inteiro a ele no Practical Object-Oriented Design, e o Robert C. Martin fala bastante sobre isso tanto no Clean Code quanto no Clean Architecture.

Apesar de ser um princípio bem conhecido, ele fica bem mais escorregadio quando você tenta aplicar fora do exemplo clássico de uma classe isolada.

Então bora entender o que é, ver como ele aparece numa classe, e depois expandir esse pensamento pra um contexto de aplicação maior, onde não é só classe que existe, tem serviço, módulo, job, várias coisas acontecendo ao mesmo tempo.

## O que é Single Responsibility?

Segundo a Sandi Metz, **uma classe deve fazer a menor coisa útil possível**. Ou seja, ela deve ter uma única responsabilidade.

A frase mais famosa sobre isso, do Robert C. Martin, é: uma classe deve ter um, e apenas um, motivo pra mudar.

A definição não fala em "fazer uma coisa só", fala em "motivo pra mudar". Essa diferença importa bastante, e a gente volta nela mais pra frente.

Vamos ver um exemplo. Imagina uma classe `Order` num e-commerce:

```ruby
class Order < ApplicationRecord
  def total
    items.sum { |item| item.price * item.quantity }
  end

  def apply_discount(coupon)
    total - coupon.value
  end

  def send_confirmation_email
    OrderMailer.confirmation(self).deliver_now
  end
end
```

Essa classe calcula o total do pedido, aplica desconto e ainda manda email. 

Então, são três motivos diferentes pra essa classe mudar: 
- a regra de cálculo do total
- a regra de desconto 
- o jeito que a confirmação é enviada

Se qualquer uma dessas três coisas mudar, `Order` muda junto, mesmo que as outras duas continuem exatamente iguais.

Dá pra separar assim:

```ruby
class Order < ApplicationRecord
end

class OrderPricer
  def self.total(order)
    order.items.sum { |item| item.price * item.quantity }
  end
end

class DiscountCalculator
  def self.apply(order, coupon)
    OrderPricer.total(order) - coupon.value
  end
end

class OrderConfirmationMailer
  def self.send(order)
    OrderMailer.confirmation(order).deliver_now
  end
end
```

Agora cada classe tem um motivo só pra mudar. Se a regra de desconto mudar, só `DiscountCalculator` é tocado. `Order` continua do mesmo jeito.

Talvez você esteja pensando "poxa, mas isso não é criar classe demais?!" 

Essa é uma dúvida bem comum. O próprio Robert C. Martin fala sobre esse medo, de criar muitas classes pequenas e o código ficar espalhado demais pra acompanhar.

E do meu ponto de vista, isso é um trade-off. Ou você simplifica pensando na manutenção futura, ou mantém tudo junto com medo de "criar código demais" e paga esse preço mais na frente, na hora de mexer numa regra sem afetar as outras.

Então sim, separar demais pode parecer exagero, principalmente no começo e em projetos pequenos. Mas em aplicações grandes, com muita gente mexendo no mesmo código, essa separação tende a compensar bastante lá na frente.

E no fundo, é uma escolha, não tem certo ou errado absoluto. A própria Sandi Metz fala sobre isso no livro:

> _A good designer understands this tension and minimizes costs by making informed tradeoffs between the needs of the present and the possibilities of the future._

Traduzindo: um bom designer entende essa tensão e minimiza os custos fazendo trade-offs conscientes entre as necessidades do presente e as possibilidades do futuro.

Além disso, vale a gente conversar rapidamente sobre algumas boas práticas que a Sandi Metz traz no livro, que ajudam o código a continuar respeitando SRP conforme ele evolui, sem precisar de refatorar tudo toda vez que uma regra muda.

Um ponto que ela levanta é **evitar acessar as variáveis de instância direto dentro da própria classe**. Parece bobagem à primeira vista, mas usar `@type` e `@value` direto em vários métodos diferentes vai espalhando pela classe inteira o conhecimento de como esses dados são guardados:

```ruby
class Coupon
  def initialize(value, type)
    @value = value
    @type = type
  end

  def apply(total)
    @type == :percentage ? total - (total * @value / 100.0) : total - @value
  end
end
```

Escondendo essas variáveis atrás de métodos, qualquer regra nova sobre elas fica concentrada num lugar só:

```ruby
class Coupon
  def initialize(value, type)
    @value = value
    @type = type
  end

  def apply(total)
    percentage? ? total - (total * value / 100.0) : total - value
  end

  private

  attr_reader :value, :type

  def percentage?
    type == :percentage
  end
end
```

Se a regra de "o que é um cupom percentual" mudar, só o `percentage?` precisa mudar.

Ela também fala de um problema parecido com estruturas de dados cruas, tipo array e hash. **Se o código depende da posição num array ou da chave de um hash pra funcionar, qualquer mudança na estrutura quebra tudo que depende dela**:

```ruby
def total(line_items)
  line_items.sum { |item| item[:price] * item[:quantity] }
end
```

Se alguém renomear a chave `:price` pra `:unit_price`, esse método quebra, e provavelmente não é o único lugar acessando esse hash desse jeito. Encapsular isso num objeto resolve:

```ruby
LineItem = Struct.new(:price, :quantity) do
  def subtotal
    price * quantity
  end
end

def total(line_items)
  line_items.sum(&:subtotal)
end
```

Quem chama `total` não precisa saber como um `LineItem` guarda seus dados internamente, só que ele responde a `subtotal`.

E por último, esse mesmo raciocínio vale também dentro dos métodos, não só entre classes. 

Um método que valida, calcula e formata ao mesmo tempo tem, na prática, os mesmos motivos pra mudar que uma classe mal dividida teria, só numa escala menor:

```ruby
def apply(total)
  raise ArgumentError, "invalid coupon" if value.negative?
  percentage? ? total - (total * value / 100.0) : total - value
end
```

Separar validação de cálculo resolve isso do mesmo jeito:

```ruby
def apply(total)
  validate!
  percentage? ? total - (total * value / 100.0) : total - value
end

private

def validate!
  raise ArgumentError, "invalid coupon" if value.negative?
end
```

Até aqui, é o exemplo mais comum que a gente vê quando fala de SRP. Mas e quando a gente sai do nível da classe?

## Single Responsibility além das classes

A gente conversou sobre o SRP numa classe relativamente isolada. Nesse cenário, a gente só precisa se perguntar quais comportamentos realmente pertencem a esse objeto?

É o tipo de raciocínio que a Sandi Metz propõe ao "interrogar" uma classe. Se um método parece responder a uma pergunta que não deveria ser feita àquele objeto, talvez exista uma responsabilidade no lugar errado.

Numa aplicação real, porém, existem muito mais candidatos pra receber uma responsabilidade. Uma regra pode ficar numa entidade, um value object, um use case, uma policy, um job, um adapter ou algum outro componente da aplicação.

Por isso, a pergunta deixa de ser apenas "essa classe faz mais de uma coisa?" e passa a ser "quem deveria conhecer ou executar esse comportamento?".

Vamos voltar pro mesmo `Order` que a gente usou lá em cima. Perguntas sobre o estado dele, os itens ou o valor total continuam sendo problema do próprio pedido, isso não muda:

```ruby
order.total
order.issued?
order.line_items
```

Mas nem tudo que menciona "pedido" é responsabilidade do `Order`. 

Mandar o email de confirmação, cobrar o cliente ou coordenar todo o fluxo de finalização são responsabilidades diferentes, cada uma com seu próprio motivo pra mudar. Elas podem ficar num mailer, num client de pagamento ou num use case que orquestra o processo inteiro:

```ruby
OrderConfirmationMailer.send(order)
PaymentGatewayClient.charge(order)
SubmitOrder.call(order)
```

O SRP continua sendo o mesmo princípio de sempre. O que muda numa aplicação maior é a quantidade de lugares possíveis pra aquela responsabilidade morar, e isso é o que torna mais difícil de enxergar.

Outra definição do Robert C. Martin ajuda bastante nesse ponto. Segundo ele, um "motivo pra mudar" está ligado a uma pessoa ou grupo de pessoas interessado naquela mudança, o que ele chama de ator.

Isso fica mais fácil de ver quando a gente olha pra um componente inteiro, e não só pra métodos soltos. Imagina um componente chamado `OrdersService`:

```ruby
class OrdersService
  def process(order_params)
    Order.create!(order_params)
  end

  def monthly_report
    Order
      .where("created_at >= ?", 30.days.ago)
      .group(:status)
      .count
  end

  def notify_marketing(order)
    MarketingNotifier.order_confirmed(order)
  end
end
```

À primeira vista, os métodos parecem relacionados porque todos mencionam pedidos. Mas eles representam conhecimentos diferentes:

- `process` conhece as regras operacionais de criação de pedidos
- `monthly_report` conhece necessidades de análise e relatórios
- `notify_marketing` conhece o processo de comunicação de marketing

Fazer três coisas nem é bem o problema. O problema é que essas três partes podem mudar de forma independente, por necessidades diferentes.

Uma nova regra de criação de pedidos não deveria obrigar o mesmo componente a mudar junto com a geração de relatórios. Da mesma forma, uma alteração na comunicação de marketing não deveria colocar em risco o processamento de pedidos.

Podemos separar essas responsabilidades:

```ruby
class ProcessOrder
  def call(order_params)
    Order.create!(order_params)
  end
end

class MonthlySalesReport
  def generate
    Order
      .where("created_at >= ?", 30.days.ago)
      .group(:status)
      .count
  end
end

class NotifyMarketingAboutOrder
  def call(order)
    MarketingNotifier.order_confirmed(order)
  end
end
```

Os nomes exatos não importam, nem o fato de termos criado três classes. O que importa é que cada componente agora concentra conhecimentos que tendem a mudar juntos.

No fundo, o `OrdersService` ainda é só uma classe. É assim que a gente sempre vai expressar qualquer unidade em Ruby, seja um domínio, um módulo ou um serviço inteiro, a sintaxe não muda. O que muda é o que aquele componente representa dentro da aplicação, e quantos atores diferentes dependem dele.

Essa mesma lógica aparece em unidades que a gente nem costuma pensar como "classe", tipo um job. Imagina um job que fecha o checkout de um pedido:

```ruby
class CheckoutJob < ApplicationJob
  def perform(order)
    order.update!(status: :paid)
    InvoiceGenerator.call(order)
    LoyaltyPointsCalculator.credit(order)
    MarketingNotifier.order_confirmed(order)
  end
end
```

O job não conhece as regras internas de cada etapa, quem calcula os pontos é o `LoyaltyPointsCalculator`, quem gera a nota é o `InvoiceGenerator`. O que o `CheckoutJob` concentra é a orquestração: a decisão de quais passos acontecem, em que ordem, e o que fazer quando um deles falha.

E aí mora o problema, os quatro passos passam a dividir o mesmo destino, se qualquer um falhar, o ActiveJob tenta o job inteiro de novo. Uma falha no `MarketingNotifier`, por exemplo, faz o job reprocessar o pagamento e gerar a nota fiscal outra vez, mesmo que essas duas etapas já tivessem dado certo na primeira tentativa.

Se o time fiscal quiser que a emissão da nota tenha sua própria política de retry, sem re-executar pagamento e fidelidade junto, é o `CheckoutJob` inteiro que precisa mudar, porque a orquestração dos quatro passos vive num lugar só. 

Aqui, o motivo pra mudar é a coordenação entre os times, não o conhecimento das regras de cada um. Mesmo problema do `OrdersService`, só que a unidade agora é um job.

Dá pra corrigir isso separando a orquestração da execução. Em vez do job chamar as quatro etapas em sequência, dividindo o mesmo destino, cada etapa vira seu próprio job, disparado de forma independente.

```ruby
class CheckoutJob < ApplicationJob
  def perform(order)
    order.update!(status: :paid)

    GenerateInvoiceJob.perform_later(order)
    CreditLoyaltyPointsJob.perform_later(order)
    NotifyMarketingJob.perform_later(order)
  end
end

class GenerateInvoiceJob < ApplicationJob
  def perform(order)
    InvoiceGenerator.call(order)
  end
end

class CreditLoyaltyPointsJob < ApplicationJob
  def perform(order)
    LoyaltyPointsCalculator.credit(order)
  end
end

class NotifyMarketingJob < ApplicationJob
  def perform(order)
    MarketingNotifier.order_confirmed(order)
  end
end
```

Agora o `CheckoutJob` tem uma responsabilidade só: confirmar o pagamento e disparar as outras etapas, sem esperar nem depender do resultado delas. Cada etapa enfileirada roda de forma independente, se `NotifyMarketingJob` falhar, só ele é reprocessado pelo ActiveJob. Pagamento e nota fiscal não são tocados de novo.

E cada job passa a ter um motivo só pra mudar, que corresponde a um ator só, `GenerateInvoiceJob` muda quando a regra fiscal muda, e o time fiscal decide sua própria política de retry. `CreditLoyaltyPointsJob` muda quando a regra de fidelidade muda. `NotifyMarketingJob` muda quando a comunicação de marketing muda.

Antes, esses quatro motivos de mudança estavam amarrados no mesmo `perform`, compartilhando a mesma política de retry sem ninguém ter decidido isso de propósito. 

A separação não reduz código, ela desacopla o destino de cada responsabilidade da dos outros. É a mesma lógica do `Order` lá no início do post, só que aplicada ao nível de execução assíncrona.

Se você já leu o post sobre [acoplamento](/o-que-e-acoplamento) aqui no blog, é bem parecido com aquela ideia de que um conceito de design não fica preso a uma única forma, ele se repete em unidades diferentes da aplicação: classe, service, job, módulo.

No fundo, o SRP não é uma regra exclusiva pra models ou classes pequenas. É uma forma de pensar sobre distribuição de responsabilidade: junte o que muda junto, separe o que muda por razões diferentes, seja isso uma classe, um service ou um job.

Numa aplicação maior, o princípio continua valendo. Só fica mais trabalhoso de enxergar, porque agora tem mais unidades, camadas e integrações disputando espaço pra cada responsabilidade.

## Como pensar nisso no dia a dia

Pensar sobre o princípio de Single Responsability no dia a dia nem sempre é fácil (falo isso por experiência própria). Então, uma pergunta que ajuda bastante, em qualquer nível, seja classe, service, módulo, é: **quem vai pedir uma mudança aqui, e por quê?** 

Se a resposta envolve mais de um time, ou mais de um motivo que não tem nada a ver um com o outro, é sinal de que aquele componente está carregando mais de uma responsabilidade.

Outra dica, essa da própria Sandi Metz, é **tentar descrever o que aquele componente faz numa frase só**. Se você precisar usar "e" ou "ou" no meio do caminho, tipo "processa o pedido e envia notificação de marketing", já é sinal de que tem mais de uma responsabilidade ali dentro.

Vale também **prestar atenção em quem mexe naquele arquivo, e por quê**. Se o histórico de commits mostra mudanças de times completamente diferentes, um dia é o time fiscal ajustando a nota, outro dia é o marketing mudando o texto do email, isso é um sinal bem concreto de que moram atores diferentes ali dentro.

E **repare no esforço pra testar**. Se testar um componente exige mockar um monte de coisa sem relação entre si, tipo gateway de pagamento, calculadora de pontos e client de marketing no mesmo teste, isso geralmente é reflexo de responsabilidades misturadas. Teste difícil de escrever quase sempre aponta pra um design com problema.

E lembrando, assim como no acoplamento, o objetivo não é levar isso ao extremo. Não dá, e nem faz sentido, separar tudo em componentes minúsculos só por separar. A ideia é enxergar onde motivos diferentes estão misturados no mesmo lugar, e aí sim decidir se vale a pena separar.

Esse é um daqueles princípios que parecem simples quando você olha só pro exemplo de uma classe, mas que ganham outra camada de complexidade conforme a aplicação cresce e mais gente passa a mexer nela.

Espero que esse post tenha ajudado a pensar em SRP de um jeito um pouco mais amplo.

Até a próxima!
