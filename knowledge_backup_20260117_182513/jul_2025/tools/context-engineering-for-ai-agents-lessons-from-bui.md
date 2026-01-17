---
title: "Context Engineering for AI Agents: Lessons from Building Manus"
type: "tool"
date_added: "Thu Jul 24 17:55:11 +0000 2025"
source: "https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus"
via: "Twitter bookmark from @RLanceMartin"
url: "https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus"
---

# Context Engineering for AI Agents: Lessons from Building Manus

This post shares the local optima Manus arrived at through our own "SGD". If you&#x27;re building your own AI agent, we hope these principles help you converge faster.

## Links

- [GitHub Repository](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Original Tweet](https://x.com/RLanceMartin/status/1948441848978309358)

## Original Tweet

> Context Engineering

@dbreunig and I did a meetup on context engineering last night. Wanted to share slides (below) + a recap of some themes / discussion points.

1/ Context grows w/ agents. @ManusAI_HQ mentions typical task requires ~50 tool calls.
https://t.co/xWVm2UOXi5

2/ Performance drops as context grows. @kellyhongsn + @trychroma showed this very nicely.
https://t.co/7yrfiN2yDq

3/ @dbreunig highlights that new buzzwords ("context eng") identify common experiences. Many of us built agents this year and had challenges wrt managing context. @karpathy distilled this well back in May.
https://t.co/BW4VVgrAFC

4/ Many are sharing their experiences in blogs, etc but no common philosophy yet. "Pre-HTML era". Still, some common themes are emerging.

6/ Offload context. Use file system to offload context. @ManusAI_HQ writes https://t.co/wizAzxvnx3 at the start of a task and re-writes it during the task. They found that recitation of agent objective is helpful. Anthropic multi-agent writes research plan to file so it can be retrieved as needed and preserved. Manus offloads tok heavy tool observations. 
https://t.co/8NbUpV1h3z

7/ Reduce context. Summarize / prune messages / tool observations. Seen across many examples. Anthropic multi-agent summarizes the work of each sub agent. We use it w/ open deep research to prune tool feedback.
https://t.co/lhV0xI6lxU

8/ Retrieve context. RAG has been a major theme w/ LLM apps for several years. @_mohansolo (Windsurf) and Cursor team have shared interesting insights on what it takes to perform RAG w/ prod code agents. On Lex pod, @mntruell (Cursor) + team talk about Preempt to assemble retrievals into prompts. Clearly have been doing "context eng" since well before the term. 
https://t.co/xwYB1UorpR
https://t.co/NWIKD8E69x

9/ Isolate context. A lot of interest in using  multi-agent systems to isolate context. @barry_zyj + co (Anthropic) argue benefits, @walden_yan argues risks (it is hard to coordinate). Need to be careful, but benefit in cases where independent decisions made by each sub-agent won't case conflicts.  
https://t.co/ApBYfE53fQ

10/ Cache context. @ManusAI_HQ mentions caching agent message history (system prompt, tool desc, past messages). Big cost / latency saving, but still does not get around long-context problems.

Still very early in all of this ..

— @RLanceMartin (Lance Martin)