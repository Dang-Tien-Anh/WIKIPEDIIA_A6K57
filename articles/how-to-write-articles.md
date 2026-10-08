---
title: How to write articles
category: Help
summary: How to add, edit and link pages in this wiki.
---
Every article is one Markdown file in the `articles` folder.

## Adding an article

1. Create a file such as `articles/solar-system.md`. Use lowercase words joined by hyphens.
2. Start it with a short header:

```
---
title: Solar system
category: Science
summary: One line shown in lists and search results.
---
```

3. Write the article below the header using Markdown.
4. Commit the file. The article index updates itself in about a minute.

## Linking between articles

Put a title in double square brackets, like `[[Solar system]]`, to link to another article. To show different text, write `[[Solar system|our neighbourhood]]`. Links to pages that don't exist yet show in red, which makes a handy to-do list.

## Formatting

Use `##` and `###` for headings (three or more headings create a contents box), `**bold**`, `*italic*`, lists, tables and images. See [[Example article]] for a sample.
