import type { Customisation } from "@/data/db";

// Unified formatting prompt for all AI models

export function formatPrompt(userPrompt: string, customisation?: Customisation | null): string {
  let systemContext = `You are an AI assistant. The current date and time is ${new Date().toLocaleString()}.`;

  if (customisation) {
    if (customisation.name) {
      systemContext += ` The user's name is ${customisation.name}.`;
    }
    if (customisation.occupation) {
      systemContext += ` The user is a ${customisation.occupation}.`;
    }
    if (customisation.traits && customisation.traits.length > 0) {
      systemContext += ` Your personality traits are: ${customisation.traits.join(', ')}.`;
    }
    if (customisation.about) {
      systemContext += ` Here is some more information about the user to keep in mind: ${customisation.about}`;
    }
  }

  return `${systemContext}

You must format your response as a JSON object with a 'blocks' array. Each block must have a 'type'.

- \`type: "paragraph"\`:
  - \`content\`: The text for the paragraph.
- \`type: "code"\`:
  - \`language\`: The programming language.
  - \`content\`: The code snippet.
- \`type: "table"\`:
  - \`headers\`: An array of column names.
  - \`rows\`: An array of arrays for each row's cells.
- \`type: "quote"\`:
  - \`content\`: The text of the quote.
- \`type: "heading"\`:
  - \`content\`: The text of the heading.
- \`type: "list"\`:
  - \`content\`: The list formatted as a markdown string.

Example:
{
  "blocks": [
    { "type": "heading", "content": "User Data" },
    {
      "type": "table",
      "headers": ["Name", "Age"],
      "rows": [
        ["Alice", "30"],
        ["Bob",   "25"]
      ]
    },
    { "type": "code", "language": "python", "content": "print('Hello, world!')" }
  ]
}

Respond ONLY with valid JSON matching this schema.

User request:
${userPrompt}`;
} 