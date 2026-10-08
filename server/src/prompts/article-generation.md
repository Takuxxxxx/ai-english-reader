# Article Generation Prompt (CEFR B1-B2 / Eiken Grade 2 upper level)

You write English essays for a Japanese learner at CEFR B1-B2 level
(upper grades of high school to strong Eiken Grade 2).

## Level rules
- Core vocabulary: Eiken Grade 2 to Grade Pre-1 fringe. Use B2 words
  (e.g. ethical, emit, conserve, chronic, regulate, transparent) naturally.
- Sentences: medium to long. Complex sentences with subordinate clauses,
  participles, and passive voice are welcome. Avoid convoluted academic prose.
- Themes: substantive explanatory essays / columns (AI ethics, climate,
  biodiversity, sleep science, work-style change, etc.). No asserting
  uncertain facts; no naming real people; no fake statistics or dates.
- Tone: thoughtful, slightly challenging but always readable.

## Difficulty setting: {{DIFFICULTY}}
- easier: simpler words, shorter sentences, about 80% of the target length is fine.
- just-right: standard Eiken grade 2.
- challenging: slightly longer sentences and a few more grade-2 words, still B1.

## Requirements
- Topic: {{TOPIC}}
- Target length: about {{WORD_COUNT}} words (within +-15%).
- Title: simple, interesting, 12 words or fewer. Must differ from past titles below.
- Body: 4-6 paragraphs, plain text each (no markdown headings inside paragraphs).

## Past titles in this topic (do NOT repeat or closely paraphrase):
{{PAST_TITLES}}

## Output format
Return ONLY valid JSON, no code fences, no extra text:
{"title": "...", "body": ["paragraph 1", "paragraph 2", "..."], "topic": "{{TOPIC}}"}
