---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-arquitetura-em-camadas
title: "Layered Architecture"
description: "Understand what layered architecture is, how isolation between layers works, the difference between closed and open layers, and the trade-offs of this architectural style."
permalink: "/layered-architecture"
date: 2026-06-14
categories: ["Software Architecture", "Ruby on Rails"]
---

If you've ever worked with Rails, you've probably used layered architecture without even noticing. It shows up, in one way or another, in most of the applications we build day to day.

But what exactly is it, and why does it matter? Let's talk about it.

## What is Layered Architecture?

According to Mark Richards, layered architecture is one of the most common architectural styles, especially in enterprise applications. The idea is to organize the system into groups of well defined responsibilities, which we call layers. Each layer has a specific role, and they communicate with each other in an organized way.

The main goal is to separate responsibilities so that each part of the system takes care of just one thing, without needing to know implementation details from the others.

Notice how similar this is to the way Rails separates its folders and files?

A classic example is the split into three layers: presentation, business, and data.

- **Presentation** is the layer that interacts with the user. In a web context, this is where views, controllers, and HTTP responses live.
- **Business** is where the application logic lives. The rules, the processes, what the system actually does.
- **Data** is responsible for accessing and persisting information, whether in a database, a cache, or an external service.

In a Rails application, this shows up pretty directly:

```
Presentation  →  Controllers, Views
Business      →  Models, Service Objects
Data          →  ActiveRecord, repositories
```

When a user makes a request, it hits the controller (presentation), which calls the business logic, which in turn accesses the data. The flow goes down through the layers.

## Isolation Between Layers

Alright, but having layers isn't enough. What really makes this style work is the isolation between them.

Isolation means each layer only knows what it needs to do its own job.

The presentation layer doesn't need to know how data is stored in the database. The data layer doesn't need to understand the business rules.

This is guaranteed by **contracts between layers**. Each layer exposes a clear interface to whatever's above it. The layer above calls that interface, without depending on the details of how it was implemented underneath.

Think about it this way: the controller calls `OrderService.complete(order)`. It doesn't need to know if that hits the database, sends an email, calls an external API, or anything else. It only knows that contract exists and what it's going to get back.

This reduces coupling between the parts of the system. If you need to change how an order gets completed, you change the service. The controller doesn't need to be touched.

Oh, and if you want to know more about coupling, I suggest checking out [this post](/what-is-coupling) here on the blog.

Let's look at an example. Imagine a controller that fetches a user's recent orders:

```ruby
# without isolation: the controller knows too much
class OrdersController < ApplicationController
  def index
    @orders = Order.where(user_id: current_user.id)
                   .where("created_at >= ?", 30.days.ago)
                   .order(created_at: :desc)
  end
end
```

This controller is navigating straight through the database structure. If the query changes, the controller changes with it.

With isolation:

```ruby
# with isolation: the controller only knows the contract
class OrdersController < ApplicationController
  def index
    @orders = Order.recent_for(current_user)
  end
end

class Order < ApplicationRecord
  scope :recent_for, ->(user) {
    where(user: user)
      .where("created_at >= ?", 30.days.ago)
      .order(created_at: :desc)
  }
end
```

Now the controller only knows there's a `recent_for`. The details stay hidden inside the data layer.

And what happens when that contract gets ignored?

Imagine another part of the application also needs a user's recent orders. Without isolation, someone's going to copy the same query into the new controller. When the rule changes, for example the window going from 30 to 60 days, who remembers to update it everywhere? That's the kind of problem that starts small and keeps growing along with the application.

With `recent_for` centralized in the model, the change happens in one place. Whoever calls it doesn't even need to know something changed.

This isolation also defines how the flow happens. Each request moves through the layers in sequence, top to bottom. Presentation calls business, business calls data. Always in that order.

But then a question comes up: is that flow always mandatory? Does every request need to go through every layer?

The answer depends on how the layers are defined in the system. And that's where the distinction between closed and open layers comes in.

## Types of Layers

### Closed Layers

In a closed layers model, a request needs to go through every layer, in order, with no skipping.

In other words, the request comes from presentation, passes through business, and reaches data. It can't go straight from presentation to the database, skipping the middle.

```
Presentation
     ↓
  Business
     ↓
   Data
```

This reinforces isolation because it guarantees each layer only interacts with the layer immediately below it. No layer has direct access to things outside its neighborhood.

**Advantages:**

The main gain is that isolation is guaranteed by the structure, not by developer discipline. This matters especially on larger teams, with devs joining and leaving. Trusting that everyone will respect the contracts on their own is risky. With closed layers, the architecture enforces it automatically.

On top of that, a request's flow is easy to follow. You know it's always going to go through the same sequence, so when something breaks, you know where to look.

**Disadvantages:**

The problem shows up in simple cases.

Imagine a report screen that just needs to count how many orders were placed this month. There's no business rule involved, it's just a direct database query. But with closed layers, you still have to create a service that calls the model, that calls the database. Layers just to follow protocol, without adding anything.

In high volume systems, this can also weigh on performance. Every request passes through more points, which means more execution time.

Mark Richards calls this problem the _sinkhole anti-pattern_: when most requests just pass through the layers without any logic, the cost of the indirection stops being worth it.

And that brings us to the alternative for when this mandatory path starts weighing more than it helps.

### Open Layers

In the open layers model, some layers are optional. The request can skip one of them when it makes sense.

```
Presentation
     ↓
  Business   ← can be skipped
     ↓
   Data
```

Imagine you have an endpoint that just needs to list an order's available statuses. There's no business logic involved. In this case, it makes sense for the controller to access the data directly:

```ruby
class OrdersController < ApplicationController
  def statuses
    render json: Order.statuses.keys
  end
end
```

No service in between, no indirection. Simple, fast, direct.

**Advantages:**

For cases like this, where the middle layer isn't doing anything useful, the flexibility to skip it is welcome. The code stays leaner and you avoid creating abstractions that exist just to exist.

**Disadvantages:**

The risk is the team starting to skip layers frequently, without much criteria. At first it seems reasonable: "this case is simple, it doesn't need the service." But that accumulates, and over time it gets hard to tell which exceptions were justified and which turned into shortcuts. A request's flow stops being predictable, and understanding the whole system gets harder.

In practice, most applications use a mix of both models. Closed layers as the general rule, with specific exceptions where skipping makes sense, as long as the team is disciplined about telling one from the other.

Now that we understand what layers are and how they relate to each other, it's worth taking a more critical look at this style: what does it solve well, and where does it start showing limitations?

## Trade-offs of Layered Architecture

Like any architectural decision, there's no absolute right or wrong. It depends on the application's context.

On the positive side, it's a style that's simple to understand and easy to explain to teams. Any dev who joins a project organized in layers can find their way around quickly: where's the logic? In business. Where's the query? In data. The flow follows a clear direction and each part has a defined responsibility, which makes it easier to maintain and test.

On the negative side, in simple systems it can create unnecessary indirection. Sometimes you end up creating a service layer that just passes the call through to the model, without doing anything special. Extra code with no real gain.

There's also the risk of overdoing the abstractions. It can become a habit to create [service objects](/service-objects-rails), repositories, and interfaces for everything, even when it's not needed. Abstractions have a cost. More files, more jumps to understand the code, more things to maintain.

And when the application grows a lot, two problems show up together:

- The business layer can turn into a giant catch-all, with service objects from completely different domains thrown into the same place.
- This model leads you to think about "where does this code technically go?" but not necessarily "what part of the business does this belong to?". In larger systems, organizing by domain usually makes more sense than organizing by technical type.

That said, these problems tend to show up once the application has already grown quite a bit. For most day to day cases, layered architecture handles what needs to be handled just fine.

I hope this made it clearer how this style works!

See you next time.
