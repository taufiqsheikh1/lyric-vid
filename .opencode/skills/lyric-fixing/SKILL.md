---
name: lyric-fixing
description: Fix STT transcription errors in lyrics by comparing against real lyrics found via web search, preserving word-level timestamps
---

## How to Fix STT Lyrics Errors

You have:
1. An STT transcript with word-level timestamps: `[{text, start, end, type, logprob}]`
2. The correct lyrics found from web search (plain text)

### Algorithm: Word-Level Alignment with Timestamp Preservation

1. **Extract STT word sequence**: Filter to `type: "word"` entries. Get the array of `text` values.

2. **Normalize both texts**: Lowercase, remove punctuation, collapse whitespace.

3. **Find correct lyrics**: Use webfetch to search Genius, AZLyrics, or a general search for `"<song title> lyrics <artist>"`. Extract the plain text lyrics.

4. **Sequence alignment**: Use Levenshtein distance or fuzzy matching to align STT words against real lyrics words. For each STT word, find its best matching real lyric word (within a 5-word sliding window).

5. **Preserve timestamps**: 
   - Words that match keep their STT timestamps.
   - Extra words in real lyrics (missing from STT) get interpolated timestamps between the preceding and following matched words.
   - STT words that don't match anything are discarded (likely hallucinations).

6. **Handle missing words**: If real lyrics have words the STT missed entirely:
   - If within a matched segment: distribute time evenly among the inserted words.
   - At the beginning: use a small lead-in time before the first matched word.
   - At the end: extend proportionally from the last matched word.

7. **Generate a Node.js script** to perform the alignment programmatically. Write it to `/tmp/fix-lyrics.js` and run it with `node /tmp/fix-lyrics.js <sttFile> <realLyricsText> <outputFile>`.

### The script should:
```javascript
// 1. Read STT JSON
// 2. Parse real lyrics text into words
// 3. Align using sliding window fuzzy match
// 4. Output fixed JSON with preserved timestamps
```

### Output format (same as input):
```json
[
  {"text": "Hello", "start": 0.5, "end": 0.8, "type": "word"},
  {"text": "world", "start": 0.9, "end": 1.3, "type": "word"}
]
```

### Important
- Never modify timestamps of matched words.
- If you cannot find the exact lyrics, flag it to the user rather than using bad data.
- Word count must closely match between STT and real lyrics (±20% tolerance). If significantly off, the alignment is likely wrong.
