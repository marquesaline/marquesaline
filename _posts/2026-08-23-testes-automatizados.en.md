---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-testes-automatizados
title: "Automated Testing: types, TDD, and testability"
description: "Understand the difference between unit, integration, and end-to-end tests, how TDD influences code design, the FIRST principles, and how testability connects to architecture decisions in Ruby on Rails applications."
permalink: "/automated-testing"
date: 2026-08-23
categories: ["Software Architecture", "Ruby on Rails"]
---

One of the most common reasons people give for writing automated tests is to prevent regressions, basically, making sure a new change doesn't break a behavior that already worked before.

But just knowing that tests prevent regressions doesn't help much when it's time to decide what type of test to write, or how to tell if a test is actually a good one.

Today let's take a closer look at this topic. We'll go over what TDD is, the principles behind a clean test (FIRST), the different types of automated tests (unit, integration, and end-to-end), and how all of that connects to the design of the code itself, not just to the guarantee that it works.

Oh, and it's worth repeating: even though I'll use examples with Ruby, Rails, RSpec, and Capybara, the ideas apply to any language or framework.

## TDD (Test-Driven Development)

TDD (Test-Driven Development) is a software construction technique.

It's pretty common for people to think TDD is just a way of writing tests before the code, but it's a lot more than that. TDD directly influences design, because the end result needs to be testable from the start.

Robert C. Martin, in Clean Code, sums up TDD in three laws:

1. You can't write any production code before you have a test that detects a failure that doesn't exist yet. In other words, no implementation starts without a test first proving that behavior isn't there yet.
2. You can't write more of a unit test than what's enough to detect that failure. Basically, the test needs to be small enough to prove just that, without already testing behaviors that haven't even been implemented yet.
3. You can't write more production code than what's enough to make that test pass. In other words, resist the urge to implement more than what the test is asking for at that moment.

It's worth clarifying here that the "production code" he keeps mentioning is the application code itself, the code that's actually going to run and solve the problem. Think of it as the opposite of test code, which only exists to check whether the first one is behaving the way it should.

Anyway, following these laws to the letter, development happens in very small cycles, known as Red, Green, Refactor:

- **Red**: write a test that fails, because the behavior doesn't exist yet.
- **Green**: write the minimum amount of code to make that test pass, even if the implementation isn't ideal yet.
- **Refactor**: improve the code, knowing the tests that already pass keep guaranteeing nothing broke.

The cycle repeats for the next behavior, and so on.

See why summing up TDD as just "writing the test first" oversimplifies things?

What TDD actually proposes is letting the need to test guide small design decisions, one behavior at a time.

## Clean tests and the FIRST principles

Writing the test before the code doesn't guarantee that test is any good.

That's where the FIRST principles come in, also presented by Robert Martin.

FIRST is an acronym:

**Fast**: tests need to run quickly, because they're going to be run constantly during development. And that's not just about comfort, think about it, if the suite takes too long, people on the team end up running tests less often, or simply avoid writing new ones, which defeats the whole point of having automated tests in the first place.

Now, what counts as fast obviously changes depending on the level of the test. Unit tests tend to be a lot faster than integration tests, which in turn tend to be faster than end-to-end ones.

**Independent**: a test shouldn't depend on another one running, or on state left behind by a previous test.

A classic example of this is a test that only passes because a record was created by the previous test, without creating its own. In other words, if you run that test on its own, or change the order of the suite, it breaks, even with no real change in behavior. That's a sign the tests are [coupled](/what-is-coupling) in a way they shouldn't be, each test needs to set up its own scenario from scratch.

**Repeatable**: the result needs to be the same no matter how many times the test runs, whether on your machine, in CI, or a month from now.

A common example is a test that checks whether a promotion is active by comparing it to `Time.now`, something like `promotion.active?(Time.now)`. If the promotion's expiration date used in the test is fixed, that test passes today and starts failing on its own once that date passes, even if nobody changed anything in the code.

On top of that, depending on an internet connection or a real external service also compromises repeatability, because the test starts failing due to network instability, not an actual problem in the application.

**Self-validating**: the test itself needs to decide, on its own, whether it passed or failed, through a clear expectation, like `expect(result).to eq(expected)`. You shouldn't need to read a log or manually check some output in the terminal.

**Timely**: the test needs to be written at the right moment in development, not weeks after the code already exists. In TDD, that moment is before the production code.

Now that we understand what tests need to look like, let's understand the types of tests we can have.

## Types of tests

There are three main types of automated tests: unit, integration, and end-to-end. Each one represents a different level of confidence and isolation.

The difference between them lies in what the test actually exercises.

What defines a test's type is:

- how much of the application it goes through
- how many real components take part
- whether there's access to a database, network, files, or external services
- what input is used to exercise the system

A question that helps a lot here is: **what behavior am I testing, and which real parts does this test depend on?**

### Unit tests

A unit test checks a small, specific part of the system, which can be a function, a method, a class, or a small object responsible for a rule.

A card number validator written as a simple Ruby class is a good example:

```ruby
class CardNumberValidator
  def self.valid?(card_number)
    # Luhn's algorithm
  end
end
```

And its test:

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

`described_class` represents the class named in the outermost `describe`, in this case `CardNumberValidator`.

See how simple this test is: it doesn't need to spin up a server, make an HTTP request, or save anything to the database. That's why it tends to be fast, and when it fails, it's easy to pinpoint the behavior that broke.

Also, a unit isn't necessarily "a class". Think of it more as a behavior boundary chosen for the test, which often maps to a class, but doesn't have to.

There are also two common ways to think about a unit test: **isolated** (or solitary) and **sociable**.

The difference is in how each one deals with the collaborators of the object under test, that is, the other objects it uses internally to do its own work.

An isolated test replaces those collaborators with _test doubles_. We all know that in movies, a stunt double steps in for the actor in a scene, but still delivers what the scene needs.

In programming it's the same idea: a double stands in for a real collaborator, controlled by the test, instead of running the actual logic behind it.

There are a few types of doubles, depending on what they do. The two most common are the **stub**, which just returns a predefined response when called, and the **mock**, where the test checks whether that collaborator was called the way it was expected to. We'll see examples of both throughout the post.

So, if `CardNumberValidator` depended on another object to, say, strip spaces from the number before validating it:

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

an isolated test would swap `CardNumberFormatter` for a stub, making sure only the validation logic is being exercised:

```ruby
formatter = instance_double(CardNumberFormatter)
allow(formatter).to receive(:strip).with("4111 1111 1111 1111").and_return("4111111111111111")

validator = CardNumberValidator.new(formatter: formatter)

expect(validator.valid?("4111 1111 1111 1111")).to be(true)
```

Notice the test doesn't know (and doesn't need to know) how `CardNumberFormatter` actually strips the spaces, it just defines what it expects to get back and checks whether the validator reacts to it correctly.

A sociable test, on the other hand, lets those real collaborators come into play. A validation declared with `validates` on a Rails model is a good example: the test calls `valid?` for real, letting the Active Record validation machinery run underneath, without swapping anything for a double. Even without touching the database, it's still treated as a unit test, just a sociable one.

In large applications, this is how most unit tests show up day to day, through validators, calculators, policies, and other small domain objects, each one concentrating a specific rule without depending on much else around it.

Rails, though, has so much built in by convention that it can sometimes be hard to tell where the unit ends and the integration begins.

For example, a validation declared on the model runs inside `valid?` or `save`, along with the whole Active Record machinery behind it. That's still a unit test, but the boundary is a lot less obvious than when the rule lives isolated in a simple Ruby class, like the `CardNumberValidator` we just saw.

In the end, the classification depends on what's actually executed, not on where the file lives, or on the metadata RSpec Rails uses to identify the test, like `type: :model`.

### Integration tests

An integration test checks whether different parts of the application, usually spread across different layers, like route, controller, model, and database, can correctly collaborate.

That already marks a big difference from a unit test. A unit test asks whether an isolated rule is correct. An integration test, on the other hand, asks whether several real pieces, together, produce the expected behavior, which usually involves more layers, and more points of failure, at the same time.

In Rails, request specs are the most common example:

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

Notice this test goes through the route, controller, parameters, `Order`, validations, Active Record, the database, and the JSON response. It's not just asking whether the card number is valid, the question is bigger: **do the parts needed to complete an order work together?**

There's a technical detail worth mentioning here.

Even when running `post "/orders/checkout"`, RSpec Rails normally sends that request to the application through Rack, inside the test process itself. It doesn't need to spin up a server on a port, or make a real network call. That's why request specs tend to be classified as integration tests for the application, not as end-to-end.

In a more minimalist framework, like Sinatra, the equivalent usually uses `Rack::Test` directly:

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

### End-to-end tests (E2E)

An end-to-end test goes through the system starting from an externally used interface, simulating a complete user flow. In a Rails web application, this is usually done with a system spec and Capybara:

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

This flow goes through the browser, page, form, JavaScript, server, controller, model, database, and the response shown back on the interface.

Capybara isn't the browser itself, it offers a language for interacting with web applications, and uses a driver underneath, for example:

- **Rack::Test**: fast, runs in-process, doesn't support JavaScript;
- **Selenium with Chrome**: uses a real or headless browser, supports JavaScript;
- **Cuprite**: controls headless Chrome.

A system spec with a real browser gets closer to a complete end-to-end test. A Capybara test with `Rack::Test`, on the other hand, simulates navigation, but doesn't use a real browser.

In APIs, that boundary is less agreed upon. Some people call a full endpoint test end-to-end, because it goes from the request all the way to the database. In common Rails vocabulary, though, an in-process request spec is usually treated as integration anyway. A stricter end-to-end test would boot the whole application and make a real HTTP request against an actual server.

End-to-end tests tend to be expensive to maintain and more prone to breaking for reasons that have nothing to do with the behavior being tested, like a layout change on the screen. That's why there tend to be a lot fewer of these than the other two types.

## How much of each type of test to write

Because of that cost, and the instability that comes with it, in practice we don't apply the three types of tests with the same intensity. And there's no fixed ratio between them, it varies from application to application, depending on the risk of each part of the system and how critical each user journey is.

A simple idea helps decide that: each level covers a different set of cases, without repeating what the other one already guarantees.

Let's go back to the card number validation:

The **validator's unit test** covers the algorithm's scenarios in detail: numbers that pass Luhn validation, invalid check digit, all matching digits, `nil`, values that are too short, values that are too long, with spaces or dashes.

The **checkout's integration test** just needs to confirm that rule is wired up to the endpoint, in other words, a POST with an invalid card number returns 422 and the right error message.

We don't need to repeat every invalid number already covered by the unit test, right?

The **end-to-end test**, if there's an interface, covers the main flow: the customer fills out the form and the order goes through. Running every algorithm case through the browser would make the suite slow and redundant without adding any extra confidence.

This distribution is usually described as a pyramid: lots of unit tests for rules with several combinations, request specs covering the important contracts of the endpoints, and few system specs for the most critical user journeys.

An example of how this usually gets organized in a Rails application, without being a fixed formula:

| Level | Examples |
|---|---|
| Unit | validators, calculators, policies, domain objects |
| Model | validations, model methods and rules |
| Integration | request specs, persistence, jobs with database access |
| End-to-end | system specs with Capybara for critical flows |

And it's worth remembering we don't need to test absolutely everything. Most applications don't even come close to 100% coverage, and that's fine. What actually deserves attention are the critical parts, the ones that, if they break, affect users drastically.

## Testability as a consequence of design

Remember I mentioned TDD influences design? That happens because writing the test first forces you to think about how that code is going to be called before thinking about how it's going to be implemented. That relationship works both ways: code that's hard to test is usually pointing at a design problem, not just a lack of tests.

### Explicit dependencies

A [dependency](/dependency-management) is anything a piece of code needs in order to do its own job, whether that's another object, an external service, or the database. It's explicit when it shows up visibly in the code itself, usually as a parameter or argument, and it's implicit when the code simply assumes that thing is going to be available, without declaring it anywhere.

The more implicit a dependency is, the harder it gets to test that piece of code in isolation, because the test first needs to figure out what needs to exist behind the scenes for that behavior to work.

More minimalist frameworks, like Sinatra, keep these dependencies clearly visible right in the route:

```ruby
post "/orders/checkout" do
  input = JSON.parse(request.body.read)

  halt 422 unless NameValidator.valid?(input["name"])
  halt 422 unless CardNumberValidator.valid?(input["card_number"])

  Order.create!(input)
end
```

Each dependency shows up explicitly, right there by name: the request, the name validator, the card validator, `Order`, the database.

In Rails, the same rule can just be declared on the model:

```ruby
validates :card_number, card_number: true
```

and get executed implicitly by `order.save`, which can trigger validations, custom validators, callbacks, and persistence in a single call. That cuts down on repetition, but it also hides part of the flow behind convention.

Testing that behavior requires knowing what Rails is doing underneath, not just what's written right there in front of you.

Neither approach is wrong, but they call for different kinds of tests to reach the same level of confidence: in Sinatra, testing each validator in isolation already makes it clear what's happening; in Rails, besides the isolated validator, it's worth adding an integration test confirming the convention is actually wiring the pieces together.

### Injected dependencies and _test doubles_

Imagine a use case that sends a confirmation email after an order is placed:

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

`CreateOrder` receives `email_sender` from the outside, instead of instantiating a concrete service internally. That's what we call dependency injection, and it's what makes this test possible without sending a real email:

```ruby
email_sender = instance_double(EmailSender)

allow(email_sender).to receive(:send_order_confirmation)

service = CreateOrder.new(email_sender: email_sender)
order = service.call(input)

expect(email_sender)
  .to have_received(:send_order_confirmation)
  .with(order)
```

`email_sender` here is the same kind of double we saw earlier, just working as a mock this time instead of a stub, since the check isn't about a return value, it's about the `send_order_confirmation` call actually happening.

This mock works well because `CreateOrder` only depends on one thing outside its main behavior, sending the email. If testing `CreateOrder` required mocking several unrelated dependencies just to reach a single expectation, that would be a sign the class has [too much responsibility](/single-responsibility), or that its [dependency management](/dependency-management) needs some adjustment.

Keep in mind that a test that's hard to write is almost always pointing at a design problem, not a lack of testing tools. That's the thread connecting everything we've seen so far.

TDD guides the construction process, FIRST guides the quality of each individual test, and testability works as feedback on the design itself: a dependency that's hard to isolate, spread-out responsibility, or excessive coupling all show up first in how hard a test is to write, long before they turn into a problem in production.

Within that process, unit, integration, and end-to-end tests represent different levels of confidence and isolation, each one answering a different question about the system.

In Rails, these boundaries look less clear, because the framework connects route, controller, model, validation, and persistence by convention. That's why it's always worth remembering: the folder name shows where a test is organized, but the behavior and dependencies it exercises are what actually show its real level.

I hope this helped make the topic a little clearer.

See you next time!
