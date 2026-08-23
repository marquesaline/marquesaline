---
layout: post
lang: pt
page_id: post-testes-automatizados
title: "Testes Automatizados: tipos, TDD e testabilidade"
description: "Entenda a diferença entre testes de unidade, integração e end-to-end, como o TDD influencia o design do código, os princípios FIRST e como a testabilidade se conecta a decisões de arquitetura em aplicações Ruby on Rails."
permalink: "/testes-automatizados"
date: 2026-08-23
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Um dos motivos mais citados pra justificar testes automatizados é evitar regressão, ou seja, isso é basicamente garantir que uma mudança nova não quebre um comportamento que já funcionava antes.

Mas só saber que testes evitam regressão não ajuda muito na hora de decidir que tipo de teste escrever, ou como saber se um teste é, de fato, um bom teste.

Hoje vamos conversar sobre esse assunto com mais calma e vamos entender melhor o que é TDD, os princípios que definem um teste limpo (o FIRST), os diferentes tipos de teste automatizado (unidade, integração e end-to-end) e como tudo isso se conecta com o design do próprio código, não só com a garantia de que ele funciona.

Ahh, e não custa repetir que embora eu use exemplos com Ruby, Rails, RSpec e Capybara, as ideias valem pra qualquer linguagem ou framework.

## TDD (Test-Driven Development)

TDD (desenvolvimento orientado a testes) é uma técnica de construção de software. 

É muito comum as pessoas acharem que TDD é só um jeito de escrever teste antes do código, mas é bem mais que isso, pois o TDD influencia diretamente o design, porque o resultado final precisa nascer testável.

Robert C. Martin, no livro Código Limpo, resume TDD em três leis:

1. Você não pode escrever nenhum código de produção antes de ter um teste que detecte uma falha ainda inexistente. Ou seja, nenhuma implementação começa sem um teste provando antes que aquele comportamento ainda não existe.
2. Você não pode escrever mais teste de unidade do que o suficiente pra detectar essa falha. Basicamente, o teste precisa ser pequeno o bastante pra provar só aquilo, sem já testar comportamentos que nem foram implementados ainda.
3. Você não pode escrever mais código de produção do que o suficiente pra fazer esse teste passar. Ou seja, resista à tentação de implementar mais do que o teste está cobrando naquele momento.

Aqui vale esclarecer que o "código de produção" que ele tanto menciona é o código da aplicação em si, aquele que vai rodar de verdade e resolver o problema. Pense nisso como uma oposição ao código de teste, que só existe pra verificar se o primeiro está se comportando como deveria.

Enfim, seguindo essas leis à risca, o desenvolvimento acontece em ciclos bem pequenos, conhecidos como Red, Green, Refactor:

- **Red**: escrever um teste que falha, porque o comportamento ainda não existe.
- **Green**: escrever o mínimo de código pra fazer esse teste passar, mesmo que a implementação ainda não seja a ideal.
- **Refactor**: melhorar o código, sabendo que os testes que já passam continuam garantindo que nada quebrou.

O ciclo se repete pro próximo comportamento e assim vai.

Entendeu porque resumir TDD como "escrever teste antes" simplifica demais?! 

O que TDD realmente propõe é deixar que a necessidade de testar guie pequenas decisões de design, um comportamento de cada vez.

## Testes limpos e os princípios FIRST

Escrever teste antes do código não garante que esse teste seja bom. 

É aí que entram em cena os princípios do FIRST, também apresentados por Robert Martin.

FIRST é uma sigla:

**Fast**: testes precisam rodar rápido, porque vão ser executados o tempo todo durante o desenvolvimento. E isso não é só uma questão de conforto, pensa comigo, se a suíte demora demais, as pessoas do time acabam rodando os testes com menos frequência, ou simplesmente evitando escrever novos, o que anula o próprio propósito de ter testes automatizados. 

Agora é claro que o que conta como rápido muda de acordo com o nível do teste. Testes de unidade tendem a ser bem mais rápidos que os de integração, que por sua vez tendem a ser mais rápidos que os end-to-end.

**Independent**: um teste não deveria depender da execução de outro, nem de estado deixado por um teste anterior. 

Um exemplo clássico disso é um teste que só passa porque um registro foi criado no teste anterior, sem criar o dele próprio. Ou seja, se você rodar esse teste sozinho, ou mudar a ordem da suíte, ele quebra, mesmo sem nenhuma mudança de comportamento real. Isso é sinal de que os testes estão [acoplados](/o-que-e-acoplamento) de um jeito que não deveriam, cada teste precisa montar o próprio cenário do zero.

**Repeatable**: o resultado precisa ser o mesmo, não importa quantas vezes o teste rode, seja na sua máquina, no CI ou daqui a um mês.

Um exemplo comum é um teste que verifica se uma promoção está ativa comparando com `Time.now`, tipo `promotion.active?(Time.now)`. Se a data de expiração da promoção usada no teste for fixa, esse teste passa hoje e começa a falhar sozinho no dia em que essa data passar, mesmo que ninguém tenha mudado nada no código. 

Com isso, depender de conexão com a internet ou de um serviço externo de verdade também compromete a repetibilidade, porque o teste passa a falhar por instabilidade de rede, não por um problema real na aplicação.

**Self-validating**: o próprio teste precisa decidir sozinho se passou ou falhou, através de uma expectativa clara, tipo `expect(result).to eq(expected)`. Não deve ser necessário ler log ou conferir manualmente uma saída no terminal.

**Timely**: o teste precisa ser escrito no momento certo do desenvolvimento, não semanas depois do código já existir. No TDD, esse momento é antes do código de produção.

Agora que entendemos como os testes precisam ser, vamos entender os tipos de testes que podemos ter. 

## Tipos de testes

Existem três tipos principais de teste automatizado, os de unidade, os de integração e end-to-end. Cada um representa um nível diferente de confiança e isolamento.

A diferença entre eles está no que o teste realmente exercita.

O que define o tipo de um teste é:

- quanto da aplicação ele percorre
- quantos componentes reais participam
- se há acesso a banco, rede, arquivos ou serviços externos
- qual é a entrada usada pra exercitar o sistema

Uma pergunta que ajuda bastante nesse momento é: **qual comportamento eu estou testando, e de quais partes reais esse teste depende?**

### Testes de unidade

Um teste de unidade verifica uma parte pequena e específica do sistema, que pode ser uma função, um método, uma classe ou um pequeno objeto responsável por uma regra.

Um validador de número de cartão escrito como uma classe Ruby simples é um bom exemplo:

```ruby
class CardNumberValidator
  def self.valid?(card_number)
    # Luhn's algorithm
  end
end
```

E o teste dele:

```ruby
RSpec.describe CardNumberValidator do
  describe ".valid?" do
    it "returns true for a valid card number" do
      expect(described_class.valid?("4111111111111111")).to be(true)
    end

    it "returns false for an invalid card number" do
      expect(described_class.valid?("1111111111111111")).to be(false)
    end
  end
end
```

`described_class` representa a classe indicada no `describe` mais externo, nesse caso `CardNumberValidator`.

Veja como esse teste é simples, ele não precisa subir servidor, fazer requisição HTTP ou salvar nada no banco. Por isso costuma ser rápido e, quando falha, é fácil apontar o comportamento que quebrou.

Além disso, uma unidade não é necessariamente "uma classe". Pense mais como uma fronteira de comportamento escolhida pro teste, que muitas vezes corresponde a uma classe, mas não precisa. 

Também existem duas formas comuns de pensar num teste unitário: **isolado** (ou solitário) e **sociável**. 

A diferença está em como cada um lida com os colaboradores do objeto sob teste, ou seja, os outros objetos que ele usa por dentro pra fazer o próprio trabalho.

Um teste isolado substitui esses colaboradores por _test doubles_, ou só "dublês". A gente sabe que no cinema um dublê entra no lugar do ator numa cena, mas ainda entrega o resultado que a cena precisa. 

Na programação é a mesma ideia: um dublê entra no lugar de um colaborador real, controlado pelo teste, em vez de rodar a lógica de verdade por trás dele.

Existem alguns tipos de dublê, dependendo do que ele faz. Os dois mais comuns são o **stub**, que só devolve uma resposta pré-definida quando chamado, e o **mock**, onde o teste verifica se aquele colaborador foi chamado do jeito esperado. A gente vai ver exemplos dos dois ao longo do post.

Então, se `CardNumberValidator` dependesse de outro objeto pra, por exemplo, remover espaços do número antes de validar:

```ruby
class CardNumberValidator
  def initialize(formatter: CardNumberFormatter.new)
    @formatter = formatter
  end

  def valid?(card_number)
    luhn_valid?(@formatter.strip(card_number))
  end
end
```

um teste isolado trocaria `CardNumberFormatter` por um stub, garantindo que só a lógica de validação está sendo exercitada:

```ruby
formatter = instance_double(CardNumberFormatter)
allow(formatter).to receive(:strip).with("4111 1111 1111 1111").and_return("4111111111111111")

validator = CardNumberValidator.new(formatter: formatter)

expect(validator.valid?("4111 1111 1111 1111")).to be(true)
```

Repare que o teste não sabe (nem precisa saber) como `CardNumberFormatter` remove os espaços de verdade, ele só define o que espera receber de volta e verifica se o validador reage certo a isso.

Já um teste sociável deixa esses colaboradores reais entrarem em ação. Uma validação declarada com `validates` num model Rails é um bom exemplo: o teste chama `valid?` de verdade, deixando o mecanismo de validação do Active Record rodar por baixo, sem trocar nada por dublê. Mesmo sem tocar no banco, ainda é tratado como um teste de unidade, só que sociável.

Em aplicações grandes, é assim que a maior parte dos testes de unidade aparece no dia a dia através de  validators, calculadoras, policies e outros pequenos objetos de domínio, cada um concentrando uma regra específica sem depender de muita coisa ao redor.

O Rails, porém, tem tanta coisa embutida por convenção que às vezes fica difícil enxergar onde termina a unidade e onde começa a integração. 

Por exemplo, uma validação declarada no model roda dentro de `valid?` ou `save`, junto com todo o mecanismo do Active Record por trás dela. Isso não deixa de ser um teste de unidade, mas o limite fica bem menos óbvio do que quando a regra vive isolada numa classe Ruby simples, como o `CardNumberValidator` que a gente acabou de ver.

No fim, a classificação depende do que realmente é executado, não de onde o arquivo mora nem do metadado que o RSpec Rails usa pra identificar o teste, como `type: :model`.

### Testes de integração

Um teste de integração verifica se diferentes partes da aplicação, normalmente espalhadas por camadas diferentes, como rota, controller, model e banco, conseguem colaborar corretamente.

Isso já marca uma diferença grande em relação a um teste de unidade. Um teste de unidade pergunta se uma regra isolada está certa. Já um teste de integração pergunta se várias peças reais, juntas, produzem o comportamento esperado, o que normalmente envolve mais camadas e mais pontos de falha ao mesmo tempo.

No Rails, request specs são o exemplo mais comum:

```ruby
RSpec.describe "POST /orders/checkout", type: :request do
  it "creates an order" do
    input = {
      name: "John Doe",
      email: "john.doe@gmail.com",
      card_number: "4111111111111111"
    }

    post "/orders/checkout", params: input, as: :json

    output = response.parsed_body

    expect(response).to have_http_status(:created)
    expect(output["order_id"]).not_to be_nil
  end
end
```

Perceba que esse teste percorre rota, controller, parâmetros, `Order`, validações, Active Record, banco de dados e resposta JSON. Ele não pergunta só se o número do cartão é válido, a pergunta é maior: **as partes necessárias pra fechar um pedido funcionam juntas?**

Vale um detalhe técnico aqui. 

Mesmo executando `post "/orders/checkout"`, o RSpec Rails normalmente envia essa requisição pra aplicação via Rack, dentro do próprio processo de teste. Não precisa subir um servidor numa porta nem fazer uma chamada real pela rede. É por isso que request specs costumam ser classificados como integração da aplicação, não como end-to-end.

Num framework mais minimalista, como Sinatra, o equivalente costuma usar `Rack::Test` diretamente:

```ruby
RSpec.describe "POST /orders/checkout" do
  include Rack::Test::Methods

  def app
    App
  end

  it "creates an order" do
    post "/orders/checkout",
         JSON.generate(input),
         { "CONTENT_TYPE" => "application/json" }

    expect(last_response.status).to eq(201)
  end
end
```

### Testes end-to-end (E2E)

Um teste end-to-end percorre o sistema a partir de uma interface usada externamente, simulando um fluxo completo de um usuário. Numa aplicação web Rails, isso normalmente é feito com um system spec e Capybara:

```ruby
RSpec.describe "Order checkout", type: :system do
  it "allows a customer to complete an order" do
    visit "/checkout"

    fill_in "Name", with: "John Doe"
    fill_in "Email", with: "john.doe@gmail.com"
    fill_in "Card number", with: "4111111111111111"

    click_button "Complete order"

    expect(page).to have_content("Order confirmed")
  end
end
```

Esse fluxo atravessa navegador, página, formulário, JavaScript, servidor, controller, model, banco e a resposta exibida de volta na interface.

Capybara não é o navegador em si, ele oferece uma linguagem pra interagir com aplicações web, e usa um driver por baixo, por exemplo:

- **Rack::Test**: rápido, roda no processo, não suporta JavaScript;
- **Selenium com Chrome**: usa navegador real ou headless, suporta JavaScript;
- **Cuprite**: controla Chrome headless.

Um system spec com navegador real fica mais próximo de um end-to-end completo. Já um teste Capybara com `Rack::Test` simula a navegação, mas não usa navegador de verdade.

Em APIs, essa fronteira fica menos consensual. Tem quem chame um teste de endpoint completo de end-to-end, porque ele vai do request até o banco. No vocabulário comum de Rails, no entanto, um request spec em processo costuma ser tratado como integração mesmo. Um end-to-end mais estrito iniciaria a aplicação inteira e faria uma requisição HTTP real contra um servidor de verdade.

Testes end-to-end costumam ser caros de manter e mais propensos a quebrar por motivos que não têm nada a ver com o comportamento sendo testado, tipo uma mudança de layout na tela. Por isso costuma existir bem menos desses do que dos outros dois tipos.

## Quanto teste de cada tipo escrever

Por causa desse custo, e da instabilidade que vem junto com ele, no dia a dia a gente não aplica os três tipos de teste com a mesma intensidade. E não existe uma proporção fixa entre eles, isso varia de aplicação pra aplicação, dependendo do risco de cada parte do sistema e de quão crítica é cada jornada pro usuário.

Uma ideia simples ajuda a decidir isso é pensar que cada nível cobre um conjunto diferente de casos, sem repetir o que o outro já garante. 

Vamos voltar pra validação de número de cartão:

O **teste unitário do validator** cobre em detalhe os cenários do algoritmo, se números que passam na validação de Luhn, dígito verificador inválido, todos os dígitos iguais, `nil`, valor curto, valor longo, com espaços ou traços.

O **teste de integração do checkout** só precisa confirmar que essa regra está conectada ao endpoint, ou seja, um POST com número de cartão inválido devolve 422 e a mensagem de erro certa. 

A gente não precisa repetir todos os números inválidos já cobertos no teste unitário, beleza?!

Já o **teste end-to-end**, se existir interface, cobre o fluxo principal, o cliente preenche o formulário e o pedido é concluído. Executar todos os casos do algoritmo pelo navegador deixaria a suíte lenta e redundante sem agregar confiança extra.

Essa distribuição costuma ser descrita como uma pirâmide. Muitos testes unitários pra regras com várias combinações, request specs cobrindo os contratos importantes dos endpoints, e poucos system specs pras jornadas mais críticas do usuário.

Um exemplo de como isso costuma se organizar numa aplicação Rails, sem ser uma fórmula fixa:

| Nível | Exemplos |
|---|---|
| Unidade | validators, calculadoras, policies, objetos de domínio |
| Model | validações, métodos e regras do model |
| Integração | request specs, persistência, jobs com banco |
| End-to-end | system specs com Capybara pra fluxos críticos |

E vale lembrar que a gente não precisa testar absolutamente tudo. A maioria das aplicações nem chega perto de 100% de cobertura, e tudo bem. O que realmente merece atenção são as partes críticas, aquelas que, se quebrarem, afetam os usuários de forma drástica.

## Testabilidade como consequência do design

Lembra que comentei que o TDD influencia o design? Isso acontece porque escrever o teste primeiro obriga a pensar em como aquele código vai ser chamado antes de pensar em como ele vai ser implementado. Essa relação vale nos dois sentidos, pois um código difícil de testar geralmente está denunciando um problema de design, não só uma falta de teste.

### Dependências explícitas

Uma [dependência](/gerenciamento-de-dependencias) é qualquer coisa que um trecho de código precisa pra fazer o próprio trabalho, seja outro objeto, um serviço externo ou o banco de dados. Ela é explícita quando aparece visível no próprio código, geralmente como parâmetro ou argumento, e é implícita quando o código simplesmente assume que aquilo vai estar disponível, sem declarar isso em lugar nenhum.

Quanto mais implícita for uma dependência, mais difícil fica de testar aquele trecho isoladamente, porque o teste precisa primeiro descobrir o que precisa existir por trás pra aquele comportamento funcionar.

Frameworks mais minimalistas, como Sinatra, deixam essas dependências bem visíveis na própria rota:

```ruby
post "/orders/checkout" do
  input = JSON.parse(request.body.read)

  halt 422 unless NameValidator.valid?(input["name"])
  halt 422 unless CardNumberValidator.valid?(input["card_number"])

  Order.create!(input)
end
```

Cada dependência aparece explicitamente, chamada por requisição, validador de nome, validador de cartão, `Order`, banco.

No Rails, a mesma regra pode estar só declarada no model:

```ruby
validates :card_number, card_number: true
```

e ser executada implicitamente por `order.save`, que pode disparar validações, validators customizados, callbacks e persistência numa única chamada. Isso reduz repetição, mas também esconde parte do fluxo atrás de convenção. 

Testar esse comportamento pede conhecer o que o Rails está fazendo por baixo, não só o que está escrito ali na frente.

Mas nenhuma das duas abordagens é errada, mas elas pedem tipos diferentes de teste pra dar confiança equivalente, pois no Sinatra, testar cada validator isolado já deixa claro o que está acontecendo, já no Rails, além do validator isolado, vale a pena um teste de integração confirmando que a convenção está de fato conectando as peças.

### Dependências injetadas e _test doubles_

Imagina um caso de uso que envia um email de confirmação depois de fechar o pedido:

```ruby
class CreateOrder
  def initialize(email_sender:)
    @email_sender = email_sender
  end

  def call(input)
    order = Order.create!(input)
    @email_sender.send_order_confirmation(order)
    order
  end
end
```

`CreateOrder` recebe `email_sender` de fora, em vez de instanciar um serviço concreto internamente. Isso é o que chamamos de injeção de dependência, e é o que torna esse teste possível sem enviar email de verdade:

```ruby
email_sender = instance_double(EmailSender)

allow(email_sender).to receive(:send_order_confirmation)

service = CreateOrder.new(email_sender: email_sender)
order = service.call(input)

expect(email_sender)
  .to have_received(:send_order_confirmation)
  .with(order)
```

`email_sender` aqui é o mesmo tipo de dublê que a gente viu lá atrás, só que dessa vez funcionando como mock, em vez de stub, já que a verificação não é sobre um valor de retorno, é sobre a chamada `send_order_confirmation` ter mesmo acontecido.

Esse mock funciona bem porque `CreateOrder` depende só de uma coisa fora do seu comportamento principal, o envio do email. Se testar `CreateOrder` exigisse mockar várias dependências sem relação entre si só pra chegar numa única expectativa, isso seria sinal de que a classe está com [responsabilidade demais](/single-responsibility), ou que o [gerenciamento das dependências](/gerenciamento-de-dependencias) dela precisa de ajuste. 

Mantenha em mente que teste difícil de escrever quase sempre aponta pra um problema de design, não pra falta de ferramenta de teste. É esse fio que conecta tudo que a gente viu até aqui. 

O TDD orienta o processo de construção, o FIRST orienta a qualidade de cada teste individual, e a testabilidade funciona como um feedback sobre o próprio design, dependência difícil de isolar, responsabilidade espalhada ou acoplamento excessivo aparecem primeiro na dificuldade de escrever um teste, muito antes de virarem um problema em produção.

Dentro desse processo, testes de unidade, integração e end-to-end representam níveis diferentes de confiança e isolamento, cada um respondendo uma pergunta diferente sobre o sistema. 

No Rails, essas fronteiras parecem menos claras, porque o framework conecta rota, controller, model, validação e persistência por convenção. Por isso vale sempre lembrar que o nome da pasta mostra onde o teste está organizado, mas o comportamento e as dependências exercitadas é que mostram o nível dele de verdade.

Espero ter ajudado a deixar esse assunto um pouco mais claro.

Até a próxima!
