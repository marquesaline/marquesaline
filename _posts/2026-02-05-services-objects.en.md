---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-services-objects-rails
title: "Service Objects: what they are and when to use them"
description: "Understand what Service Objects are in Rails, when to use them, and how to organize business logic in larger applications."
permalink: "/service-objects-rails"
date: 2026-02-05
categories: [Ruby on Rails]
---

First of all, we need to understand what service objects are.

If you've ever coded in Rails, especially on a large project, you've probably already run into them.

Let's get into it!

Service objects are essentially objects that encapsulate a certain piece of business logic, with the goal of removing complexity from models and controllers.

Usually these objects perform just a single action (process), which keeps you from piling more procedures into other files.

Let me give you an example.

Imagine a simple feature: completing an order in an e-commerce app.

At first glance, it seems simple. The user clicks "checkout" and that's it.
But behind that button, a bunch of things can happen:

- validating that the order is still open
- checking stock
- processing payment
- updating the order status
- sending a confirmation email
- logging events

Now comes the important question: **where should this logic live?**

In the controller? In the model?

In small applications, you might see all of this in a single place, usually the model.

Does it work? Yes.

The problem is that, over time, this class ends up with too many responsibilities. Small changes to one rule end up affecting behaviors that have nothing directly to do with each other.

On top of that, it makes the code harder to maintain and test each part.

This is where a service object comes in, as an object responsible for representing that specific process: completing an order.

Instead of spreading this logic across the controller and the model, the service object centralizes that flow in a single place, leaving each part of the application with a [clear responsibility](/single-responsibility).

The controller just orchestrates the request. The model handles the entity's rules, and the service object coordinates the business logic involved in the process.

Cool? Now let's understand how this works in practice.

## Service Objects in Rails

Well, I'll go ahead and tell you that in Rails a service object is nothing more than a regular Ruby class, but one created with the goal of executing one very specific process.

There's no official Rails convention specifically for Service Objects, especially since MVC architecture only separates things into models, views, and controllers.

Service objects end up being a way to expand the business layer once it starts growing beyond what the model can hold. If you want to understand better how this layered organization works, check out this post about [layered architecture](/layered-architecture).

But back to the topic, you'll find that the community has settled on a few practices.

The most common place to put service objects is `app/services`. But keep in mind you might see other conventions depending on the company you're working at.

Also, to avoid naming confusion, the community usually follows a few simple patterns.

Generally, service objects have names that clearly represent the action they perform, usually using a verb in the class name. For example:

- `CreateUserAccount`
- `SendWelcomeEmail`
- `CompleteOrder`

The idea here isn't to create a rigid rule, but to make the code easier to read. When someone sees this name, they already know exactly what that object does, without needing to open the implementation.

NOTE: worth repeating again that this isn't "set in stone", meaning you can, and probably will, run into other kinds of structures and conventions.

### Basic Structure of a Service Object

Well, considering a service object is meant to carry out just one piece of business logic in isolation, its structure doesn't need to be very complex.

As I mentioned before, it's usually just a regular Ruby class.

Beyond that, it usually exposes only one public method, commonly called `call`, but sometimes it can also be `perform`, just remember it's really more of a naming convention.

With this, every time we need to call the service, we just need to call the class and the method.

A simple example of a service object structure in Rails could look something like this:

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

Notice this service object only has one action: completing the order.

It's going to receive the data it needs in `initialize`, and the only exposed method is `call`, which is responsible for organizing and calling all the other methods to orchestrate the flow.

And notice it doesn't replace the model or the controller either.

The service object just coordinates the business logic for that specific process.

So, whenever we need to call this service, the controller would only have this one responsibility, and handling the result:

```ruby
class OrdersController < ApplicationController
  def complete
    # Assuming @order was loaded correctly
    if CompleteOrder.new(@order).call
      redirect_to @order, notice: "Order completed successfully"
    else
      redirect_to @order, alert: "Unable to complete the order"
    end
  end
end
```

So, the controller just calls `CompleteOrder.new(@order).call`, and that way, all the order completion logic doesn't need to stay [coupled](/what-is-coupling) to the controller, it lives in a separate part, making the code easier to maintain.

## When to Use a Service Object

Now that we understand the structure and how it's usually done in Rails, let's understand when to use it or not.

In general, service objects tend to make more sense when an operation starts involving more than a simple action on a single model.

Think about it with me, if creating a user in the application just requires saving some data to the database, a simple `User.create` already solves the problem.

Now, let's imagine the flow starts growing, and now you need to:

- make sure the email isn't blocklisted or already used in another context
- associate that user with an organization or account
- enqueue a job to send an email
- notify an external service via API
- log events or metrics for this process

Notice how the flow grew? All of this couldn't stay in the model and controller, it won't be simple to maintain.

Look at how this controller could end up looking with all of that:

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

You can tell right away that this controller isn't just orchestrating the user creation request, it's also concentrating all the business rules and integrations.

And here's an important point... would this code work? Yes! But it would be hard to test and maintain.

Some signs that it's time to use a service object: the controller starts growing with logic that isn't its responsibility, the same rule starts showing up in different places (controllers, jobs, callbacks), or the model starts concentrating behaviors that have nothing to do with the entity itself.

Something that helps me a lot is trying to explain a given model or controller out loud to myself. Explaining code is always useful for understanding better what it's doing, and if there's too much stuff inside a controller or model that goes beyond their responsibility, that's already a sign.

## When NOT to Use Service Objects

Even though they're very useful, service objects don't need to be used in every scenario.

Simple CRUD operations, validations that belong to the model, filters that a scope already solves... in these cases, creating a service object just adds unnecessary complexity. The extraction only makes sense when it makes the code easier to understand, not when it's done out of habit or to "look more organized."

A concrete example of when not to use one is when the logic clearly belongs to the model itself.

Imagine a simple user model with a validation and a small behavior:

```ruby
class User < ApplicationRecord
  validates :email, presence: true, uniqueness: true

  def active?
    status == "active"
  end
end
```

See, in this case, it doesn't make sense to pull this logic out into a service object, because the validation and the `active?` method are directly about the state of the data, which in this case is a behavior of the `User` entity.

See the difference?

Let's look at an example in the controller:

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

In this case, the controller is doing exactly what's expected of it: receiving the request, creating the record in the database using the model, and handling the response.

So, keep in mind that service objects aren't a mandatory rule or pattern. They exist to help organize business logic once complexity starts growing.

At the end of the day, the question isn't "can I use a service object here?", but rather "does this actually make the code clearer?".

It's not something to use to make the code look pretty or to replace models or controllers, they exist to help when the logic starts growing and it gets hard to understand where each responsibility should live.

I hope this helped you understand this pattern better, because you'll definitely run into it in large applications.

See you next time!
