---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-redis-solid-cache
title: "Redis or Solid Cache: where to store your cache in Rails"
description: "Understand the difference between Redis and Solid Cache in Rails, why a cache stored in a database can still take load off the database, how each one uses your infrastructure, and which criteria help you choose between memory and disk."
permalink: "/redis-vs-solid-cache"
date: 2026-11-24
categories: ["Ruby on Rails", "Software Architecture"]
published: false
---

When I was studying caching, one question kept me stuck for a while. We use a cache precisely so we don't have to hit the database all the time, right? So why did Rails 8 start using, by default, a cache that stores its own entries... in a database?

It sounds contradictory, but understanding why this choice makes sense ended up helping me understand caching as a whole.

In the [post about caching in Rails](/rails-caching), we looked at the types of caching the framework offers. Here the question changes, and the focus is **where** that cache is stored. Let's compare Redis and Solid Cache, see how each one uses the infrastructure, and when one makes more sense than the other.

## Strategy and technology are different decisions

Before comparing the two, it's worth remembering that Redis and Solid Cache aren't caching strategies. They're technologies used to store the cache, what Rails calls a _cache store_.

In practice, this means that, regardless of the store you choose, `Rails.cache.fetch` stays the same. The bookstore's best-sellers ranking is still written the same way:

```ruby
CACHE_KEY = "books/best_seller_ids"
CACHE_TTL = 10.minutes
RANKING_SIZE = 10

Rails.cache.fetch(CACHE_KEY, expires_in: CACHE_TTL) do
  OrderItem.group(:book_id)
           .order(Arel.sql("SUM(quantity) DESC"))
           .limit(RANKING_SIZE)
           .sum(:quantity)
           .keys
end
```

What decides where that result ends up is the configuration, in `config/environments/production.rb`:

```ruby
config.cache_store = :redis_cache_store, { url: ENV["REDIS_URL"] }
```

or:

```ruby
config.cache_store = :solid_cache_store
```

The `fetch` flow is the same in both cases. It looks for the key and, if it doesn't find it, runs the block and stores the result. What changes is where and how that result is stored.

So these are two separate decisions:

- **strategy**: how the data will be read, stored, and invalidated (TTL, keys, invalidation);
- **technology**: where that data lives.

## Redis: caching in memory

Redis keeps information mainly in RAM, which usually results in very low latency. Here, latency is the time between the application asking for a value and getting the response.

Redis also offers persistence to disk, but its reads and writes still happen mainly in memory.

And which memory are we talking about?

When we say Redis stores the cache "in memory", it's easy to picture the memory of the server where Rails is running. But that's usually not the case.

In production, Redis usually runs as a separate service, with its own CPU and its own RAM. A simplified infrastructure would look like this:

| Service | What it does | Where it stores data |
| --- | --- | --- |
| Rails application | Receives requests and runs the code | In its own RAM, only what the application needs to run |
| PostgreSQL | Main database | Persistent data (books, orders, users) |
| Redis | Cache | In the Redis service's own RAM |

The Rails application connects to Redis over the network, the same way it connects to PostgreSQL. So when we talk about Redis memory, we mean the RAM of the Redis service, which needs to be sized and paid for separately.

### What happens when memory runs out?

RAM has a fixed size. When Redis reaches the configured limit (`maxmemory`), it needs to decide what to do with new writes.

That's defined by the eviction policy, `maxmemory-policy`. For a Redis used only as a cache, the Rails guide recommends one of the `allkeys` variants, which allow any key to be removed to free up space. `allkeys-lfu`, which removes the least frequently used keys, is suggested as a good default.

This helps explain why it's common to have a Redis dedicated to caching. If the same instance also stored data that can't disappear, like job queues, a policy that removes any key could delete that data to make room for the cache.

## Solid Cache: caching in a table

Redis handles caching with memory, but that comes with an extra service to maintain and a space limit that's expensive to increase. Solid Cache, which became the default cache store for new applications in Rails 8, goes the other way.

Instead of keeping the data set mainly in RAM, Solid Cache stores entries in a relational database, usually backed by SSD storage. It doesn't require a Redis service, although the database used by the cache can also live on separate infrastructure.

In practice, the cache becomes a table, `solid_cache_entries`. Each row is an entry, with the key and its associated value. When `Rails.cache.fetch` looks for the key `books/best_seller_ids`, for example, what happens under the hood is a lookup in that table.

### Same database or a separate one?

Solid Cache can use the application's database or a database dedicated only to the cache.

In a new Rails 8 application, the configuration already comes ready for a separate database. In `config/database.yml`, the production environment gets a `cache` entry:

```yaml
production:
  primary:
    <<: *default
    database: bookstore_production
  cache:
    <<: *default
    database: bookstore_production_cache
    migrations_paths: db/cache_migrate
```

And `config/cache.yml` points Solid Cache to it:

```yaml
production:
  database: cache
  <<: *default
```

An important detail is that "separate database" doesn't necessarily mean "separate server". `bookstore_production_cache` can be another database inside the same PostgreSQL instance, or a completely different instance. It depends on the infrastructure.

In other words, using Solid Cache doesn't force you to pay for another server. The whole point is to take advantage of infrastructure the application already knows how to operate, instead of maintaining a Redis service just for caching.

If no connection is configured, Solid Cache uses the application's own Active Record connection, meaning the main database. This has some consequences, which we'll see later on.

### And when space runs out?

Solid Cache also needs a limit, otherwise the table grows forever. It's configured in `config/cache.yml`, with options like:

- `max_age`: the maximum age of an entry (the default is two weeks);
- `max_size`: the maximum size of the cache;
- `max_entries`: the maximum number of entries.

Removal follows a FIFO (_first in, first out_) strategy, where the oldest entries leave first, no matter how many times they were read. That's different from Redis's `allkeys-lfu`, which takes usage into account.

This cleanup doesn't run at a fixed time. Solid Cache counts writes and, every so many writes, triggers a cleanup in the background. If nobody writes to the cache, nothing gets cleaned up, but nothing grows either.

## Comparing the two

Now that we know both, there's a question left. If Redis has lower latency, why not always use it?

The answer starts with available space. Both need a limit, but Redis's limit is RAM, which usually costs a lot more per gigabyte than the SSD used by Solid Cache.

For a small cache, this difference barely shows. But imagine an application that wants to keep 100 GB of data in cache.

With Redis, you'd need 100 GB of RAM available in the service, or accept that the eviction policy will discard entries often, which means more cache _misses_.

With Solid Cache, those 100 GB live on disk, which is much cheaper. Each read might be a bit slower, but the cache can be much bigger.

Solid Cache's own argument is that modern SSDs are fast enough that, for most caching cases, the time difference between disk and RAM is small. The idea is that, in many scenarios, it pays off to keep a large cache on disk instead of a small cache in memory.

| Criterion | Redis | Solid Cache |
| --- | --- | --- |
| Main storage | RAM of the Redis service | Tables in a relational database, usually on SSD |
| Latency | Usually lower | Usually higher |
| Cost per GB | Usually higher | Usually lower |
| Large caches | Can get expensive | Can be cheaper |
| Infrastructure | Usually a separate service | A database, which can be on the same server as PostgreSQL |
| Eviction when full | Configurable policy, like `allkeys-lfu` | FIFO, with `max_age` and `max_size` |
| Load on the relational database | Stays isolated in Redis | Can compete for resources if it shares the main database |

So the choice doesn't depend only on which one is faster. It depends on data volume, access frequency, budget, and the infrastructure we already have.

## The contradiction: a cache that queries a database

Now let's go back to the question from the beginning. If caching exists to avoid database queries, why use a cache that also queries a database?

The answer is that **the cost of fetching a ready result can be much lower than the cost of calculating it again.**

Think about the best-selling books ranking. To build the ranking, PostgreSQL has to go through the order items table, which can have millions of rows, group by book, add up the quantities, and sort:

```sql
SELECT book_id, SUM(quantity) AS total
FROM order_items
GROUP BY book_id
ORDER BY total DESC
LIMIT 10;
```

Depending on data volume and indexes, this query can be expensive. Let's say it takes 2 seconds.

With Solid Cache, the first request runs this query and stores the result in `solid_cache_entries`, under the key `books/best_seller_ids`. On the following requests, what the database does is look up one row by its key.

| | What the database does | Time (hypothetical) |
| --- | --- | --- |
| Without cache | Reads order items, groups, sums, and sorts | 2 s |
| With Solid Cache | Looks up a ready row by its key | 5 ms |

These times are made up, just to illustrate the order of magnitude. They're not Solid Cache measurements.

Notice that both cases hit a database. The difference isn't where the data lives, it's the **work** the database has to do to respond.

There's one more nuance here. The split between "Redis is memory" and "the database is disk" isn't that strict.

PostgreSQL also uses RAM, both to run queries and to keep frequently accessed data pages in memory. So not every Solid Cache read necessarily has to go all the way to the SSD.

The difference is in the design. Redis was built to be a predominantly in-memory store. Solid Cache uses a relational database as its storage mechanism, with everything that comes with it, like disk, transactions, and connections. That's why Redis usually has lower latency, and not because the database never uses memory.

## When Solid Cache isn't worth it

If the benefit comes from avoiding expensive work, the opposite conclusion also holds. When the work is already cheap, the cost of the cache can be bigger than the gain.

Imagine caching this:

```ruby
Book.find(book_id)
```

A primary key lookup, with an index, usually takes a few milliseconds. Storing that result in Solid Cache would mean swapping a simple query on the `books` table for another simple query on the cache table.

The gain can be small, and it would still bring all the costs of caching along with it, like expiration, invalidation, and the risk of showing stale data.

| Situation | Does Solid Cache make sense? |
| --- | --- |
| Simple lookup by ID, already fast | Maybe not |
| Query with expensive aggregations | It can make a lot of sense |
| Result of complex processing | It can make a lot of sense |
| Response from a slow external API | It can make a lot of sense |
| Data that changes all the time and is cheap to query | Maybe not |

This table actually applies to any cache, not only Solid Cache. With Redis, the cached lookup by ID could get faster, depending on the network, serialization, and load on the services, but the cost of keeping things consistent would still be there.

## What can go wrong

So far, we've compared the two by what they offer, like speed, cost, and space. But each one also brings its own risks, and they usually show up at two moments, when the cache shares resources with the application and when it stops responding.

### When the cache shares the database with the application

Back in the Solid Cache section, we saw that, if no connection is configured, it uses the application's main database. That works, and the cache can still help, because fetching the ready ranking is still cheaper than recalculating it.

The problem is that the cache's reads and writes start consuming CPU, memory, disk, and connections from the same database that serves the application. If that database is already at its limit, the cache becomes more work for exactly the thing we wanted to relieve.

There's also a less obvious effect. When it uses the same connection, the cache's operations become part of any open transaction. If the transaction is rolled back, the cache write is rolled back too.

That's why new Rails 8 applications already come with a separate database for the cache. And if the load grows, you can move that database to another instance. What helps you decide is measuring cache read latency, database load, and hit rate.

### When the cache store stops responding

In the [post about caching in Rails](/rails-caching), we looked at the scenario where Redis goes down and all the load goes straight to the database. Now we can better understand why that happens.

According to the Rails guide, `:redis_cache_store` doesn't raise exceptions when Redis fails. Reads and writes simply return `nil`, as if the key didn't exist. For `Rails.cache.fetch`, that's a cache miss, so it runs the block and goes to the database.

This keeps a Redis failure from taking down the request right away, but it can move all the load to PostgreSQL. To at least know that this is happening, the store accepts an `error_handler`, which is called on every error and can notify a monitoring service.

With Solid Cache, the risk goes back to the previous point. If it's on the same server as the main database, a problem on that server takes down both the cache and the data at the same time. Putting the cache on another instance also separates the failures.

## For later review

The idea that ties this whole post together is that **the benefit of caching doesn't necessarily come from storing data somewhere faster, but from avoiding an operation that's more expensive than retrieving its result.**

That sentence explains both Redis and Solid Cache. Redis prioritizes low latency by using memory. Solid Cache prioritizes capacity and cost, avoiding recalculation even though it stores the result in a database.

When it's time to choose, a few questions help:

- **How big is the cache?** If it fits comfortably in memory and your infrastructure already runs Redis, Redis tends to offer lower latency. If it's large, Solid Cache's disk tends to be cheaper.
- **Is cache latency critical?** If every millisecond matters, Redis has the advantage.
- **What infrastructure do we already have?** Running Redis means one more service to monitor, update, and pay for. Solid Cache can take advantage of your existing database infrastructure.
- **Can the main database handle more load?** If not, consider a separate database for Solid Cache, or evaluate whether Redis makes more sense.
- **Is the operation being cached really expensive?** If not, maybe you don't need either of them.

To go deeper:

- [Caching with Rails](https://guides.rubyonrails.org/caching_with_rails.html), the official guide, with the configuration for both cache stores;
- the [Solid Cache README](https://github.com/rails/solid_cache), which explains the configuration, FIFO eviction, and the reasoning behind using disk;
- the Redis documentation on [eviction policies](https://redis.io/docs/latest/develop/reference/eviction/).

I hope this helped make the topic a little clearer.

See you next time!
