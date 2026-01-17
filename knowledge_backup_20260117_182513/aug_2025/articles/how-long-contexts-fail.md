---
title: "How Long Contexts Fail"
type: "article"
date_added: "Fri Aug 01 09:17:29 +0000 2025"
source: "https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html"
via: "Twitter bookmark from @Hesamation"
url: "https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html"
---

# How Long Contexts Fail

## Summary

Taking care of your context is the key to building successful agents. Just because there’s a 1 million token context window doesn’t mean you should fill it.

## Links

- [Read Article](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html)
- [Original Tweet](https://x.com/Hesamation/status/1951210668515897855)

## Discovered Via

> Fuck prompt engineering. 
It doesn't make any fucking sense.

The context is what really deserves to be "engineered". Karpathy calls it the "delicate art and science of filling the context window with just the right information".

Here are 5 of the best resources i found on context engineering (sorted by order of reading):

1. "How long contexts fail" is a short blog post that explains the four main failure modes of LLM context. It explains WHY the optimization of context is more important than what you think.
https://t.co/51WJFfczzD

2. "the rise of context engineering" by @LangChainAI sets out the fundamental idea behind it. What it is, why it matters, what's the difference with prompt engineering, etc.
https://t.co/Xo9HxdYAQq

3. "Context Engineering for Agents" again by @LangChainAI covers step by step one of their articles on the subject. this one is more in depth, covering some of the main context operations such as Selection, Compression, Isolation, and how Langchain optimizes the context.
https://t.co/rLW1En1xL0

4. "Don’t Build Multi-Agents" by @cognition_labs takes a simple and step-by-step look at the challenge of coordinating two or three agents, it really dives under the hood of the context problem, sharing some of the best practical tips on managing the agent's context window. 
https://t.co/DoTwWty982

5. the final boss: "A Survey of Context Engineering for Large Language Models" is a 166-page survery paper that covers all of the most important research and innovations about RAG, Memory, and everything related to context. If you want a holistic view of what has been going on in the field, this is the way to go. 
https://t.co/P9807JKkkd

— @Hesamation (ℏεsam)