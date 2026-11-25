---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-cache-rails
title: "Caching in Rails: types, TTL, invalidation, and trade-offs"
description: "Understand how the different types of caching in Rails work and how TTL, keys, invalidation, and failures affect performance and consistency."
permalink: "/rails-caching"
date: 2026-11-22
categories: ["Ruby on Rails", "Software Architecture"]
published: false
---

Caching is one of those topics everyone has heard about. We know it exists, we use it every day, we add a `Rails.cache.fetch` here, a `cache` in a view there, and move on.

But I feel like we almost never stop to really talk about it. What exactly is being stored? For how long? What happens when the data changes, or when the cache itself goes down?

To start with something concrete, let's imagine an online bookstore whose home page shows the ten best-selling books of the week. To build that ranking, the application adds up every order item, groups them by book, and sorts the result. On every request.

The query isn't wrong, that's how it has to be done, but the result barely changes from one minute to the next. Recalculating everything on every visit can be wasteful, and that's exactly the kind of problem caching solves.

But caching isn't free. It removes one cost, but it ends up creating others, like stale data, invalidation, new infrastructure, and failures that didn't exist before.

That's why I want to look not only at the types of caching in Rails, but also at the decisions that come with them, like TTL, invalidation, consistency, and failures.

## What is caching?

Caching is a strategy for storing and reusing information to avoid repeating expensive operations.

It can be the result of a query, a calculation, a response from an external API, or a piece of HTML that was already rendered.

Two terms come up all the time when we talk about this:

- **cache hit**: the application looks for some data in the cache and finds it. It doesn't need to go to the original source, which is usually slower, like the database or an external service.
- **cache miss**: the application looks and doesn't find it, either because the data was never stored or because it expired. Then it has to fetch it from the original source.

But what happens after a miss? The application fetches the data from the source and, besides returning it, stores a copy in the cache. That way, the next read of the same data becomes a _hit_.

This flow of checking the cache first and, on a _miss_, fetching from the source and filling the cache is called **cache-aside**. The cache sits "beside" the application, and the application is the one that decides when to read, when to go to the source, and when to write.

It's also called _lazy loading_, because data is only loaded into the cache when someone asks for it. If nobody asks, nothing gets calculated.
This is the most common pattern in Rails applications, and it's exactly what `Rails.cache.fetch` does.

## Before caching: where's the bottleneck?

We understand what caching is, but why do we use it?

An application can get slow for many reasons. It could be N+1 queries, a missing index, a badly written query, heavy processing in Ruby, a slow external call, or expensive rendering.

Putting a cache on top of any of these might make the page faster, but it can also hide the cause without actually fixing the problem. After all, a query without an index is still a query without an index, it just runs less often now.

So, before adding a cache, it's worth measuring and answering a few questions:

- Is the operation repeated many times? Is it really expensive?
- Can the result be reused across requests or across users?
- How much delay in updates does the business accept?
- What's the source of truth, and what information can never be wrong at the moment of a critical operation?
- What happens if the cache expires or becomes unavailable?
- What gain was measured? Latency, number of queries, CPU usage, hit rate?

In the bookstore example, if the business rules tolerate the ranking being a few minutes behind, caching can make sense. But if the query is cheap and traffic is low, the complexity might not be worth it.

So keep in mind that caching shouldn't come in just because there's already a Redis available.

## Types of caching in Rails

Rails offers caching mechanisms at different layers of the application. And maybe, like me, you're not always sure when to use each one. The question that helps me choose between them is **what exactly is expensive here?** The HTML, the calculation, the repeated query, or the whole response?

### Fragment caching

_Fragment caching_ stores parts of a page that don't change often. It's a straightforward option when the cost is in rendering parts of the page.

In the bookstore, imagine the book listing, where each card shows the cover, title, author, price, and average rating:

```erb
<% @books.each do |book| %>
  <% cache book do %>
    <%= render partial: "books/book", locals: { book: book } %>
  <% end %>
<% end %>
```

The `cache` helper builds a key from the book and from a digest of the template. On the first render, the card's HTML is stored. On the next ones, Rails reads the ready fragment instead of rendering the partial again.

And what happens when the book changes? Active Record uses the record's `updated_at` as its version. When the book is updated, the version changes and the old fragment is no longer used.

The template digest is also part of the key. So if someone changes the partial's HTML, Rails treats it as a new entry, with no need to clear anything by hand.

For collections, there's a more direct way:

```erb
<%= render partial: "books/book", collection: @books, cached: true %>
```

With `cached: true`, Rails fetches all the fragments in the collection with a single cache read (a _multi-fetch_), instead of one read per book.

### Russian doll caching

_Russian doll caching_ is a technique for nesting fragments inside each other. It isn't a separate kind of storage, it's more like fragment caching organized in levels.

Imagine a page that lists authors and, inside each author, their books:

```erb
<% @authors.each do |author| %>
  <% cache author do %>
    <h2><%= author.name %></h2>

    <% author.books.each do |book| %>
      <% cache book do %>
        <%= render partial: "books/book", locals: { book: book } %>
      <% end %>
    <% end %>
  <% end %>
<% end %>
```

Each level is stored separately. The idea is that, if a book changes, only its fragment needs to be rendered again, and the other books by that author keep coming from the cache.

But there's a trap here. To understand it, you first need to know how the `cache` helper decides what to do:

- if it finds the fragment in the cache, it uses the stored HTML and **doesn't run anything between `do` and `end`**;
- if it doesn't find it, then it runs that code, generates the HTML, and stores it.

Now imagine the author Ana Souza has two books on the page, and one of them, _Winter Nights_, costs $50. After the first render, the cache looks roughly like this (simplified):

```text
fragment for the book "Winter Nights":
  <div>Winter Nights, $50</div>

fragment for the book "Summer Mornings":
  <div>Summer Mornings, $35</div>

fragment for the author Ana:
  <h2>Ana Souza</h2>
  <div>Winter Nights, $50</div>
  <div>Summer Mornings, $35</div>
```

Notice that Ana's fragment has a copy of the books' HTML. It's ready-made text, the same thing that goes to the page. If a book's fragment changes later, that copy doesn't change with it.

Now the price of _Winter Nights_ changes to $40. The book's `updated_at` changes, so the book's version changes. But Ana's `updated_at` stays the same, because nobody changed Ana.

On the next request, the first `cache` Rails runs into in the code is `cache author`. It looks for Ana's fragment and finds it, because her version didn't change. So it uses that stored HTML, with "$50" inside, and doesn't run the code in the block.

And `cache book` lives right inside that block. Since the block doesn't run, Rails never gets to notice the book changed. The page keeps showing $50.

The solution is to use `touch: true` on the association:

```ruby
class Book < ApplicationRecord
  belongs_to :author, touch: true
end
```

With that, every time a book's `updated_at` changes, the author's changes too. The outer fragment's version changes with it, and Rails renders the author again, reusing from the cache the books that didn't change.

This is the most confusing part of _Russian doll_ caching, and the one we need to keep in mind. **Invalidating an inner fragment doesn't propagate to the outer fragment on its own.** The dependency has to be explicit.

### Low-level caching

But sometimes the cost isn't in the HTML, it's in a calculation, a heavy query, or a response from an external API.

That's what _low-level caching_ is for. It stores any serializable value and lets us reuse it across requests.

In Rails, the most common way to do it is `Rails.cache.fetch`. Going back to the best-sellers ranking:

```ruby
class BestSellers
  CACHE_KEY = "books/best_seller_ids"
  CACHE_TTL = 10.minutes
  RANKING_SIZE = 10

  def self.call
    best_seller_ids = ids
    books_by_id = Book.where(id: best_seller_ids).index_by(&:id)
    best_seller_ids.filter_map { |id| books_by_id[id] }
  end

  def self.ids
    Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
      OrderItem.group(:book_id)
               .order(Arel.sql("SUM(quantity) DESC"))
               .limit(RANKING_SIZE)
               .sum(:quantity)
               .keys
    end
  end
end
```

`fetch` works exactly like the _cache-aside_ flow we saw at the beginning. If the key exists in the cache (_hit_), the block doesn't even run. If it doesn't (_miss_), Rails runs the block, stores the result, and returns it.

The cache only stores the books' IDs, not the `Book` objects, and that's on purpose, because the Rails documentation recommends avoiding storing lists of Active Record objects in the cache.

The reason is that a stored object is a snapshot of the record at that moment. The book might change its price or be removed, and in development this also behaves badly with code reloading. By storing only the IDs, the expensive part (the aggregation) stays in the cache, and the primary key lookup keeps bringing current data.

That's why `call` fetches the books with `where`, not `find`. `Book.find(ids)` would raise an error if any book in the ranking had been removed after the IDs were stored. `where` simply ignores the ID that no longer exists.

Since `where` doesn't guarantee order, `index_by` organizes the books by ID and `filter_map` rebuilds the list in ranking order, skipping the ones that are gone.

Notice the key too, `"books/best_seller_ids"`. It's what identifies the value in the cache, so it needs to tell apart everything that makes the result change.

The ranking is the same for everyone, so a fixed key works. But when the result depends on who's accessing it, the key has to say so:

```ruby
# Wrong: every user would see the same recommendations
Rails.cache.fetch("recommendations") { Recommendations.for(current_user) }

# Right: the key includes who the result belongs to
Rails.cache.fetch(["recommendations", current_user]) { Recommendations.for(current_user) }
```

In the first case, the first person to visit defines everyone's recommendations. With data like carts or permissions, this stops being a visual bug and becomes a data leak.

But there's a trade-off, since during those ten minutes the ranking might be out of date. We'll come back to this when we talk about TTL.

### SQL query caching

The _query_ cache is an automatic Active Record mechanism. If the same SQL query, with the same parameters, runs more than once during a request, the second result comes from the cache.

It doesn't need Redis or Solid Cache. The cache is created at the start of the action and thrown away at the end.

```ruby
class BooksController < ApplicationController
  def show
    title = Book.find(params[:id]).title
    price = Book.find(params[:id]).price

    render json: { title: title, price: price }
  end
end
```

The second call to `Book.find` shows up in the log as `CACHE Book Load`, without hitting the database.

Where this kind of cache really helps is when different parts of the code, which don't know about each other, end up running the same query in the same request.

But it has two important limitations.

First, it only lives for the duration of the request. It's not meant for keeping a result around for several minutes, like `Rails.cache.fetch`.

Second, it stores the data that came from the database, not the `Book` object. In the example, each `Book.find` still creates a new `Book` object from that data. The database is spared, but Ruby still has to build the object every time.

So fetching the book once and keeping it in a variable is still better than relying on the query cache.

### HTTP caching

_HTTP caching_ works at a different layer, the HTTP protocol. It uses headers like `ETag`, `Last-Modified`, and `Cache-Control` so the browser (and intermediate caches, like a CDN) can reuse a response or ask the server whether it changed.

Think of a reader who opens the page of a book again, and the book hasn't changed since the last visit:

```ruby
class BooksController < ApplicationController
  def show
    @book = Book.find(params[:id])
    fresh_when @book
  end
end
```

`fresh_when` sets the `ETag` and `Last-Modified` based on the book. On the next visit, the browser sends these values in a conditional request. If nothing changed, Rails responds with `304 Not Modified`, with no body, and the browser uses the copy it already has.

A detail that often goes unnoticed is that **a 304 doesn't mean the database wasn't queried.** `Book.find` ran anyway, because Rails needs the book to calculate the `ETag`. What you save is the rendering and the transfer of the response.

By default, these responses are marked as private, meaning only the user's own browser can store them. There's a `public: true` option to let proxies and CDNs store them too.

You need to be careful here. A page that shows something specific to the user, like the items in the cart or a "you already bought this book" message, should never be marked as public. Otherwise, a shared cache could serve one person's page to someone else.

The action also doesn't call `render`. If nothing changed, Rails responds with the 304. If something changed, it goes on with the default view rendering, like any other action.

If you want to review how a controller builds its response, with `render`, `redirect_to`, and `fresh_when` itself, there's a post about [controllers in Rails](/controllers-rails) (in Portuguese).

### Page caching and action caching (legacy)

These two show up in older material, so it's worth knowing what they are, even though they're not the recommendation for new projects. Both were extracted from Rails and now depend on separate gems (`actionpack-page_caching` and `actionpack-action_caching`).

**Page caching** saves the HTML generated by the action as a file in the `public/` folder. From then on, the web server serves that file directly, without going through Rails, as if it were a static page.

It's very fast, but it only works for pages that are the same for every visitor, and the file has to be deleted whenever the content changes.

**Action caching** stores the action's response, but still lets the controller's filters run first, like authentication. The risk is the key not taking the user or their permissions into account, and someone getting content that was built for someone else.

For current Rails applications, it makes more sense to look at HTTP caching, CDNs, and fragment caching first.

## How these types relate to each other

Now that we understand the types, let's look more closely at how they relate, because the similar names make everything look like one thing, but each mechanism stores something different:

| Mechanism | What it stores | For how long |
| --- | --- | --- |
| Fragment caching | Pieces of rendered HTML | Until the version or template changes (or it expires) |
| Russian doll | Nested fragments | Same as fragment caching, with dependencies via `touch` |
| Low-level caching | Any serializable value | Until the TTL or an invalidation |
| Query cache | Result of repeated SQL | Only during the request |
| HTTP caching | The whole response, on the client or a proxy | According to the HTTP headers |

The table shows what each mechanism stores. But for fragment caching and low-level caching, we still need to answer **where** this data is stored and **until when** it's valid.

That's what we'll look at next, starting with where the cache lives.

## Where the cache lives

_Fragment caching_ and _low-level caching_ need a place to store data, the _cache store_, configured in `config/environments/production.rb`.

Two especially relevant options in the Rails ecosystem today are **Redis**, which keeps the cache in memory, and **Solid Cache**, which keeps it in a database table and has been the default for new applications since Rails 8. They're not another type of cache, they're the place where these types store what they need.

The application code doesn't change between the two, and `Rails.cache.fetch` works the same way. What changes is cost, latency, capacity, and infrastructure, and that deserves its own conversation.

If you want to go through that comparison calmly, including why a cache stored in a database can still take load off the database, there's a post about [Redis and Solid Cache](/redis-vs-solid-cache).

## TTL: how long is an entry valid?

TTL (_Time To Live_) is the period during which a cache entry can be reused. In Rails, it's `expires_in`.

A common confusion is thinking TTL is a schedule. **It doesn't refresh the value at every interval.** It only says when the entry stops being valid.

Think about the ranking with a 10-minute TTL:

- at 2:00 PM, someone visits the page, gets a _miss_, and the ranking is calculated and stored;
- at 2:02 PM, several new purchases happen;
- at 2:05 PM, the ranking still shows the 2:00 PM result;
- at 2:10 PM, the entry expires;
- if nobody visits the page until 2:30 PM, nothing is recalculated in between. The recalculation happens on the first read after expiration.

This is a direct consequence of _cache-aside_, since the cache is only filled when someone asks.

And if the business accepts a ten-minute delay in the ranking, showing the 2:00 PM result at 2:05 PM isn't a bug. It's a decision.

### How to choose the TTL?

A shorter TTL reduces how long data can be stale, but it increases _misses_, recalculations, and load on the source. A longer TTL makes better use of the cache, but increases the risk of showing old information.

And the longest TTL the business tolerates isn't necessarily the best one. The choice also depends on:

- **query cost**: the more expensive it is, the more it's worth reusing the result;
- **access frequency**: data accessed only a few times an hour barely benefits from the cache, even with a long TTL;
- **user experience**: even if 15 minutes is acceptable, it might be better to show something more recent.

In the end, the ideal is to talk with the team to understand how long it's acceptable for the information to be out of date. It all depends on which data we're talking about and on the application's business rules.

## Invalidation: when time isn't enough

TTL handles validity based on time, but sometimes the data needs to reflect a change before that. If the bookstore changes a book's price, it can't wait for the TTL to stop showing the old price.

Invalidating the cache means preventing an old entry from still being used when the source changes. Besides TTL, there are two strategies that help react to changes before expiration, which are explicit invalidation and versioned keys.

### Explicit invalidation

The application removes the entry when a relevant event happens:

```ruby
book.update!(price: new_price)
Rails.cache.delete("book:#{book.id}:price")
```

| TTL | Explicit invalidation |
| --- | --- |
| The entry expires after some time | The entry is removed when an event happens |
| Doesn't need to know about every change in the source | Needs to know which changes affect which entries |
| Accepts old data during the interval | Reduces the time data stays stale |
| Simpler to maintain | Requires coordination with every place that changes the data |

The example looks simple, but it hides a problem. Updating the database and deleting the cache entry are two separate operations, and a lot can happen between them.

Imagine two requests at the same time. Request A gets a _miss_ and reads the old price from the database. Before it writes to the cache, request B updates the price and deletes the entry. Then A finishes and writes the old price to the cache. Now the stale value stays there until the next TTL or the next invalidation.

That's why it's common to combine explicit invalidation with a TTL, which works as a safety net.

Another thing to watch out for is that explicit invalidation on data that changes all the time can wipe out the benefit of caching. If every purchase invalidated the best-sellers ranking, it would be recalculated on almost every request, so it doesn't make sense.

### Versioned keys

Instead of deleting the old entry, we start using a different key when the data changes. That's what Rails does with Active Record records, and it's the same mechanism we saw in _fragment caching_:

```ruby
BOOK_SUMMARY_TTL = 1.hour

Rails.cache.fetch([book, "summary"], expires_in: BOOK_SUMMARY_TTL) do
  BookSummary.call(book)
end
```

When the book is updated, `updated_at` changes, the version changes, and the old entry simply isn't found anymore. Nobody has to remember to delete anything.

Under the hood, Rails uses two methods from the record. `cache_key` identifies the book (something like `books/1`), and `cache_version` comes from `updated_at`. And `cache_key_with_version` joins both into a single string.

The same care we saw in _Russian doll_ caching applies here. If the summary also depends on the book's reviews, and a new review doesn't change the book's `updated_at`, the version doesn't change. Dependencies need to be reflected in the key or in `touch`.

### Granularity: the size of each entry

In the invalidation examples so far, each change affected a single entry. But that depends on a decision made earlier, when we choose what goes inside each cache entry.

That decision is called **cache granularity**. It defines whether each entry holds a small, specific piece of information, or a larger set of information at once.

Think about the bookstore's featured authors page, which shows the profiles of three authors. There are two ways to store it.

The first is to store the whole list in a single entry. That's **coarse granularity**:

```ruby
FEATURED_AUTHORS_TTL = 1.hour

Rails.cache.fetch("authors:featured", expires_in: FEATURED_AUTHORS_TTL) do
  featured_authors.map { |author| AuthorProfile.call(author) }
end
```

The whole page comes from a single cache read. But if one of the authors updates their bio, the entry goes stale and the only way out is to invalidate the whole list. The other two profiles, which were still correct, get recalculated along with it.

The second is to give each author their own entry. That's **fine granularity**:

```ruby
AUTHOR_PROFILE_TTL = 1.hour

def cached_profile(author)
  Rails.cache.fetch("author:#{author.id}:profile", expires_in: AUTHOR_PROFILE_TTL) do
    AuthorProfile.call(author)
  end
end
```

Now, when an author changes their bio, we can delete only their entry:

```ruby
author.update!(bio: new_bio)
Rails.cache.delete("author:#{author.id}:profile")
```

The other profiles keep coming from the cache, with no recalculation at all. That's **granular invalidation**, and it's only possible because each author has their own key.

The cost is that building the page now takes one cache read per author, plus more work to put the result together. With many items, this starts to add up, and that's the case Rails has `Rails.cache.fetch_multi` for, which fetches several keys at once.

So the choice depends on how the data changes. If items change separately and often, fine granularity avoids unnecessary recalculations. If the set usually changes as a whole, or almost never changes, coarse granularity is simpler.

Russian doll caching, which we saw earlier, is a way to get a bit of both. Each book has its own fragment (fine), and the author groups all of them (coarse). When a book changes, the author's fragment is rebuilt, but the other books come ready from the cache.

## Consistency: the cache is a copy

All of this leads to an idea worth keeping. **The cache is a copy derived from the source of truth.** And the source can change before the copy is refreshed.

When that happens, we have **stale data**. The database already records 320 sales of a book, but the cache still holds a ranking calculated when there were 300.

Accepting this for a while is what's called **eventual consistency**. In this case, the system tolerates temporary divergence, as long as there's a mechanism (TTL, invalidation, versioning) that makes the copy converge to the current value. It's not a guarantee of immediate updates.

How much divergence is acceptable depends on how critical the data is. A ranking can be a few minutes behind without any harm. The stock count for the last copy of a book, at the moment of purchase, can't.

In this case, the storefront can use the cache to show "in stock", but checkout needs to validate current availability in the database:

```ruby
Book.transaction do
  book = Book.lock.find(book_id)
  raise OutOfStockError if book.stock.zero?

  book.decrement!(:stock)
end
```

Invalidating the cache wouldn't solve this problem on its own. Invalidation doesn't update a page the customer already has open, and it doesn't stop two people from buying the last copy at the same time. What protects the critical rule is the transaction with a lock in the database, not the cache.

Concurrency and transactions deserve a post of their own, so here I'll keep just the central idea. Caching is for reads that can tolerate delay, and the critical rule stays in the source of truth.

## When the cache fails

A well-configured cache changes how the application behaves under load. And that means that, when it fails, the behavior changes again, sometimes abruptly.

### What if Redis goes down?

Let's consider an illustrative scenario, with 3,000 requests per minute on an endpoint and a 90% cache hit rate. Only 300 of them actually reach the database.

If Redis becomes unavailable and all those requests start querying PostgreSQL, the load can go from 300 to 3,000 queries per minute. Ten times more, all at once.

It's a simplification, because the real impact depends on the routes and on how the application handles the error. But it shows that the database may have been sized counting on the cache and might not handle the same load without it.

There are a few ways to deal with this:

**Fallback** means fetching data from the original source when the cache fails. It helps availability, but it's exactly what causes the overload in the example. And you can't assume this fallback always happens the same way, because the behavior depends on the cache store, the configuration, and the application's error handling.

**Graceful degradation** means temporarily turning off or simplifying non-essential features to preserve the essential ones. In the bookstore, that would mean stopping the best-sellers calculation while the database is under pressure, while keeping search and checkout working.

A detail that makes a difference is that hiding the ranking only in the interface isn't enough if the backend keeps running the expensive query.

A **circuit breaker** is a mechanism that, after several consecutive failures of a dependency, stops trying for a while and then tries again in a controlled way. It avoids insisting on a Redis that's down, but it doesn't solve the database overload on its own.

### Cache stampede

A cache stampede happens when many requests find the same expired entry at the same time, and all of them try to recalculate it together.

Imagine the home page ranking expiring at peak time. Instead of one request recalculating and the others benefiting, dozens run the same heavy aggregation on the database at the same time.

`Rails.cache.fetch` has an option for this:

```ruby
RACE_CONDITION_TTL = 10.seconds

Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL, race_condition_ttl: RACE_CONDITION_TTL) do
  # expensive ranking query
end
```

With `race_condition_ttl`, when the entry expires, the first request that finds the expired entry starts recalculating the value. Meanwhile, the others keep getting the old value for a short period, instead of all going to the database.

Other possible strategies are coordinating the recalculation with a lock (only one process recalculates, the others wait), spreading out the expiration of similar entries so they don't all expire at the same moment, and serving old data for longer when the business allows it.

## For later review

The reasoning for deciding about caching can be summarized like this:

1. **Investigate and measure** the bottleneck before choosing a cache.
2. **Choose what to store**: rendered HTML (fragment), the result of an operation (low-level), a query repeated within the request (query cache), or the HTTP response.
3. **Define how much staleness is acceptable** together with the business.
4. **Choose TTL, key, and invalidation** consistent with the cost of the read and how often the data changes.
5. **Protect critical operations** in the source of truth, not only with cache invalidation.
6. **Plan for failures and spikes**: the cache store going down, stampedes, and the database's limit without the cache.
7. **Measure afterwards**: hit rate, latency, and load on the source, to confirm the gain is real.

And a few scenarios for quick reference:

| Scenario | Plausible starting strategy | Main concern |
| --- | --- | --- |
| JSON endpoint with an expensive ranking | Low-level caching with TTL | Tolerable delay and cost of recalculating |
| Partial with HTML that's expensive to render | Fragment caching | Dependencies that don't change the record's version |
| Nested list (author with books) | Russian doll with `touch: true` | Propagating the child's change to the parent |
| Public page of a book | HTTP caching with `fresh_when` | Never marking a personalized response as public |
| Stock at checkout | No cache in the validation, only in the storefront | Transaction and concurrency in the database |
| Cache store unavailable | Controlled fallback and graceful degradation | Cascading effect on the database |

In the end, caching trades part of the processing and read cost for storage, operational complexity, and consistency challenges. It's worth it when that trade is a conscious one, meaning we know what we're storing, for how long, and what happens when the copy and the source diverge.

To go deeper:

- [Caching with Rails](https://guides.rubyonrails.org/caching_with_rails.html), the official guide, which covers the current caching mechanisms in this post and the configuration of cache stores;
- [Active Record Query Interface](https://guides.rubyonrails.org/active_record_querying.html), to better understand the queries we're trying to avoid repeating.

I hope this helped make the topic a little clearer.

See you next time!
