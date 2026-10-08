# Quiz Generation Prompt (for Phase 4)

Create 3 multiple-choice reading comprehension questions based on the article below.
Questions and choices may be in Japanese or simple English. Include answer index and a short explanation.

## Article:
{{ARTICLE}}

## Output format
Return ONLY valid JSON:
{"questions": [{"q": "...", "choices": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}]}
