---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-analise-estatica
title: "Static Analysis: beyond linting"
description: "Static analysis is often associated with code standardization, but it goes way beyond that. In this post I explore how tools like RuboCop, Brakeman, and Packwerk protect different architectural characteristics of a Rails application."
permalink: "/static-analysis"
date: 2026-05-17
categories: ["Software Architecture", "Ruby on Rails"]
---

The other day, studying Software Architecture, I ran into fitness functions, a concept that shows up a lot in architecture and refers to automated mechanisms used to continuously verify that the application keeps respecting certain structural rules and architectural characteristics defined by the team.

The idea is that an application's architecture shouldn't depend only on devs remembering it, or on documentation that often only gets read during onboarding. The architecture needs to be validated continuously, and fitness functions help with exactly that.

But something important is that a fitness function isn't a specific tool, it's an architectural concept that can be applied in a lot of different ways.

Static analysis tools, automated tests, CI/CD pipelines, observability, and monitoring can all be used as ways to implement fitness functions in practice, as long as they're continuously validating some important rule or architectural characteristic of the application.

So what I want to explore in this post is one of these forms of application: static analysis.

## What is static analysis?

Static analysis is a technique that involves analyzing code without running the application. That means we're not going to boot the server, run requests, click on something in the interface, or execute any real system flow.

The analysis happens directly on the source code, and it tries to identify patterns, risks, and problems that can be detected even before the application runs.

Depending on the tool, this can involve complexity analysis, dependencies between modules, security vulnerabilities, project conventions, improper [coupling](/what-is-coupling), and other issues related to the system's structure.

In practice, static analysis can be used to detect things like dead code, unused variables, high complexity, vulnerabilities, forbidden dependencies between parts of the application, convention breaks, and several other types of problems.

Let's look at an example:

```ruby
class OrdersController < ApplicationController
  def index
    if params[:status].present?
      @orders = Order.where("status = '#{params[:status]}'")
    else
      @orders = Order.all
    end

    if params[:user_id].present?
      @orders = @orders.where(user_id: params[:user_id])
    end

    @orders = @orders.order("created_at #{params[:direction]}")
  end
end
```

Reading this code, a static analysis tool could already raise a few points of attention.

The first problem is in how the query gets built:

```ruby
Order.where("status = '#{params[:status]}'")
```

Since the value comes straight from `params`, there's a risk of SQL Injection. A tool like Brakeman could flag this snippet as vulnerable, because the application is interpolating external input directly inside a SQL query.

A similar point shows up in the `order`:

```ruby
@orders.order("created_at #{params[:direction]}")
```

Here too, user input directly influences the query. Even if the intention is to only allow `asc` or `desc`, the code doesn't guarantee that. The safer approach would be to explicitly validate which values are allowed before using that parameter.

Besides the security side, a tool like RuboCop could also complain about the method's complexity. `index` starts out simple, but it already has conditionals, query building, and filtering rules all in the same place. In a real case, this kind of method tends to grow with more filters, more ordering, and more permission rules.

This example shows something important: static analysis doesn't need to execute the flow to notice risks. It can look at the code's structure and identify patterns that usually indicate a problem, like external input used in a query, methods growing too much, or mixed responsibilities in the controller.

## What kinds of problems does static analysis try to solve?

Something that started catching my attention while studying static analysis is that it doesn't try to solve just one type of problem.

Before studying this, I had a pretty simplified view that tools like this were basically for "standardizing code" or complaining about style. But in practice, there are different tools trying to protect completely different things inside the system.

There are tools more focused on consistency and project conventions, others focused on security vulnerabilities, and others trying to control complexity or improper coupling between modules of the application.

That's where things got more interesting: static analysis goes way beyond linting.

In Rails applications, for example, one tool might try to identify SQL Injection risk without running the application, while another might analyze whether certain modules are coupling in a way the team decided to avoid architecturally.

Different tools end up protecting different characteristics of the system.

### Tools in the Ruby/Rails ecosystem

When I started researching static analysis in the Ruby/Rails ecosystem more, a few tools kept showing up constantly. But what caught my attention was that they don't try to solve the same kind of problem.

Each of them seems to focus on protecting a different characteristic of the application.

#### RuboCop

One of the best known tools in the Ruby ecosystem is [RuboCop](https://rubocop.org){:target="_blank" rel="noopener noreferrer"}.

At first, it's common to associate RuboCop only with code standardization, like single or double quotes, line length, spacing, and writing conventions. And that really is part of its role.

But RuboCop goes beyond that. It can also spot problems related to code complexity and maintainability.

For example, imagine a method like this:

```ruby
def process_order(order)
  if order.paid?
    if order.items.any?
      if order.customer.active?
        send_confirmation_email(order)
        update_inventory(order)
        notify_analytics(order)
      else
        cancel_order(order)
      end
    else
      mark_as_invalid(order)
    end
  else
    send_payment_reminder(order)
  end
end
```

Even without running this code, a tool like RuboCop could point out that this method has a lot of complexity, a lot of possible paths, and too many responsibilities concentrated in the same place, a sign that this method is violating the [single responsibility principle](/single-responsibility).

The problem here isn't just "the code looks ugly." Methods like this tend to be harder to test, harder to change, and easier to break when a new business rule shows up.

In that sense, RuboCop can help protect an important architectural characteristic: **maintainability**.

It doesn't guarantee the application's architecture is good, but it can work as a warning sign when parts of the code start growing too much or piling up responsibilities.

#### Brakeman

[Brakeman](https://brakemanscanner.org){:target="_blank" rel="noopener noreferrer"} goes in a different direction. Instead of looking at complexity or conventions, it tries to identify security vulnerabilities in the application.

An example:

```ruby
User.where(“email = '#{params[:email]}'”)
```

This snippet, interpolating params straight into the query, is a classic SQL Injection pattern. Brakeman can identify this without needing to run the system, just by reading the code's structure.

Another type of vulnerability Brakeman also detects is XSS, and a common example in Rails shows up with `html_safe`:

```ruby
def show
  render html: params[:message].html_safe
end
```

`html_safe` is a way of telling Rails "you can trust this string, no need to escape it." By default, Rails escapes any content before rendering it in the browser precisely to avoid this. When you use `html_safe` on a params value, anything the user sends gets rendered straight into the page, including scripts. This opens the door to XSS, which is when someone manages to inject and execute code in someone else's browser.

Brakeman flags this pattern because the combination of `html_safe` with external input is a clear sign of risk.

This was what started making it clearer to me that static analysis has a lot more to do with reducing risk than with standardizing code, and that it connects directly to architectural characteristics like **security** and **reliability**.

#### Packwerk

One of the tools that caught my attention the most while studying this topic was [Packwerk](https://github.com/Shopify/packwerk){:target="_blank" rel="noopener noreferrer"}.

While tools like RuboCop and Brakeman analyze code quality and security more, Packwerk tries to solve a more architectural problem: controlling dependencies between parts of the application.

Its idea is to let you create boundaries inside a Rails monolith, defining which parts of the system can or can't depend on each other.

This might seem like overkill at first, but in large applications it's pretty common for the application's modules to start coupling more and more over time.

For example:

- a billing module directly accessing internal analytics code
- a payments context depending on details of the notification system
- an email sending service coupled to business rules from another domain

At first this might seem like just a small shortcut. But as the system grows, these dependencies start making the application harder to change, test, and evolve.

What Packwerk does is turn these architectural rules into automated checks.

In other words, instead of the architecture depending only on documentation or code review, the tool itself can warn when certain dependencies considered invalid start showing up inside the system.

There are plenty of other tools besides these. But looking at RuboCop, Brakeman, and Packwerk together, what stands out is that each one is trying to stop a different type of problem from silently growing inside the application, whether that's complexity, vulnerabilities, or improper coupling.

When I started studying this topic, I thought static analysis was basically a style tool. What I didn't expect is that it would be one of the most practical ways to make an application's architecture stop living only in the team's head and start being verified automatically.

It's not about picking the right tool. It's about deciding which characteristics of the application need to be protected, and making sure that protection happens continuously, not just during code review or in documentation.
