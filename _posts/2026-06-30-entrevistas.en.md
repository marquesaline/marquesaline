---
layout: post
lang: en
lang-exclusive: ["en"]
page_id: post-processo-seletivo-dev
title: "Tech interviews: stages and tips based on my experience"
description: "What I learned going through interview processes for mid-level developer roles with Ruby on Rails, React, and JavaScript, at Brazilian and international companies."
permalink: "/tech-interview-process"
date: 2026-06-30
categories: ["Career"]
---

One of the questions I hear the most these days, as a programming teacher, is: "how do I get into tech?"

There's no exact answer to that question, but because of it, I decided to talk a bit about how my own experience with interviews has been.

**Before anything else**: what I'm bringing here is based on my personal experience, okay? The scope is pretty specific. I'm talking about mid-level developer roles (and senior in some cases), with a Ruby on Rails, React, and JavaScript stack, at Brazilian and, mainly, international companies.

Unfortunately, I don't have records of my junior interviews because, back then, I didn't document anything. So this post focuses on what I've been through since then.

And of course, every company organizes the process differently. The point here isn't to say your interview is going to look exactly like this, but to show some formats I've come across and things that can help with preparation.

That said, let's get into it.

## What do these processes usually look like?

Processes vary a lot. Some companies start with a recruiter, some put you straight into a conversation with the CTO. Some processes have five clearly defined stages, and some lay out a full roadmap and then change everything halfway through.

One thing that became pretty clear to me is that the name of a stage doesn't always describe what's going to happen. An "initial chat" can be purely informational, but it can also be the first, deeper evaluation of the process.

Because of that, before each interview, it's worth trying to understand two things: what stage it is, and who you're going to talk to.

## 1. Interview with a recruiter

Usually, the first stage of a hiring process is with someone from recruiting.

**Here's a tip**: before joining the call, it's worth searching LinkedIn for the name that shows up on the meeting invite. In some cases, this first conversation can actually be directly with someone from engineering, and knowing that ahead of time changes a lot about how it makes sense to prepare.

In general, what usually comes up in a conversation with a recruiter is:

- your career path
- the technologies you work with
- some relevant project or challenge
- your motivation for looking for a new role
- salary expectations

That last one came up in almost every process I've been through, so it's good to go in already knowing how you plan to answer. One thing I learned is that there's no problem asking if the company has a salary range, in a lot of cases they'll tell you. But when they don't define one, you'll have to name a number yourself.

If it's someone from recruiting, you probably won't need to go too deep into the technical side. What matters most tends to be explaining your experience clearly and connecting what you've already done with what the role is looking for.

Something that helped me a lot was rehearsing beforehand, especially for interviews in English. It gave me a lot more fluency when speaking and helped me stay focused on what I actually needed to show.

## 2. Interview with someone from engineering or leadership

In a lot of processes, it's normal and expected to have a conversation with someone from engineering, a CTO, or some other leader. This can happen right in the first stage or at another point in the process. It really depends on the company.

And this conversation usually ends up being a lot more technical than the stage's name makes it sound.

I've had a conversation that didn't involve any code or exercise, but where I needed to explain a project in depth: what the problem was, what decisions were made, what trade-offs existed, and what I'd do differently today.

I've also been asked things like:

- how I make technical decisions
- how I start working with an API I've never used
- how I handle finding a bug in production
- what I'd change in the system I currently work on
- how I'd defend a technical change to my manager
- how I act when a deadline gets tighter
- what I like and don't like about the stack I use

Among many others.

So it's worth showing up prepared to talk not just about what you did, but why you did it that way.

Something I learned is that it helps a lot to have two or three projects you really know well. You don't need to memorize a speech, but it's good to be able to explain the context, your part in it, the decisions, the outcome, and what you learned.

## 3. Culture fit / behavioral interview

Some processes have a stage focused on culture and behavior, more about understanding how you work and seeing if it fits the way the company works.

If the company has a page about its values, it's worth reading it before the interview. They'll probably be looking for behaviors aligned with those values in what you say.

So if the company values things like independence and async communication, for example, it doesn't look great if you show that you prefer daily check-ins or need a lot of validation from the team to make decisions.

And remember: at this stage, **the focus is behavioral**.

Once, I had an interview like this conducted by two engineers, and because they were engineers, I thought I needed to nail all the technical details.

I remember there was a question about how I deal with disagreement on a team, and I ended up talking about the system's architecture. That wasn't what they wanted to understand.

What mattered there was my attitude, how the situation got resolved, and what I learned. The technical part was just context.

The topics tend to circle around:

- communication and collaboration
- how you deal with disagreement and feedback
- autonomy and decision making
- mistakes and learning
- remote work and async communication

When we get nervous, the tendency is to stretch out answers and lose the thread. A structure that can help is thinking in terms of **situation, action, result, and learning**.

You don't have to be rigid about it, but keeping that sequence in mind avoids answers that start in one place and end up somewhere else entirely.

And this stage can also tell you a lot about the company.

During these conversations, I've been able to get a better sense of how often meetings happen, how much autonomy the team has, and how decisions tend to get made. While you're being evaluated, you're also observing.

## 4. Technical interview

This was, by far, the stage with the most variation across the processes I've been through. It can be live coding, conceptual questions, a business rule, a take home exercise, an architecture diagram, or a mix of several of these. I'll mostly talk about the formats I've actually experienced.

### Live coding

Live coding is the kind of interview where you need to code live, sharing your screen or using some online editor. It's shown up for me as:

- a logic exercise
- a business rule in JavaScript and Ruby
- a React implementation
- CRUD in Rails

You can't always know the format ahead of time, so it's worth preparing both for your own environment and for using a more limited online editor.

What tends to get evaluated isn't just whether you reach the right solution, but **how you interpret the problem, how you react when something goes wrong, and how you communicate while solving it**.

In one of the interviews I did, the exercise was to go through a string, record the position of each letter in a [hash](/ruby-hashes), and then sort the results.

I got to a working solution, but with a less elegant approach. Even so, I was able to move forward.

What stuck with me from that is that starting with something simple usually beats getting stuck waiting for the perfect solution to show up.

In another one, the exercise involved calculating how many weeks a certain amount of medication would last. The simple scenario was fine, but when the quantity didn't divide evenly into whole weeks, things got complicated. The problem wasn't the language, it was translating a math rule into code under pressure.

Both examples reminded me of something important: **it's always worth practicing logic**. Being able to solve a problem from scratch, without AI, without Stack Overflow, is exactly what live coding is going to demand from you.

AI is great for day to day work, but in live coding you won't have it by your side. If you're used to relying on it to think, it can be tough when it's not available. It's worth training without it every once in a while, just to keep that muscle active.

A tip that makes a difference: **talk out loud while you solve it**.

Explain what you understood about the problem, what path you plan to follow, what you're testing. Staying silent makes it harder to evaluate you, because the other person only sees the code and can't follow your reasoning.

It feels weird at first, but it's something worth practicing.

Oh, and some companies let you check documentation during the exercise. If that's the case, great, because in day to day work nobody remembers everything off the top of their head.

### Conceptual questions and architecture scenarios

Besides live coding, you might get questions about concepts and technical situations:

- Open-Closed Principle
- [separation of responsibilities](/single-responsibility)
- background jobs
- feature flags
- tests
- databases
- cache
- migrations

These questions aren't always the "explain concept X" type. Sometimes the person lays out a situation and wants to understand how you think through building a solution.

In one interview, I was asked how I'd handle a migration on a table that was constantly receiving data and couldn't be locked. The question wasn't just about knowing how to add a column, it was about thinking through the old data, the new records coming in during the migration, temporary compatibility, and the risk of downtime.

Organizing your answer in stages, before, during, and after the change, helps a lot in these cases. And it's fine to take a few seconds to organize your thoughts before you start talking.

### Architecture assessment

Some companies ask for an assessment more focused on architecture, usually as a system design exercise during the interview or as an artifact sent beforehand, like a diagram of a real project, to discuss live afterward.

Unlike live coding, the focus isn't on writing the implementation. **The idea is to understand how you organize a bigger problem and what points you consider before proposing a solution**.

When the company asks for an artifact beforehand, it's worth asking: is it a pass or fail step, or just a starting point for a conversation? What scale are they expecting to see? Do they want the project you know best, or the biggest system you've worked on?

Things like that will help you figure out how to put the artifact together.

## What the interview reveals about the company

Something I picked up on over time is that the interview isn't just a test for you to pass. It also tells you a lot about the company.

How the process is run, whether the criteria are clear or implicit, whether the stages are respected or change without notice, whether people show up prepared, all of that says a lot about how the company organizes itself and makes decisions day to day.

So while you're being evaluated, it's important to observe too. You don't need to leave every conversation only thinking about whether the company liked you.

It's also worth thinking about whether what you heard makes sense for the kind of place you'd like to work at. Especially since that's the company where you'll be spending a good chunk of your day.

Everything I brought up here is experience I still use to try to improve with every process. There's no formula, but there is practice, self assessment, and, over time, more clarity about what worked and what didn't work for you.

And that goes both ways: both to get better at interviewing and to understand if the place evaluating you is really the place where you want to be.

See you next time!
