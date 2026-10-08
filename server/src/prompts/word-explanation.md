# Word Explanation Prompt (for Phase 2)

Given a word and the sentence it appears in, explain it for a Japanese Eiken Grade 2 learner.

## Input
- word: {{WORD}}
- sentence: {{SENTENCE}}

## Rules
- Give the base form (lemma) as well.
- Part of speech: simple tags like noun / verb / adjective / adverb.
- Meaning in Japanese: short, prioritizing the meaning IN THIS context.
- Example sentence: one short English sentence, easy level, different from the input sentence.

## Output format
Return ONLY valid JSON:
{"word": "...", "lemma": "...", "pos": "noun", "meaningJa": "...", "exampleEn": "..."}
