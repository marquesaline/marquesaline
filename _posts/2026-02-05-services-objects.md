---
layout: post
title: "Services Objects: o que são e quando usar"
description: "Entenda o que são Service Objects no Rails, quando usar e como organizar lógica de negócio em aplicações maiores."
permalink: "/services-objects-rails"
date: 2026-02-05
categories: [Ruby on Rails]
---

Antes de tudo, precisamos entender o que são os services objects, ou objetos de serviços. 

Se você já programou em Rails, principalmente em um projeto grande, você já deve ter se deparado com o uso dele. 

Vamos lá!

Os objetos de serviço são essencialmente objetos que encapsulam uma determinada lógica de negócio com o intuito de remover a complexidade dos models e dos controllers. 

Geralmente esses objetos realizam apenas uma única ação (processo), de forma que evita colocar mais procedimentos dentro dos outros arquivos. 

Deixa eu te dar um exemplo.

Imagine uma funcionalidade simples: finalizar um pedido em um e-commerce.

À primeira vista, parece algo simples. O usuário clica em “finalizar compra” e pronto.  
Mas, por trás desse botão, várias coisas podem acontecer:

- validar se o pedido ainda está aberto
- verificar estoque
- processar pagamento
- atualizar o status do pedido
- enviar um email de confirmação
- registrar logs ou eventos

Agora vem a pergunta importante: **onde essa lógica deveria ficar?**

No controller? No model?

Em aplicações pequenas, pode ser que você veja tudo isso em um único lugar, geralmente no model.

Funciona? Sim.

O problema é que, com o tempo, essa classe passa a ter responsabilidades demais. Pequenas mudanças em uma regra acabam afetando comportamentos que não têm relação direta entre si.

Fora que isso dificulta a manutenção do código e os testes de cada parte.

Nesse caso, o service object entraria como um objeto responsável por representar esse processo específico: finalizar um pedido.

Ao invés de espalhar essa lógica entre controller e model, o service object centraliza esse fluxo em um único lugar, deixando cada parte da aplicação com uma responsabilidade clara.

O controller apenas orquestra a requisição. O model cuida das regras da entidade e o service object coordena a lógica de negócio envolvida no processo.

Beleza?! Agora vamos entender como isso funciona na prática. 

## Services Objects no Rails

Bom, já te adianto que no Rails um service object nada mais é do que uma classe Ruby comum, mas que é criada com um objetivo de executar um determinado processo muito específico. 

Não existe uma convenção oficial do Rails direta pra Services Objects, até porque a arquitetura MVC separa apenas em models, views e controller, mas você vai ver por aí que a comunidade consolidou algumas práticas. 

O local mais frequente pra colocar os services objects é na `app/services`. Mas fique atento que você pode ver outras convenções a depender da empresa que você estiver trabalhando. 

Além disso, pra evitar confusões de nomenclatura, a comunidade costuma seguir alguns padrões simples.

Geralmente, service objects têm nomes que representam claramente a ação que eles executam, normalmente usando um verbo no nome da classe. Por exemplo:

- `CreateUserAccount`
- `SendWelcomeEmail`
- `CompleteOrder`

A ideia aqui não é criar uma regra rígida, mas facilitar a leitura do código. Quando alguém vê esse nome, já sabe exatamente o que aquele objeto faz, sem precisar abrir a implementação.

OBS: de novo vale ressaltar que isso não está "escrito na pedra", ou seja, você pode, e provavelmente vai, se deparar com outros tipos de estruturas e convenções. 

### Estrutura básica de um Service Object

Bom, considerando que um service object tem como intuito realizar apenas um processo da lógica de negócio de forma isolada, sua estrutura não precisa ser muito complexa. 

Como já comentei antes, costuma ser apenas uma classe comum em Ruby. 

Além disso, geralmente se expõe apenas um método público, comumente chamado de `call`, mas às vezes também pode ser `perform`, mas lembre-se que é mais uma questão de nomenclatura mesmo.  

Com isso, toda vez que precisamos chamar o serviço, só precisamos chamar a classe e o método.

Um exemplo simples de estrutura de um service object no Rails poderia ser algo assim:

```ruby
class CompleteOrder
  def initialize(order)
    @order = order
  end

  def call
    return false unless order.open?

    process_payment
    update_order_status
    send_confirmation_email

    true
  end

  private

  attr_reader :order

  def process_payment
    # payment logic
  end

  def update_order_status
    order.update!(status: :completed)
  end

  def send_confirmation_email
    # email sending
  end
end
```

Veja que esse service object só tem uma ação: finalizar o pedido. 

Ele vai receber os dados necessários no `initialize` e o único método exposto é o `call` que vai ser o responsável por organizar e chamar todos os demais métodos pra orquestrar o fluxo.

E observe que ele também não substitui o model nem o controller. 

O service object apenas coordena a lógica de negócio desse processo específico. 

Então, quando fosse necessário chamar esse serviço, o controller teria apenas essa responsabilidade e lidar com o resultado: 

```ruby
class OrdersController < ApplicationController
  def complete
    # Assumindo que @order foi carregado corretamente
    if CompleteOrder.new(@order).call
      redirect_to @order, notice: "Order completed successfully"
    else
      redirect_to @order, alert: "Unable to complete the order"
    end
  end
end
```

Então, o controller apenas chama o `CompleteOrder.new(@order).call`, assim, toda lógica de finalização do pedido não precisa ficar acoplado no controller, ele fica em uma parte separada, facilitando a manutenção do código. 

## Quando usar o Service Object

Agora que já entendemos a estrutura e como costuma ser feito no Rails, vamos entender quando usar ou não.

Em geral, services objects costumam fazer mais sentido quando uma operação começa a envolver mais do que uma simples ação em um único model.

Pensa comigo, se pra criar um usuário na aplicação você precisa apenas salvar alguns dados no banco, um simples `User.create` já resolve o problema.

Agora, vamos imaginar que o fluxo começa a crescer e agora você precisa:

- garantir que o email não esteja bloqueado ou já tenha sido usado em outro contexto
- associar esse usuário a uma organização ou conta
- enfileirar um job para envio de email
- notificar um serviço externo via API
- registrar logs ou métricas desse processo

Percebe como aumentou o fluxo? Isso tudo não poderia pra ficar no model e no controller, não vai ficar simples de manter. 

Olha só como esse controller poderia ficar com tudo isso:

```ruby
class UsersController < ApplicationController
  def create
    user = User.new(user_params)

    if EmailBlocklist.include?(user.email)
      redirect_to new_user_path, alert: "Email blocked"
      return
    end

    user.save!
    user.create_profile
    user.organizations << current_organization

    WelcomeEmailJob.perform_later(user.id)
    ExternalApiNotifier.notify_user_created(user)

    redirect_to user_path(user), notice: "User created successfully"
  end
end
```

Dá pra perceber de cara que esse controller não está só orquestrando a requisição de criação do usuário, ele também está concentrando toda regra de negócio e integrações. 

E aí vem um ponto importante... esse código funcionaria? Sim! Mas ficaria difícil testar e fazer a manutenção.

Então, fique atento a alguns sinais comuns que indicam que é um momento de usar o services objects:

- Controller crescendo demais e contendo cada vez mais lógica de negócio, quando deveria apenas orquestrar.
- Uma mesma regra ou fluxo começa a ser repetido em diferentes controllers, jobs ou callbacks.
- O model começa a concentrar responsabilidades que não dizem respeito diretamente à entidade em si.
- Entre outros...

Uma coisa que me ajuda muito é tentar explicar determinado model ou controller em voz alta pra mim mesma. Explicar o código sempre é útil pra entender melhor o que ele está fazendo e se tem coisa demais dentro de um controller ou de um model que foge a responsabilidade deles, isso já é um sinal.

## Quando NÃO usar Service Objects

Apesar de serem muito úteis, service objects não precisam ser usados em todos os cenários.

Alguns exemplos de situações em que um service object pode ser desnecessário:

- Operações simples de CRUD, como criar ou atualizar um registro sem regras adicionais.
- Lógicas que pertencem claramente ao model, como validações ou pequenos comportamentos da entidade.
- Consultas e filtros de dados, que costumam ser melhor representados por scopes.
- Casos em que a extração para um service object adicionaria mais complexidade do que benefício.

Um exemplo comum de caso em que um service object não é necessário é quando a lógica pertence claramente ao próprio model.

Imagine um model simples de usuário com uma validação e um pequeno comportamento:

```ruby
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true

  def active?
    status == "active"
  end
end
```

Veja, nesse caso, não faz sentido tirar essa lógica pra colocar em um service object, porque a validação e o método `active?` dizem respeito diretamente ao estado do dado, que nesse caso é um comportamento da entidade `User`. 

Percebeu a diferença?

Vamos ver um exemplo no controller:

```ruby
class UsersController < ApplicationController
  def create
    user = User.new(user_params)

    if user.save
      redirect_to user_path(user), notice: "User created successfully"
    else
      render :new
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :name)
  end
end
```

Nesse caso, o controller está fazendo exatamente o que se espera dele: receber a requisição, criar no banco de dados usando o model e lidar com a resposta.

Então, tenha em mente que service objects não são uma regra ou um padrão obrigatório. Eles existem para ajudar a organizar a lógica de negócio quando a complexidade começa a crescer.

No fim das contas, a pergunta não é “dá pra usar um service object aqui?”, mas sim “isso realmente deixa o código mais claro?”.

Não é uma coisa pra ser usada pra deixar o código bonito e pra substituir models ou controllers, eles existem pra ajudar quando a lógica começa a crescer e fica difícil de entender onde cada responsabilidade deveria estar.

Espero ter te ajudado a entender esse padrão melhor, porque com certeza em grandes aplicações você vai se deparar com ele.

Até a próxima!