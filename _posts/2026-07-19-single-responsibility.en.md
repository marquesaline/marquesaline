---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-single-responsibility
title: "Single Responsibility (SRP): thinking beyond classes"
description: "Understand the Single Responsibility Principle (SRP), how it works in classes, and how to think about it in larger applications with multiple services."
permalink: "/single-responsibility"
date: 2026-07-19
categories: ["Software Architecture", "Ruby on Rails"]
---

Today let's talk about Single Responsibility. If you've heard of SOLID, you've definitely run into this principle before, it's the "S" in the acronym.

It's one of the best known principles when it comes to code design. Sandi Metz dedicates a whole chapter to it in Practical Object-Oriented Design, and Robert C. Martin talks about it a lot in both Clean Code and Clean Architecture.

Even though it's a well known principle, it gets a lot trickier when you try to apply it outside the classic single-class example.

So let's understand what it is, see how it shows up in a class, and then expand that thinking to a bigger application context, where it's not just classes, there's services, modules, jobs, lots of things happening at the same time.

## What is Single Responsibility?

According to Sandi Metz, **a class should do the smallest useful thing possible**. In other words, it should have a single responsibility.

The most famous phrase about this, from Robert C. Martin, is: a class should have one, and only one, reason to change.

The definition doesn't say "do only one thing", it says "reason to change". That difference matters a lot, and we'll come back to it later.

Let's look at an example. Imagine an `Order` class in an e-commerce app:

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

This class calculates the order total, applies a discount, and also sends an email.

So there are three different reasons for this class to change:
- the total calculation rule
- the discount rule
- the way the confirmation is sent

If any one of these three things changes, `Order` changes too, even if the other two stay exactly the same.

We can split it like this:

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

Now each class has only one reason to change. If the discount rule changes, only `DiscountCalculator` is touched. `Order` stays the same.

You might be thinking "wait, isn't this creating too many classes?"

That's a pretty common concern. Robert C. Martin himself talks about this fear, of creating too many small classes and the code ending up too spread out to follow.

And from my point of view, it's a trade-off. Either you simplify thinking about future maintenance, or you keep everything together out of fear of "creating too much code" and pay that price down the road, when you need to change one rule without affecting the others.

So yeah, splitting things up too much can feel like overkill, especially at the start and in small projects. But in large applications, with a lot of people working on the same code, this separation tends to pay off quite a bit later on.

And deep down, it's a choice, there's no absolute right or wrong. Sandi Metz herself talks about this in the book:

> _A good designer understands this tension and minimizes costs by making informed tradeoffs between the needs of the present and the possibilities of the future._

It's also worth quickly talking about some good practices Sandi Metz brings up in the book, that help the code keep respecting SRP as it evolves, without needing to refactor everything every time a rule changes.

One point she raises is **avoiding accessing instance variables directly inside the class itself**. It seems trivial at first, but using `@type` and `@value` directly across several different methods spreads the knowledge of how that data is stored throughout the whole class:

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

Hiding these variables behind methods, any new rule about them stays concentrated in one place:

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

If the rule for "what counts as a percentage coupon" changes, only `percentage?` needs to change.

She also talks about a similar problem with raw data structures, like arrays and hashes. **If the code depends on a position in an array or a key in a hash to work, any change to that structure breaks everything that depends on it**:

```ruby
def total(line_items)
  line_items.sum { |item| item[:price] * item[:quantity] }
end
```

If someone renames the `:price` key to `:unit_price`, this method breaks, and it's probably not the only place accessing that hash this way. Encapsulating this in an object fixes it:

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

Whoever calls `total` doesn't need to know how a `LineItem` stores its data internally, just that it responds to `subtotal`.

And finally, this same reasoning also applies inside methods, not just between classes.

A method that validates, calculates, and formats at the same time has, in practice, the same reasons to change that a poorly split class would have, just on a smaller scale:

```ruby
def apply(total)
  raise ArgumentError, "invalid coupon" if value.negative?
  percentage? ? total - (total * value / 100.0) : total - value
end
```

Separating validation from calculation fixes this the same way:

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

So far, this is the most common example we see when SRP comes up. But what happens when we step outside the class level?

## Single Responsibility beyond classes

We've talked about SRP in a relatively isolated class. In this scenario, we just need to ask ourselves which behaviors really belong to that object.

It's the kind of reasoning Sandi Metz proposes when "interrogating" a class. If a method seems to answer a question that shouldn't be asked of that object, there might be a responsibility in the wrong place.

In a real application, though, there are a lot more candidates to take on a responsibility. A rule can live in an entity, a value object, a use case, a policy, a job, an adapter, or some other component of the application.

Because of that, the question stops being just "does this class do more than one thing?" and becomes "who should know about or execute this behavior?".

Let's go back to the same `Order` we used above. Questions about its state, its items, or its total value are still the order's own problem, that doesn't change:

```ruby
order.total
order.issued?
order.line_items
```

But not everything that mentions "order" is `Order`'s responsibility.

Sending the confirmation email, charging the customer, or coordinating the whole checkout flow are different responsibilities, each with its own reason to change. They can live in a mailer, a payment gateway client, or a use case that orchestrates the whole process:

```ruby
OrderConfirmationMailer.send(order)
PaymentGatewayClient.charge(order)
SubmitOrder.call(order)
```

SRP is still the same principle as always. What changes in a larger application is the number of possible places for that responsibility to live, and that's what makes it harder to see.

Another one of Robert C. Martin's definitions helps a lot here. According to him, a "reason to change" is tied to a person or group of people interested in that change, what he calls an actor.

This gets easier to see when we look at a whole component, not just loose methods. Imagine a component called `OrdersService`:

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

At first glance, the methods look related because they all mention orders. But they represent different knowledge:

- `process` knows the operational rules for creating orders
- `monthly_report` knows analytics and reporting needs
- `notify_marketing` knows the marketing communication process

Doing three things isn't really the problem. The problem is that these three parts can change independently, for different reasons.

A new rule for creating orders shouldn't force the same component to change along with report generation. In the same way, a change in marketing communication shouldn't put order processing at risk.

We can separate these responsibilities:

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

The exact names don't matter, and neither does the fact that we ended up with three classes. What matters is that each component now concentrates knowledge that tends to change together.

Deep down, `OrdersService` is still just a class. That's how we always express any unit in Ruby, whether it's a domain, a module, or a whole service, the syntax doesn't change. What changes is what that component represents inside the application, and how many different actors depend on it.

This same logic shows up in units we don't usually think of as a "class", like a job. Imagine a job that closes out an order's checkout:

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

The job doesn't know the internal rules of each step, `LoyaltyPointsCalculator` handles points, `InvoiceGenerator` handles the invoice. What `CheckoutJob` concentrates is the orchestration: deciding which steps happen, in what order, and what to do when one of them fails.

And that's where the problem lies, the four steps end up sharing the same fate, if any of them fails, ActiveJob retries the whole job again. A failure in `MarketingNotifier`, for example, makes the job reprocess the payment and generate the invoice again, even if those two steps had already succeeded on the first attempt.

If the finance team wants invoice generation to have its own retry policy, without re-running payment and loyalty along with it, the whole `CheckoutJob` needs to change, because the orchestration of the four steps lives in one single place.

Here, the reason to change is the coordination between teams, not the knowledge of each one's rules. Same problem as `OrdersService`, just that the unit is now a job.

We can fix this by separating orchestration from execution. Instead of the job calling the four steps in sequence, sharing the same fate, each step becomes its own job, triggered independently.

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

Now `CheckoutJob` has just one responsibility: confirming the payment and triggering the other steps, without waiting for or depending on their result. Each queued step runs independently, if `NotifyMarketingJob` fails, only it gets reprocessed by ActiveJob. Payment and invoice aren't touched again.

And each job now has just one reason to change, matching a single actor, `GenerateInvoiceJob` changes when the tax rule changes, and the finance team decides its own retry policy. `CreditLoyaltyPointsJob` changes when the loyalty rule changes. `NotifyMarketingJob` changes when marketing communication changes.

Before, these four reasons to change were tied together in the same `perform`, sharing the same retry policy without anyone having decided that on purpose.

The separation doesn't reduce code, it decouples the fate of each responsibility from the others. It's the same logic as `Order` at the start of the post, just applied at the level of asynchronous execution.

If you've already read the post about [coupling](/what-is-coupling) here on the blog, this is pretty similar to that idea that a design concept isn't tied to a single form, it repeats itself across different units of the application: class, service, job, module.

At the end of the day, SRP isn't a rule exclusive to models or small classes. It's a way of thinking about distributing responsibility: group together what changes together, separate what changes for different reasons, whether that's a class, a service, or a job.

In a larger application, the principle still holds. It just gets harder to see, because now there are more units, layers, and integrations competing for space for each responsibility.

## How to think about this day to day

Thinking about the Single Responsibility principle day to day isn't always easy (I say that from experience). So a question that helps a lot, at any level, whether it's a class, service, or module, is: **who's going to ask for a change here, and why?**

If the answer involves more than one team, or more than one reason that has nothing to do with the other, that's a sign that component is carrying more than one responsibility.

Another tip, this one from Sandi Metz herself, is **trying to describe what that component does in a single sentence**. If you need to use "and" or "or" along the way, like "processes the order and sends a marketing notification", that's already a sign there's more than one responsibility in there.

It's also worth **paying attention to who touches that file, and why**. If the commit history shows changes from completely different teams, one day it's the finance team adjusting the invoice, another day it's marketing changing the email copy, that's a pretty concrete sign that different actors live in there.

And **notice how much effort it takes to test**. If testing a component requires mocking a bunch of unrelated things, like a payment gateway, a points calculator, and a marketing client in the same test, that's usually a reflection of mixed responsibilities. A hard to write test almost always points to a design problem.

And remember, just like with coupling, the goal isn't to take this to the extreme. It's not possible, and it doesn't make sense, to split everything into tiny components just for the sake of it. The idea is to notice where different reasons to change are mixed together in the same place, and then decide whether it's worth separating them.

This is one of those principles that seems simple when you only look at the single-class example, but that gains another layer of complexity as the application grows and more people start working on it.

I hope this post helped you think about SRP in a slightly broader way.

See you next time!
