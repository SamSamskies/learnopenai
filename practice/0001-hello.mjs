import OpenAI from "openai";

const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-4.1-nano",
  input: "Say hello in exactly five words.",
});

console.log("output_text:", response.output_text);
console.log("response id:", response.id);
console.log("tokens:", response.usage?.total_tokens);
