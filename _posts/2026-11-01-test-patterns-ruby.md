---
layout: post
lang: pt
page_id: post-test-patterns-ruby
title: "Test Patterns em Ruby: dummy, stub, spy, mock e fake"
description: "Entenda por que algumas dependências atrapalham os testes e como dummy, stub, spy, mock e fake resolvem cada problema, com exemplos em Ruby e RSpec e os trade-offs de cada um."
permalink: "/test-patterns-ruby"
date: 2026-11-01
categories: ["Arquitetura de Software", "Ruby on Rails"]
published: false
---

Talvez na sua vida como profissional da área de TI, você já tenha se deparado com um teste que cobra um cartão de verdade ou um teste que passa hoje, mas falha em um dia futuro porque algo na sua condição mudou, como uma data específica ou a cortação do dólar por exemplo. 

Nos dois casos, o problema não está na regra sendo testada, e sim em algo de que ela depende. É pra lidar com isso que existem os test patterns que a gente vai ver aqui: dummy, stub, spy, mock e fake.

Muita gente, inclusive eu, chama todos eles de "mock", mas cada um resolve um problema diferente. Hoje a gente vai conversar sobre o que diferencia cada um, como escrever esses objetos em Ruby e com o RSpec, e quando eles começam a atrapalhar mais do que ajudar.

No post sobre [testes automatizados](/testes-automatizados) eu já tinha falado rapidamente de dublês. Agora a ideia é olhar pra eles com mais calma.

## SUT e DOC: dois termos pra começar

Dois termos aparecem o tempo todo nesse assunto, e os dois são usados pelo Gerard Meszaros no livro _xUnit Test Patterns_:

- **SUT (System Under Test)**: o que está sendo testado.
- **DOC (Depended-on Component)**: uma dependência do SUT, ou seja, algo de que ele precisa pra fazer o próprio trabalho.

Vamos considerar um sistema de reservas de hotel. O preço da diária está em dólar, mas o hóspede paga em reais:

```ruby
Room = Struct.new(:name, :usd_per_night)

class CreateReservation
  def initialize(exchange_rates:, payment_gateway:, mailer:, reservations:)
    @exchange_rates = exchange_rates
    @payment_gateway = payment_gateway
    @mailer = mailer
    @reservations = reservations
  end

  def call(room:, nights:, card_token:)
    raise ArgumentError, "nights must be positive" unless nights.positive?

    total = room.usd_per_night * nights * @exchange_rates.usd_to_brl
    @payment_gateway.charge(card_token, total)
    reservation = @reservations.add(room: room, nights: nights, total: total)
    @mailer.send_confirmation(reservation)
    reservation
  end
end
```

Aqui, `CreateReservation` é o SUT, e os quatro objetos recebidos no `initialize` são os DOCs.

Como eles são [injetados de fora](/gerenciamento-de-dependencias), o teste consegue trocar cada um por outro objeto. Sem isso, a maior parte do que vem a seguir ficaria bem mais difícil.

Só pra deixar claro: usei float pra manter o exemplo pequeno, mas dinheiro de verdade pede centavos ou `BigDecimal`. E quatro dependências é bastante, só juntei tudo numa classe pra usar o mesmo exemplo em todos os padrões.

## Por que uma dependência atrapalha um teste?

Olhando pra esse código, dá pra ver quatro problemas que os DOCs podem causar.

**Repetibilidade.** Tem dependência que traz um valor diferente a cada interação. Se `usd_to_brl` consulta uma API de cotação, a gente não consegue nem dizer qual é o total esperado, porque ele muda junto com o dólar.

**Segurança.** Nem toda dependência pode ser chamada durante um teste. `charge` processa uma transação de cartão e `send_confirmation` manda um email, e isso é difícil ou impossível de desfazer depois.

**Performance.** Muitas dependências acessam o banco de dados ou APIs externas. Essa latência se acumula, e a suíte passa a levar muito tempo pra rodar.

**Isolamento.** Às vezes a gente quer isolar uma parte do comportamento pra ter mais assertividade. Se o teste do cálculo falha, seria bom saber que o problema está no cálculo, e não no gateway de pagamento.

Repare que esses problemas não são iguais, e é por isso que não existe uma única forma de substituir uma dependência.

## Os tipos de test double

Um _test double_, ou dublê de teste, é um objeto que entra no lugar de um DOC durante o teste. Os padrões são estes:

| Padrão | O que faz | Pergunta que responde |
|---|---|---|
| Dummy | Só preenche um parâmetro obrigatório, nunca é usado | Como eu chamo o SUT se esse parâmetro não importa aqui? |
| Stub | Devolve respostas prontas | Como o SUT se comporta quando recebe esse valor? |
| Spy | Registra as chamadas pra verificação posterior | O SUT chamou a dependência, e com quais argumentos? |
| Mock | Já nasce com as expectativas, e o teste quebra se elas não forem cumpridas | O SUT fez exatamente o que eu combinei? |
| Fake | Tem uma implementação que funciona, só que mais simples | Como testar com um comportamento real, sem o custo do real? |

Vamos ver um por um. Nos testes de cada seção, mostro só a parte relevante, e o arquivo completo está mais pra frente.

### Dummy object

O dummy representa um parâmetro obrigatório que não é relevante pro que está sendo testado.

Pensa no caso em que a quantidade de noites é inválida. `CreateReservation` levanta o erro na primeira linha, antes de tocar em qualquer dependência. Mas o `initialize` continua exigindo os quatro objetos:

```ruby
it "rejects a reservation without nights" do
  service = CreateReservation.new(
    exchange_rates: double("exchange rates"),
    payment_gateway: double("payment gateway"),
    mailer: double("mailer"),
    reservations: double("reservations")
  )

  expect { service.call(room: room, nights: 0, card_token: "tok_123") }
    .to raise_error(ArgumentError)
end
```

Um `double` sem nada configurado levanta um erro se receber qualquer mensagem. Isso é ótimo pra um dummy: se alguém mudar o código e a validação passar a rodar depois da cobrança, o teste avisa.

Na prática, um `Object.new` ou até um `nil` também serviriam, desde que o SUT nunca use o objeto.

O próprio Meszaros comenta que um dummy não é bem um test double, porque não existe um comportamento sendo substituído, é mais uma alternativa a passar um valor literal. Ele costuma aparecer junto dos outros nas classificações, mas com essa ressalva.

### Stub

O stub devolve respostas prontas, definidas pra um determinado teste. É o que resolve o problema da cotação do dólar.

Como Ruby usa duck typing, o stub pode ser só uma classe que responde à mesma mensagem:

```ruby
class FixedExchangeRates
  def usd_to_brl
    5.0
  end
end
```

`CreateReservation` só precisa de um objeto que responda a `usd_to_brl`. Ele não pergunta qual é a classe, então esse objeto já funciona.

No RSpec, o mais comum é não escrever a classe e usar `instance_double`:

```ruby
let(:exchange_rates) { instance_double(ExchangeRates, usd_to_brl: 5.0) }

it "calculates the total using the exchange rate" do
  reservation = service.call(room: room, nights: 2, card_token: "tok_123")

  expect(reservation[:total]).to eq(1000.0)
end
```

Com a cotação fixa em 5.0, duas noites a 100 dólares sempre dão 1000.0, e o teste passa a ser repetível.

Repare que o teste verifica o **resultado**, ele não se interessa em saber se `usd_to_brl` foi chamado. Essa é a principal diferença em relação aos próximos dois padrões.

Também dá pra sobrescrever um único método de um objeto real, o que o RSpec chama de _partial double_:

```ruby
rates = ExchangeRates.new
allow(rates).to receive(:usd_to_brl).and_return(5.0)
```

Isso ajuda quando a dependência não pode ser injetada, mas o resto do objeto continua real, então fica mais fácil o teste esbarrar em algo que não deveria.

### Spy

Agora muda a pergunta. Depois de criar a reserva, o email de confirmação foi enviado? E com qual reserva?

Não existe valor de retorno que responda isso, porque enviar o email é um efeito colateral. O spy resolve esse caso: ele observa a execução do SUT e guarda o que aconteceu pra uma verificação posterior.

Escrito à mão, um spy é só um objeto que anota as chamadas:

```ruby
class MailerSpy
  attr_reader :confirmations

  def initialize
    @confirmations = []
  end

  def send_confirmation(reservation)
    @confirmations << reservation
  end
end
```

No RSpec, `instance_spy` faz esse papel, e a verificação vem com `have_received`:

```ruby
let(:mailer) { instance_spy(ReservationMailer) }

it "sends the confirmation email" do
  reservation = service.call(room: room, nights: 2, card_token: "tok_123")

  expect(mailer).to have_received(:send_confirmation).with(reservation)
end
```

O teste segue a ordem natural de preparar, executar e verificar, e nenhum email é enviado de verdade.

Um detalhe que costuma confundir: com um `instance_double` comum, é preciso escrever `allow(mailer).to receive(:send_confirmation)` antes de usar `have_received`. O `instance_spy` dispensa isso, porque aceita qualquer método que a classe real implemente.

### Mock

O mock também substitui o DOC, mas combina as ideias de stub e spy, e a expectativa é declarada **antes** de executar o SUT. Você diz exatamente o que quer que aconteça, e o teste quebra se isso não acontecer:

```ruby
let(:payment_gateway) { instance_double(PaymentGateway) }

it "charges the card with the total" do
  expect(payment_gateway).to receive(:charge).with("tok_123", 1000.0).and_return(:approved)

  service.call(room: room, nights: 2, card_token: "tok_123")
end
```

O `expect ... to receive` é a parte que verifica a chamada, e o `and_return` é a parte que define a resposta. Aqui `CreateReservation` ignora o retorno, deixei o `and_return` só pra mostrar que dá pra combinar os dois.

Esse teste falha se `charge` nunca for chamado. E se ele for chamado com outros argumentos, a falha acontece na hora da chamada, dentro do próprio SUT.

Então qual é a diferença pro spy? Na prática, os dois verificam comportamento, e a principal diferença é **quando** a expectativa é definida:

- no spy, depois da execução, e o teste decide o que quer verificar;
- no mock, antes da execução, e o próprio dublê já sabe o que esperar.

Em muitos casos os dois se substituem, e aí vira uma questão de legibilidade e de padrão do time. O spy mantém a ordem de preparar, executar e verificar, enquanto o mock coloca a verificação antes da execução.

### Fake

O fake tem uma implementação que funciona de verdade e simula a instância real usada em produção, só que tomando algum atalho. O exemplo clássico é uma base de dados em memória:

```ruby
class InMemoryReservations
  def initialize
    @records = []
  end

  def add(room:, nights:, total:)
    reservation = { id: @records.size + 1, room: room, nights: nights, total: total }
    @records << reservation
    reservation
  end

  def find(id)
    @records.find { |reservation| reservation[:id] == id }
  end
end
```

Nesse caso não existe resposta pronta nem expectativa sobre chamadas. O teste simplesmente usa o objeto e olha o estado final:

```ruby
let(:reservations) { InMemoryReservations.new }

it "persists the reservation" do
  reservation = service.call(room: room, nights: 2, card_token: "tok_123")

  expect(reservations.find(reservation[:id])[:nights]).to eq(2)
end
```

Isso resolve o problema de performance sem acoplar o teste a como `CreateReservation` usa o repositório.

O custo é que o fake é mais código pra manter, e ele pode começar a se comportar diferente da implementação real. Se o repositório real passar a rejeitar reservas duplicadas e o fake não, os testes continuam verdes enquanto produção quebra.

Uma possível solução é rodar os mesmos testes contra as duas implementações, com `shared_examples`:

```ruby
RSpec.shared_examples "a reservations repository" do
  it "finds a reservation that was added" do
    added = subject.add(room: Room.new("Standard", 100), nights: 2, total: 1000.0)

    expect(subject.find(added[:id])).to eq(added)
  end

  it "returns nil when the reservation does not exist" do
    expect(subject.find(999)).to be_nil
  end
end
```

Basta usar `it_behaves_like "a reservations repository"` no spec do fake e no spec do repositório real. Se os dois divergirem nesse contrato, um dos specs falha.

## O exemplo completo

Juntando tudo, cada colaborador fica com o padrão que resolve o problema dele:

```ruby
RSpec.describe CreateReservation do
  subject(:service) do
    described_class.new(
      exchange_rates: exchange_rates,
      payment_gateway: payment_gateway,
      mailer: mailer,
      reservations: reservations
    )
  end

  let(:room) { Room.new("Standard", 100) }
  let(:exchange_rates) { instance_double(ExchangeRates, usd_to_brl: 5.0) }
  let(:payment_gateway) { instance_spy(PaymentGateway) }
  let(:mailer) { instance_spy(ReservationMailer) }
  let(:reservations) { InMemoryReservations.new }

  it "rejects a reservation without nights" do
    service = described_class.new(
      exchange_rates: double("exchange rates"),
      payment_gateway: double("payment gateway"),
      mailer: double("mailer"),
      reservations: double("reservations")
    )

    expect { service.call(room: room, nights: 0, card_token: "tok_123") }
      .to raise_error(ArgumentError)
  end

  it "calculates the total using the exchange rate" do
    reservation = service.call(room: room, nights: 2, card_token: "tok_123")

    expect(reservation[:total]).to eq(1000.0)
  end

  it "sends the confirmation email" do
    reservation = service.call(room: room, nights: 2, card_token: "tok_123")

    expect(mailer).to have_received(:send_confirmation).with(reservation)
  end

  it "persists the reservation" do
    reservation = service.call(room: room, nights: 2, card_token: "tok_123")

    expect(reservations.find(reservation[:id])[:nights]).to eq(2)
  end

  context "when charging the card" do
    let(:payment_gateway) { instance_double(PaymentGateway) }

    it "charges the card with the total" do
      expect(payment_gateway).to receive(:charge).with("tok_123", 1000.0).and_return(:approved)

      service.call(room: room, nights: 2, card_token: "tok_123")
    end
  end
end
```

Os `let` são preguiçosos, ou seja, só são avaliados quando usados. É isso que permite ao `context` trocar `payment_gateway` por um `instance_double` sem afetar os outros testes.

## Por que `instance_double` e não `double`?

Um dublê tem um risco que é fácil não perceber: ele pode continuar respondendo a um método que não existe mais na classe real.

Se alguém renomeia `charge` pra `charge_card` em `PaymentGateway`, um `double` comum nem percebe. O teste continua verde, e produção quebra.

O `instance_double` é um _verifying double_. Com a classe carregada, o RSpec confere se o método existe e se a quantidade de argumentos bate, e o teste falha se não bater:

```ruby
gateway = instance_double(PaymentGateway)

allow(gateway).to receive(:charge_card)
# the PaymentGateway class does not implement the instance method: charge_card
```

Isso diminui o risco, mas não elimina. Essa verificação olha a assinatura do método, não o comportamento. Se `charge` passar a devolver outra coisa, o dublê não vai saber, e por isso ainda faz sentido ter alguns [testes de integração](/testes-automatizados) com as peças reais.

## Quando os dublês atrapalham

O risco mais comum de usar dublê demais é acoplar o teste à implementação, em vez do comportamento.

Pensa num teste que verifica que `usd_to_brl` foi chamado exatamente uma vez. Se alguém refatora o código pra guardar a cotação em cache, o comportamento continua correto, mas o teste quebra. Esse tipo de falha faz o time perder confiança na suíte.

Uma heurística conhecida vem da Sandi Metz, na palestra [The Magic Tricks of Testing](https://www.rubyevents.org/talks/the-magic-tricks-of-testing-ancient-city-ruby-2013), e olha pro tipo de mensagem que sai do objeto:

- **Query**, que só devolve um valor e não muda nada: use um stub e verifique o resultado, sem verificar se a mensagem foi enviada. É o caso de `usd_to_brl`.
- **Command**, que causa um efeito fora do objeto: verifique que a mensagem foi enviada, com spy ou mock. É o caso de `charge` e `send_confirmation`.

O objetivo não é levar isso ao extremo. Mas essa separação já evita boa parte dos testes frágeis, porque a gente só verifica a chamada quando a chamada é o próprio comportamento.

Outro sinal pra observar é a quantidade de dublês. Se um teste precisa de muitos deles pra chegar numa única expectativa, vale olhar pro design, porque a classe pode estar com [responsabilidade demais](/single-responsibility) ou [acoplada](/o-que-e-acoplamento) a coisas demais.

Também não significa que toda dependência precisa de um dublê. Um objeto de valor como `Room` é rápido, previsível e não tem efeito colateral, então o teste usa o real mesmo. Nenhum dos quatro problemas lá do início aparece aqui, então não existe motivo pra substituir.

## E no Rails?

Parte disso o Rails já faz sem a gente perceber. Com `ActionMailer::Base.delivery_method = :test`, que é o que o ambiente de teste usa, os emails não são enviados e ficam guardados em `ActionMailer::Base.deliveries`.

Na prática, é um dublê no ponto de entrega: o seu mailer roda de verdade, mas o envio é trocado por uma implementação que só anota o que foi enviado. Depois, o teste pode olhar esse array, parecido com o `MailerSpy` que a gente escreveu.

Esse array só é limpo automaticamente em alguns tipos de teste, como os de `ActionMailer::TestCase`. Em outros contextos, pode ser preciso limpar na mão com `ActionMailer::Base.deliveries.clear`, senão um teste enxerga email de outro.

## Pra revisar depois

Dá pra escolher o padrão começando pela pergunta que o teste precisa responder:

- o parâmetro é obrigatório, mas não é usado nesse caminho? **Dummy**;
- o SUT precisa receber um valor controlado? **Stub**;
- preciso saber se uma chamada aconteceu? **Spy**, ou **mock** se preferir declarar a expectativa antes;
- preciso de um comportamento real, mas sem o custo do real? **Fake**;
- a dependência não causa nenhum dos problemas? Use a real.

E quando alguém disser "mocka isso aí", vale perguntar qual problema a gente quer resolver, porque muitas vezes o que resolve é um stub.

Pra se aprofundar:

- [catálogo de test doubles do _xUnit Test Patterns_](http://xunitpatterns.com/Test%20Double.html), de onde vêm os nomes;
- [resumo sobre test doubles](https://martinfowler.com/bliki/TestDouble.html) e [diferença entre mocks e stubs](https://martinfowler.com/articles/mocksArentStubs.html), do Martin Fowler;
- documentação do RSpec sobre [spies](https://rspec.info/features/3-13/rspec-mocks/basics/spies/) e [verifying doubles](https://rspec.info/features/3-13/rspec-mocks/verifying-doubles/).

Espero ter ajudado a deixar esse assunto um pouco mais claro.

Até a próxima!
