---
layout: post
lang: pt
title: "Gerenciamento de Dependências: o que uma parte do sistema precisa saber sobre a outra"
description: "Entenda o que são dependências entre componentes, por que elas não são um problema por si só, e como técnicas como injeção de dependência, isolamento e abstração ajudam a controlar o conhecimento entre classes e domínios."
permalink: "/gerenciamento-de-dependencias"
date: 2026-08-15
categories: ["Arquitetura de Software", "Ruby on Rails"]
---

Você já deve ter visto diversas colaborações entre componentes e partes do código de uma aplicação. Via de regra, toda aplicação é feita de partes que precisam colaborar. Um componente busca uma informação que pertence a outro, executa um comportamento que não é seu, ou chama uma integração externa pra terminar o próprio trabalho. 

Isso é o que chamamos de dependência.

Uma reação comum, principalmente quando a gente começa a estudar design de software, é achar que dependência é sinônimo de problema, e que o objetivo é eliminar o máximo delas possível.

Mas não é bem assim. A Sandi Metz, no _Practical Object-Oriented Design in Ruby_, trata gerenciar dependências como uma das habilidades centrais do design orientado a objetos, não como algo pra evitar a qualquer custo, até porque em muitos casos a dependência pode ser inevitável.

Então hoje a gente vai entender o que realmente é uma dependência, por que ela nem sempre é um problema, e como pensar sobre isso tanto numa classe isolada quanto numa aplicação inteira, com vários domínios, serviços e integrações.

## O que é uma dependência?

Imagina uma classe `Enrollment`, de uma plataforma de cursos online, que precisa saber quanto do curso o aluno já concluiu:

```ruby
class Enrollment
  def progress
    CourseModule.new(course, student).completion_percentage
  end
end
```

À primeira vista, parece que existe só uma dependência: `Enrollment` depende de `CourseModule`. Mas olhando com mais calma, `Enrollment` sabe bem mais coisa do que isso:

- que existe uma classe chamada `CourseModule`;
- quais argumentos ela espera, `course` e `student`, nessa ordem;
- que o objeto criado responde ao método `completion_percentage`.

Isso já mostra uma ideia importante: a dependência pode ser entendida como o conhecimento que uma parte do sistema precisa ter sobre outra. Quanto mais detalhes uma classe conhece sobre a outra, maior tende a ser o [acoplamento](/o-que-e-acoplamento) entre elas.

E esse conhecimento não vem só da criação do objeto. Mesmo que `Enrollment` recebesse o módulo já pronto, por parâmetro, ela ainda dependeria de algo bem específico:

```ruby
course_module.completion_percentage
```

Ou seja, ainda dependeria de que aquele objeto responda ao método `completion_percentage`, mesmo sem saber como esse cálculo é feito por dentro. 

Isso é o que a gente chama de **dependência de interface**, que é quando você não depende de como o outro componente resolve o problema dele, depende só do comportamento que ele expõe pra fora.

Então, dá pra resumir assim, **uma dependência existe quando um componente precisa de algo fornecido por outro componente pra conseguir fazer o próprio trabalho.**

## Dependência entre domínios e módulos

Os exemplos de dependência costumam aparecer no nível de classe e objeto, mas o mesmo raciocínio vale numa escala bem maior, entre domínios e módulos inteiros de uma aplicação (que é algo que a gente ver muito mais no dia a dia como dev).

Imagina que essa mesma plataforma de cursos seja organizada em módulos, e que o módulo `Certificates` precise emitir um certificado pro aluno assim que ele conclui um curso:

```ruby
module Certificates
  class IssueCertificate
    def call(student_id, course_id)
      student = Students::Student.active.find(student_id)
      # ...
    end
  end
end
```

`IssueCertificate` é uma classe que faz exatamente o que o nome diz: emite um certificado. É um padrão comum em Rails, uma classe com um único método público, geralmente chamado `call`, dedicada a executar uma ação específica.

Perceba que o `IssueCertificate` não sabe apenas que existe um aluno, ele conhece o model `Students::Student`, o scope `active`, o método `find`, e possivelmente a estrutura de banco por trás disso tudo. 

Além disso, se `Students` mudar algo internamente, por exemplo trocar `active` por uma lógica mais elaborada de status, `IssueCertificate` corre o risco de quebrar junto, mesmo sendo de um domínio completamente diferente.

Uma alternativa é `IssueCertificate` conversar com uma fronteira pública, que pode ser uma API, de `Students`, em vez do model interno:

```ruby
module Certificates
  class IssueCertificate
    def call(student_id, course_id)
      student = Students::Public::Api.find_student(student_id)
    end
  end
end
```

Veja que a dependência não desapareceu, `Certificates` continua precisando de informações que pertencem a `Students`. Mas agora existe uma fronteira controlada entre os dois domínios. 

Isso é bem parecido com a ideia de contratos entre camadas que a gente viu no post sobre [arquitetura em camadas](/arquitetura-em-camadas), só que aplicada entre domínios em vez de entre apresentação, negócio e dados.

E aí, vale uma ressalva aqui, uma API pública não é automaticamente uma abstração. `Students::Public::Api` ainda é um módulo concreto, ela só protege os detalhes internos de `Students::Student`. 

Mas não se preocupa, a gente volta nessa diferença mais pra frente.

De qualquer forma, isso já deixa clara uma ideia central: **gerenciar dependências não significa impedir que domínios conversem entre si. Significa controlar o que cada um precisa saber sobre o outro.**

## Direção da dependência

Uma coisa pra se ter em mente desde já é que toda dependência tem uma direção. 

`Certificates` depender de `Students` é uma decisão diferente de `Students` depender de `Certificates`. 

E a pergunta que importa aqui é: quem deveria conhecer quem?

Não existe uma resposta genérica, porque isso depende de responsabilidade, estabilidade e do quanto uma mudança em um lado deveria (ou não) afetar o outro.

Vamos pensa numa outra situação.

Seria estranho o módulo `Students` conhecer detalhes de `Certificates` só pra conseguir listar quais cursos um aluno já concluiu. Isso inverteria a relação natural entre os dois domínios, `Students` passaria a saber sobre certificação só pra devolver uma informação que, na prática, pertence mais naturalmente a ele mesmo. 

Inverter uma dependência não torna o design automaticamente melhor, só muda quem depende de quem, e às vezes coloca a responsabilidade num lugar que não faz sentido.

Uma boa regra pra escolher a direção é observar a probabilidade de mudança de cada lado. 

Em geral, classes mais concretas e específicas de um domínio tendem a mudar mais que interfaces estáveis.

E só pra esclarecer, uma classe concreta é uma classe com uma implementação específica, um jeito definido de resolver um problema, diferente de uma interface, que só define o comportamento esperado sem se comprometer com a forma como ele é resolvido por dentro (essa é a mesma ideia de dependência de interface que a gente viu lá no início do post).

Um bom exemplo disso é o próprio `Students::Public::Api` que a gente viu lá em cima.

`IssueCertificate` depende do método `find_student(student_id)`, essa é a interface, o contrato que ele conhece. Já como esse método resolve o problema por dentro é a parte concreta:

```ruby
module Students
  module Public
    module Api
      def self.find_student(student_id)
        Student.active.find(student_id)
      end
    end
  end
end
```

Agora imagina que amanhã o time de `Students` resolva buscar o aluno primeiro num cache, e só ir no banco se não encontrar:

```ruby
module Students
  module Public
    module Api
      def self.find_student(student_id)
        Rails.cache.fetch("student:#{student_id}") { Student.active.find(student_id) }
      end
    end
  end
end
```

A implementação mudou por completo, mas a interface, nome do método, o argumento que ele espera e o que ele devolve, continua exatamente a mesma. 

`IssueCertificate` nem fica sabendo que algo mudou por dentro. É por isso que interfaces tendem a ser mais estáveis que implementações concretas. Quem muda com mais frequência é o que está por dentro, não o contrato exposto pra fora.

E não é só dentro da nossa própria aplicação que isso vale. 

A gente depende o tempo todo de `String`, `Array`, `Enumerable` da mesma forma, sem se preocupar muito com isso, porque a interface delas praticamente não muda. Já uma classe interna criada pra resolver uma regra de negócio específica, tipo o `IssueCertificate`, tem bem mais chance de ter tanto a interface quanto a implementação mudando amanhã.

Então, sempre que possível, vale fazer as dependências apontarem na direção do que é mais estável.

## Quando uma dependência começa a incomodar

Nem toda dependência tem o mesmo risco. Duas perguntas ajudam a identificar quando uma dependência começa a pesar com que frequência ela muda, e quantas partes dependem dela.

Imagina que `Student#full_name` seja usado por vários módulos diferentes, `Certificates`, `Notifications` e `Reports`, todos chamando esse mesmo método:

```text
Certificates  ─┐
Notifications ─┼──→ Student#full_name
Reports       ─┘
```

Se essa interface mudar, por exemplo passar a exigir um argumento novo, os três módulos sentem o impacto ao mesmo tempo. 

Então, quanto mais coisa depende de uma interface, mais estável ela precisa ser, porque o custo de mudar aumenta junto com o número de dependentes.

O cenário mais arriscado é justamente a combinação das duas coisas: algo que muda com frequência e que, ao mesmo tempo, tem muitos dependentes. 

Se `Students::Student` estivesse sendo acessado diretamente (sem a fronteira que a gente criou lá em cima) por vários módulos diferentes, qualquer ajuste na estrutura de `Student` viraria um evento de risco pra aplicação inteira.

## Como reduzir o conhecimento entre componentes

Depois de reconhecer uma dependência e avaliar o quanto ela pesa, o próximo passo é decidir o que fazer com ela. Existem algumas técnicas que ajudam a reduzir o conhecimento que um componente precisa ter sobre o outro.

### Injetando dependências

Sem injeção, `IssueCertificate` cria sozinha aquilo de que precisa:

```ruby
class IssueCertificate
  def call(student, course)
    PdfGeneratorWrapper.new.generate(student, course)
  end
end
```

Ela sabe qual gerador usar, como criar uma instância dele, e que ele responde a `generate`. 

Com injeção de dependência, essa criação passa a acontecer fora:

```ruby
class IssueCertificate
  def initialize(generator:)
    @generator = generator
  end

  def call(student, course)
    @generator.generate(student, course)
  end
end
```

```ruby
IssueCertificate
  .new(generator: PdfGeneratorWrapper.new)
  .call(student, course)
```

Injeção de dependência é basicamente isso, **um objeto recebe de fora aquilo de que precisa pra funcionar**, em vez de construir essa dependência por conta própria.

Isso não elimina a dependência, `IssueCertificate` continua precisando de algo que responda a `generate(student, course)`. O que muda é o tipo de conhecimento. Antes, ela sabia qual classe concreta usar e como criar. Depois, ela só sabe qual comportamento espera receber. 

Bem melhor, né?!

Isso também facilita bastante os testes, porque dá pra injetar um gerador fake sem tocar em `IssueCertificate`.

### Isolando dependências

Isolar uma dependência é concentrar em um único lugar o conhecimento sobre ela. A dependência continua existindo, o ganho é evitar que esse conhecimento fique espalhado por vários pontos da aplicação.

E acredite, em aplicações muito grandes, o isolamento é essencial.

Voltando pro exemplo de `Enrollment` lá do início, imagina que `progress` também precise aplicar um peso:

```ruby
def progress
  weight * CourseModule.new(course, student).completion_percentage
end
```

A criação do `CourseModule` está misturada com o cálculo. Mas dá pra separar:

```ruby
def progress
  weight * course_module.completion_percentage
end

def course_module
  @course_module ||= CourseModule.new(course, student)
end
```

Agora `progress` só sabe usar o módulo, e `course_module` sabe como construir o objeto. 

O `||=` aqui garante que o objeto só é criado na primeira vez que `course_module` é chamado, e reaproveitado depois disso, o que costuma ser chamado de _lazy initialization_, a criação é adiada até o momento em que ela realmente é necessária.

Dá pra isolar também a chamada do método em si, não só a criação. `progress` ainda sabe que `course_module` responde a `completion_percentage`:

```ruby
def progress
  weight * completion_percentage
end

def completion_percentage
  course_module.completion_percentage
end
```

Esse conhecimento específico fica concentrado dentro de `completion_percentage`. Se amanhã o cálculo de progresso vier de outro lugar, só esse método precisa mudar.

Esse mesmo princípio aparece quando a aplicação depende de uma biblioteca externa sobre a qual a gente não tem controle. Imagina que a geração do PDF do certificado use uma _gem_ externa, com uma interface baseada em argumentos posicionais:

```ruby
ExternalPdfLib::Generator.new(student.name, course.title, Time.current)
```

Como não controlamos essa interface, criar um _wrapper_ (uma camada que envolve essa dependência externa e esconde os detalhes dela do resto da aplicação) ajuda a concentrar esse conhecimento:

```ruby
module PdfGeneratorWrapper
  def self.generate(student:, course:)
    ExternalPdfLib::Generator.new(student.name, course.title, Time.current)
  end
end
```

O resto da aplicação passa a chamar `PdfGeneratorWrapper.generate(student: student, course: course)`, sem precisar saber a ordem exata dos argumentos que a _gem_ espera. 

Só o wrapper conhece essa peculiaridade. 

Isolar esse tipo de lógica num objeto dedicado, parecido com um [service object](/services-objects-rails), é uma forma comum de conter esse conhecimento num lugar só.

E aqui vale uma ressalva, não faz sentido criar um wrapper pra toda _gem_ ou toda chamada externa da aplicação. A abstração precisa resolver um problema real, não existir só por existir.

### Dependendo de abstrações, não de implementações concretas

No exemplo de injeção de dependência, `IssueCertificate` chama `@generator.generate(student, course)`. 

```ruby
class IssueCertificate
  def initialize(generator:)
    @generator = generator
  end

  def call(student, course)
    @generator.generate(student, course)
  end
end
```

Essa chamada representa uma abstração, porque expressa apenas o comportamento que `IssueCertificate` precisa, sem determinar como ele vai ser realizado.

Já `PdfGeneratorWrapper`, que vimos agora pouco, é uma implementação concreta desse comportamento, só que ela não é a única possível.

Num teste, por exemplo, dá pra criar uma outra implementação, um gerador fake que só devolve um PDF fixo, sem chamar a _gem_ de verdade:

```ruby
class FakePdfGenerator
  def generate(student, course)
    "PDF fake pro #{student.name}"
  end
end
```

E na hora de escrever o teste, é essa implementação fake que entra no lugar da real:

```ruby
IssueCertificate
  .new(generator: FakePdfGenerator.new)
  .call(student, course)
```

Repare que `PdfGeneratorWrapper` e `FakePdfGenerator` cumprem o mesmo contrato, as duas respondem a `generate(student, course)`. É por isso que `IssueCertificate` funciona do mesmo jeito nos dois casos: ele só conhece a abstração, o comportamento esperado, não sabe (nem precisa saber) qual das duas implementações está recebendo.

No Ruby, a gente normalmente não declara essa interface de forma explícita, como aconteceria em uma linguagem estaticamente tipada. A expectativa de que o objeto responda a `generate` surge de forma implícita, pelos métodos que a gente chama nele. Isso é o que costuma ser chamado de _duck typing_, o que importa é o objeto responder ao método esperado, não a que classe ele pertence.

No _Clean Architecture_, Robert C. Martin descreve algo parecido através do _Dependency Inversion Principle_, depender do comportamento necessário, não da implementação específica que hoje fornece esse comportamento. É a mesma ideia da Sandi Metz, só descrita numa escala que já pensa em componentes inteiros, não só em objetos.

E vale reforçar aquela ressalva de antes, `Students::Public::Api` cria uma fronteira, mas continua sendo uma implementação concreta, um módulo específico com um método específico. Fronteira e abstração são conceitos parecidos, mas não são a mesma coisa.

## Nem toda dependência precisa ser removida

Um erro comum é tratar dependência como sinônimo de problema. Toda aplicação depende de Ruby, de Rails, de gems, de outros domínios, de serviços internos e externos. Isso é inevitável, e está tudo bem.

A pergunta que realmente importa não é se existe uma seta `A → B`. E sim, que tipo de conhecimento atravessa essa seta. 

Uma dependência simples, estável e intencional pode ser perfeitamente aceitável sem nenhuma técnica especial em cima dela.

Além disso, vale diferenciar dependência de acoplamento aqui também. 

Uma dependência é o fato de um componente precisar de outro pra funcionar. Já, acoplamento descreve o quanto essas partes estão ligadas, e o quanto mudanças numa afetam a outra. 

São conceitos relacionados, mas não são sinônimos.

## Como avaliar uma dependência no dia a dia

Beleza, agora que já conversamos sobre tudo isso, ao esbarrar numa dependência nova, ou revisar uma já existente, algumas perguntas ajudam a decidir o que fazer com ela.

A primeira é: **do que exatamente esse código depende?** 

De uma implementação específica, de um model, de uma API pública, de um contrato de comportamento? 

Nem toda dependência pede o mesmo tipo de cuidado.

Outra pergunta útil: **quanto esse componente sabe sobre o outro?** 

Ele conhece só o comportamento de que precisa, ou também conhece detalhes internos, tipo estrutura de banco, queries e formato de payload?

Também vale considerar: **essa dependência muda com que frequência, e quantas partes dependem dela?** 

Uma combinação de mudança frequente com muitos dependentes é sinal de que aquele ponto merece atenção redobrada.

E, antes de sair criando abstração pra tudo, **essa abstração resolve um problema real?** 

Nem toda dependência precisa virar interface, gateway, adapter ou wrapper. Adicionar uma camada onde ela não é necessária só adiciona complexidade sem reduzir risco nenhum.

No fim das contas, o que a gente pode tirar de aprendizado de hoje não são formas eliminar dependências. E sim, entender que elas são inevitáveis, e que a quantidade de conhecimento que atravessa essas relações é uma decisão de design, não um acidente. 

Uma aplicação mais fácil de mudar é, geralmente, uma aplicação em que cada componente sabe só o que realmente precisa saber sobre os outros.

Se você quiser se aprofundar mais no assunto, os dois livros que guiaram esse post são ótimos pontos de partida: o _Practical Object-Oriented Design in Ruby_, da Sandi Metz, e o _Clean Architecture_, do Robert C. Martin.

Até a próxima!
