---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-gerenciamento-de-dependencias
title: "Dependency Management: what one part of a system needs to know about another"
description: "Understand what dependencies between components are, why they aren't a problem on their own, and how techniques like dependency injection, isolation, and abstraction help control the knowledge shared between classes and domains."
permalink: "/dependency-management"
date: 2026-08-15
categories: ["Software Architecture", "Ruby on Rails"]
---

You've probably seen plenty of collaboration between components and parts of an application's code. As a rule, every application is made of parts that need to collaborate. One component fetches information that belongs to another, executes a behavior that isn't its own, or calls an external integration to finish its own job.

That's what we call a dependency.

A common reaction, especially when you're starting to study software design, is to think dependency is synonymous with problem, and that the goal is to eliminate as many of them as possible.

But it's not quite like that. Sandi Metz, in _Practical Object-Oriented Design in Ruby_, treats managing dependencies as one of the core skills of object-oriented design, not as something to avoid at all costs, especially since in a lot of cases the dependency can be unavoidable.

So today let's understand what a dependency actually is, why it isn't always a problem, and how to think about it both in an isolated class and in a whole application, with multiple domains, services, and integrations.

## What is a dependency?

Imagine an `Enrollment` class, from an online course platform, that needs to know how much of the course the student has already completed:

```ruby
class Enrollment
  def progress
    CourseModule.new(course, student).completion_percentage
  end
end
```

At first glance, it looks like there's just one dependency: `Enrollment` depends on `CourseModule`. But looking more closely, `Enrollment` knows a lot more than that:

- that there's a class called `CourseModule`;
- what arguments it expects, `course` and `student`, in that order;
- that the object it creates responds to the method `completion_percentage`.

This already shows an important idea: a dependency can be understood as the knowledge one part of a system needs to have about another. The more details a class knows about another, the higher the [coupling](/what-is-coupling) between them tends to be.

And that knowledge doesn't just come from creating the object. Even if `Enrollment` received the module already built, as a parameter, it would still depend on something pretty specific:

```ruby
course_module.completion_percentage
```

In other words, it would still depend on that object responding to the method `completion_percentage`, even without knowing how that calculation happens internally.

This is what we call **interface dependency**, which is when you don't depend on how the other component solves its own problem, you only depend on the behavior it exposes outward.

So, we can sum it up like this: **a dependency exists when a component needs something provided by another component in order to do its own job.**

## Dependency between domains and modules

Dependency examples usually show up at the class and object level, but the same reasoning applies at a much bigger scale, between whole domains and modules of an application (which is something we see a lot more in day to day work as devs).

Imagine that same course platform is organized into modules, and that the `Certificates` module needs to issue a certificate to the student as soon as they finish a course:

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

`IssueCertificate` is a class that does exactly what its name says: issues a certificate. It's a common Rails pattern, a class with a single public method, usually called `call`, dedicated to executing a specific action.

Notice that `IssueCertificate` doesn't just know a student exists, it knows the `Students::Student` model, the `active` scope, the `find` method, and possibly the database structure behind all of it.

On top of that, if `Students` changes something internally, for example swapping `active` for more elaborate status logic, `IssueCertificate` risks breaking right along with it, even though it's from a completely different domain.

One alternative is for `IssueCertificate` to talk to a public boundary of `Students`, like an API, instead of the internal model:

```ruby
module Certificates
  class IssueCertificate
    def call(student_id, course_id)
      student = Students::Public::Api.find_student(student_id)
    end
  end
end
```

Notice the dependency didn't disappear, `Certificates` still needs information that belongs to `Students`. But now there's a controlled boundary between the two domains.

This is pretty similar to the idea of contracts between layers we saw in the post about [layered architecture](/layered-architecture), just applied between domains instead of between presentation, business, and data.

And here's a caveat worth mentioning, a public API isn't automatically an abstraction. `Students::Public::Api` is still a concrete module, it just protects the internal details of `Students::Student`.

But don't worry, we'll come back to that difference later.

Either way, this already makes a central idea clear: **managing dependencies doesn't mean stopping domains from talking to each other. It means controlling what each one needs to know about the other.**

## Direction of the dependency

One thing to keep in mind from the start is that every dependency has a direction.

`Certificates` depending on `Students` is a different decision than `Students` depending on `Certificates`.

And the question that matters here is: who should know about whom?

There's no generic answer, because it depends on responsibility, stability, and how much a change on one side should (or shouldn't) affect the other.

Let's think about a different situation.

It would be strange for the `Students` module to know details about `Certificates` just to be able to list which courses a student has already completed. That would flip the natural relationship between the two domains, `Students` would end up knowing about certification just to return information that, in practice, belongs more naturally to itself.

Flipping a dependency doesn't automatically make the design better, it just changes who depends on whom, and sometimes puts the responsibility somewhere that doesn't make sense.

A good rule for choosing the direction is to look at how likely each side is to change.

In general, more concrete, domain-specific classes tend to change more than stable interfaces.

And just to clarify, a concrete class is a class with a specific implementation, a defined way of solving a problem, unlike an interface, which only defines the expected behavior without committing to how it's solved internally (this is the same idea of interface dependency we saw at the start of the post).

A good example of this is `Students::Public::Api` itself, which we saw above.

`IssueCertificate` depends on the method `find_student(student_id)`, that's the interface, the contract it knows about. How that method solves the problem internally is the concrete part:

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

Now imagine that tomorrow the `Students` team decides to look up the student in a cache first, and only hit the database if it's not found:

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

The implementation changed completely, but the interface, the method name, the argument it expects, and what it returns, stays exactly the same.

`IssueCertificate` doesn't even find out something changed internally. That's why interfaces tend to be more stable than concrete implementations. What changes most often is what's inside, not the contract exposed to the outside.

And it's not just within our own application that this applies.

We depend on `String`, `Array`, `Enumerable` all the time in the same way, without worrying much about it, because their interface practically never changes. An internal class built to solve a specific business rule, like `IssueCertificate`, is a lot more likely to have both its interface and its implementation change tomorrow.

So, whenever possible, it's worth making dependencies point in the direction of what's more stable.

## When a dependency starts to become a problem

Not every dependency carries the same risk. Two questions help identify when a dependency starts to weigh things down: how often it changes, and how many parts depend on it.

Imagine `Student#full_name` is used by several different modules, `Certificates`, `Notifications`, and `Reports`, all calling that same method:

```text
Certificates  ─┐
Notifications ─┼──→ Student#full_name
Reports       ─┘
```

If that interface changes, for example if it starts requiring a new argument, all three modules feel the impact at the same time.

So, the more things depend on an interface, the more stable it needs to be, because the cost of changing it grows along with the number of dependents.

The riskiest scenario is exactly the combination of both things: something that changes frequently and, at the same time, has a lot of dependents.

If `Students::Student` were being accessed directly (without the boundary we built above) by several different modules, any adjustment to `Student`'s structure would turn into a risk event for the whole application.

## How to reduce knowledge between components

After recognizing a dependency and evaluating how much it weighs, the next step is deciding what to do about it. There are a few techniques that help reduce the knowledge one component needs to have about another.

### Injecting dependencies

Without injection, `IssueCertificate` builds what it needs on its own:

```ruby
class IssueCertificate
  def call(student, course)
    PdfGeneratorWrapper.new.generate(student, course)
  end
end
```

It knows which generator to use, how to create an instance of it, and that it responds to `generate`.

With dependency injection, that creation happens outside instead:

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

Dependency injection is basically that, **an object receives from the outside what it needs to work**, instead of building that dependency on its own.

This doesn't eliminate the dependency, `IssueCertificate` still needs something that responds to `generate(student, course)`. What changes is the type of knowledge. Before, it knew which concrete class to use and how to create it. Now, it only knows which behavior it expects to receive.

Much better, right?

This also makes testing a lot easier, because you can inject a fake generator without touching `IssueCertificate` at all.

### Isolating dependencies

Isolating a dependency means concentrating the knowledge about it in a single place. The dependency is still there, the gain is avoiding that knowledge being spread across several points of the application.

And believe me, in very large applications, isolation is essential.

Going back to the `Enrollment` example from the start, imagine `progress` also needs to apply a weight:

```ruby
def progress
  weight * CourseModule.new(course, student).completion_percentage
end
```

Creating the `CourseModule` is mixed together with the calculation. But we can separate it:

```ruby
def progress
  weight * course_module.completion_percentage
end

def course_module
  @course_module ||= CourseModule.new(course, student)
end
```

Now `progress` only knows how to use the module, and `course_module` knows how to build the object.

The `||=` here guarantees the object is only created the first time `course_module` is called, and reused after that, which is usually called _lazy initialization_, where creation is delayed until the moment it's actually needed.

We can also isolate the method call itself, not just the creation. `progress` still knows `course_module` responds to `completion_percentage`:

```ruby
def progress
  weight * completion_percentage
end

def completion_percentage
  course_module.completion_percentage
end
```

That specific knowledge stays concentrated inside `completion_percentage`. If tomorrow the progress calculation comes from somewhere else, only that method needs to change.

This same principle shows up when the application depends on an external library we don't control. Imagine the certificate's PDF generation uses an external gem, with an interface based on positional arguments:

```ruby
ExternalPdfLib::Generator.new(student.name, course.title, Time.current)
```

Since we don't control that interface, creating a _wrapper_ (a layer that wraps this external dependency and hides its details from the rest of the application) helps concentrate that knowledge:

```ruby
module PdfGeneratorWrapper
  def self.generate(student:, course:)
    ExternalPdfLib::Generator.new(student.name, course.title, Time.current)
  end
end
```

The rest of the application now calls `PdfGeneratorWrapper.generate(student: student, course: course)`, without needing to know the exact order of arguments the gem expects.

Only the wrapper knows about that peculiarity.

Isolating this kind of logic in a dedicated object, similar to a [service object](/service-objects-rails), is a common way to contain that knowledge in one place.

And here's a caveat worth mentioning, it doesn't make sense to create a wrapper for every gem or every external call in the application. The abstraction needs to solve a real problem, not exist just for the sake of existing.

### Depending on abstractions, not on concrete implementations

In the dependency injection example, `IssueCertificate` calls `@generator.generate(student, course)`.

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

That call represents an abstraction, because it only expresses the behavior `IssueCertificate` needs, without determining how it's going to be carried out.

`PdfGeneratorWrapper`, which we just saw, is a concrete implementation of that behavior, but it isn't the only possible one.

In a test, for example, we can create another implementation, a fake generator that just returns a fixed PDF, without calling the real gem:

```ruby
class FakePdfGenerator
  def generate(student, course)
    "Fake PDF for #{student.name}"
  end
end
```

And when writing the test, it's this fake implementation that takes the place of the real one:

```ruby
IssueCertificate
  .new(generator: FakePdfGenerator.new)
  .call(student, course)
```

Notice that `PdfGeneratorWrapper` and `FakePdfGenerator` fulfill the same contract, both respond to `generate(student, course)`. That's why `IssueCertificate` works the same way in both cases: it only knows the abstraction, the expected behavior, it doesn't know (and doesn't need to know) which of the two implementations it's receiving.

In Ruby, we don't normally declare this interface explicitly, the way we would in a statically typed language. The expectation that the object responds to `generate` shows up implicitly, through the methods we call on it. This is usually called _duck typing_, what matters is that the object responds to the expected method, not which class it belongs to.

In _Clean Architecture_, Robert C. Martin describes something similar through the _Dependency Inversion Principle_, depending on the behavior you need, not on the specific implementation that currently provides it. It's the same idea as Sandi Metz's, just described at a scale that already thinks in terms of whole components, not just objects.

And it's worth reinforcing that earlier caveat, `Students::Public::Api` creates a boundary, but it's still a concrete implementation, a specific module with a specific method. Boundary and abstraction are similar concepts, but they aren't the same thing.

## Not every dependency needs to be removed

A common mistake is treating dependency as synonymous with problem. Every application depends on Ruby, on Rails, on gems, on other domains, on internal and external services. That's unavoidable, and that's fine.

The question that actually matters isn't whether an arrow `A → B` exists. It's what kind of knowledge crosses that arrow.

A simple, stable, intentional dependency can be perfectly acceptable without any special technique applied to it.

It's also worth telling dependency and coupling apart here.

A dependency is the fact that one component needs another to work. Coupling, on the other hand, describes how tightly those parts are tied together, and how much changes in one affect the other.

They're related concepts, but they aren't synonyms.

## How to evaluate a dependency day to day

Alright, now that we've talked through all of this, when you run into a new dependency, or review an existing one, a few questions help decide what to do with it.

The first one is: **what exactly does this code depend on?**

A specific implementation, a model, a public API, a behavior contract?

Not every dependency calls for the same kind of care.

Another useful question: **how much does this component know about the other one?**

Does it only know the behavior it needs, or does it also know internal details, like database structure, queries, and payload format?

It's also worth considering: **how often does this dependency change, and how many parts depend on it?**

A combination of frequent change with a lot of dependents is a sign that point deserves extra attention.

And, before going and creating abstractions for everything, **does this abstraction solve a real problem?**

Not every dependency needs to turn into an interface, gateway, adapter, or wrapper. Adding a layer where it isn't necessary just adds complexity without reducing any risk.

At the end of the day, what we can take away from today isn't ways to eliminate dependencies. It's understanding that they're unavoidable, and that the amount of knowledge crossing these relationships is a design decision, not an accident.

An application that's easier to change is, generally, an application where each component only knows what it actually needs to know about the others.

If you want to go deeper on this topic, the two books that guided this post are great starting points: _Practical Object-Oriented Design in Ruby_, by Sandi Metz, and _Clean Architecture_, by Robert C. Martin.

See you next time!
