---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-o-que-e-acoplamento
title: "Coupling: what it is, types, and how to decouple it"
description: "Coupling is one of the most important concepts in software architecture. Let's explore what coupling is, why it matters, and how to think about it beyond dependency between classes."
permalink: "/what-is-coupling"
date: 2026-05-31
categories: ["Software Architecture", "Ruby on Rails"]
---

When we talk about software architecture, one topic that always comes up is coupling, and whenever we talk about it, we tend to think mostly about classes or objects that depend on each other.

That kind of thinking isn't wrong, but it only captures part of an idea that goes further than that.

To get started, let's understand what coupling actually is.

## What is coupling?

Coupling, according to Mark Richards, is when components are connected in such a way that changing one will impact the behavior of another component.

So, basically, we're talking about the dependency between components of a system.

The more coupled the components, the harder it becomes to maintain or test them, because you'll always depend on another component to do it.

And just to be clear, when we say "component", it can mean a class, a module, a whole service, a domain, and so on.

Let's think about an example.

Imagine an e-commerce with two separate services:

- Orders
- Inventory

Every time a new order comes in, the Orders service calls the Inventory service to check if the product is available, and only then confirms the order to the customer.

These two services don't share any code. They're separate codebases, different teams. But they're highly coupled, because if the Inventory service goes down, the Orders service stops working right along with it.

This is an example of coupling at the service level, not the class level. And it's exactly the kind of thing we miss when we only think about coupling at the code level.

To understand this "beyond" better, Mark Richards splits coupling into two types: static and dynamic.

## Types of coupling

### Static

Static coupling is about structural dependencies, meaning things that exist regardless of whether the system is running or not. It's the kind of coupling you see by looking at the architecture, not the behavior.

A classic example is a shared database. Imagine our e-commerce's Orders and Reports services both access the same `orders` table in the database.

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

The two services never call each other directly. But if the `value` column gets renamed to `total_value`, both break. The dependency isn't in one calling the other's code, it's in the shared database structure.

Another place this shows up a lot is inside a Rails monolith, when modules from different domains access each other's models directly.

```ruby
# billing module directly accessing the user model
class BillingService
  def generate_invoice(user_id)
    user = User.find(user_id)
    address = user.profile.billing_address
    Invoice.create!(user: user, address: address)
  end
end
```

`BillingService` knows that `User` has a `Profile`, and that this profile has a `billing_address`. If the internal structure of `User` or `Profile` changes, the billing module feels it, even though it's a completely different domain.

### Dynamic

Dynamic coupling happens when two components need to be available at the same time for the system to work.

This is exactly the example we saw earlier: the Orders service calling the Inventory service synchronously. If Inventory is down, Orders gets stuck right along with it, because it needs an immediate response to continue.

```ruby
# order service
class OrdersController < ApplicationController
  def create
    # if InventoryService doesn't respond, this line fails
    available = InventoryService.check_stock(params[:product_id])
    return render json: { error: "Out of stock" }, status: 422 unless available

    Order.create!(order_params)
  end
end
```

There's nothing wrong with the code itself. The problem is architectural: a synchronous call creates a time dependency between the two services. If one goes down, the other feels it.

And this kind of coupling doesn't only show up in HTTP calls. Scheduled jobs suffer from it too, let's look at another example.

```ruby
# job that aggregates sales data (runs at midnight)
class AggregateSalesJob < ApplicationJob
  def perform
    Sale.where("created_at >= ?", 1.day.ago).each { |sale| SalesReport.aggregate(sale) }
  end
end

# job that emails the report (runs at 00:30)
class SendDailyReportJob < ApplicationJob
  def perform
    report = SalesReport.daily_summary
    ReportMailer.daily(report).deliver_now
  end
end
```

If `AggregateSalesJob` takes longer than 30 minutes, `SendDailyReportJob` fires with incomplete data. Neither job calls the other, but they're coupled through timing.

Now that we understand what coupling is and how it shows up, it's worth talking about how to reduce it.

But it's worth making clear that the goal isn't zero coupling. Every system has, and needs, some coupling, otherwise components wouldn't even talk to each other. What we want is to avoid unnecessary coupling.

## How to decouple

The answer depends on the type of coupling, so let's look at each one separately.

For dynamic coupling, a common approach is to swap the synchronous call for asynchronous communication. Instead of waiting for a response from Inventory to confirm the order, the Orders service publishes an event and moves on.

```ruby
# before: synchronous, dynamic coupling
def create
  available = InventoryService.check_stock(params[:product_id])
  return render json: { error: "Out of stock" }, status: 422 unless available

  Order.create!(order_params)
end

# after: asynchronous, no dynamic coupling
def create
  order = Order.create!(order_params.merge(status: :pending))
  OrderCreatedEvent.publish(order_id: order.id, product_id: params[:product_id])

  render json: order, status: :created
end
```

The order is created with a `pending` status and an event gets published. The Inventory service listens for that event and processes it when it can. If Inventory is down, Orders doesn't even know, and doesn't need to know.

For static coupling, the idea is to keep a component from navigating another component's internal structure. This is where the **Law of Demeter** comes in.

### Law of Demeter

The Law of Demeter says an object should only talk to its direct neighbors, without navigating through the structure of other objects.

Direct neighbors are what the object knows firsthand: itself, the parameters it receives, and the objects it created or already holds as an attribute.

Navigating, in this context, means leaving one object and crossing through others to get where you want.

When you write `order.customer.address.city`, you're navigating: you start at `order`, pass through `customer`, pass through `address`, and only then reach `city`. Each point is a different object being crossed.

Let's look at an example.

Imagine an `InvoiceService` that needs the customer's city to calculate tax:

```ruby
class InvoiceService
  def generate(order)
    city = order.customer.address.city
    tax_rate = TaxCalculator.rate_for(city)
    # ...
  end
end
```

The problem here is that `InvoiceService` knows `Order` has a `Customer`, which has an `Address`, which has a `city`. It's coupled to that whole chain.

If the structure of `Address` changes, for example if the city moves into a `Location` object, `InvoiceService` breaks even though it has nothing to do with that model.

One possible solution is to make `Order` expose only what the outside needs to know. In Rails, we do that with `delegate`:

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

Now `InvoiceService` only knows about `Order`. If `Address` changes internally, only `Order` needs to be updated. The coupling stays contained in the right place.

Isolating this kind of logic in a dedicated object, like a [service object](/service-objects-rails), is another common way to contain this coupling.

It's not an absolute rule, but it's a good sign that a component knows too much about another one's internal structure.

At the core, the idea is this: each object hides its own structure and exposes only what's needed. Whoever's outside doesn't need to know how things are organized internally, right?

So, we've now got a bit of an understanding of how coupling works. It's one of those concepts that seems simple in its definition, but gets more interesting the more you start seeing it at different levels.

And keep in mind I only covered a few examples of coupling, because the truth is it can show up in code in a lot of different ways.

If you want to know how automated tools help protect the application from this kind of problem on an ongoing basis, I wrote a post about [static analysis](/static-analysis).

Well, I hope this helped you understand a bit more about this topic.

See you next time!
