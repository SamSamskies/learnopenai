import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

const stream = await client.responses.create({
  model: "gpt-4.1-nano",
  input: "Explain why streaming feels faster in three short sentences.",
  stream: true,
});

let text = "";

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
    text += event.delta;
  }

  if (event.type === "response.completed") {
    const outputText = event.response.output
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content)
      .filter((part) => part.type === "output_text")
      .map((part) => part.text)
      .join("");

    console.log("\n\n--- done ---");
    console.log("response id:", event.response.id);
    console.log("tokens:", event.response.usage?.total_tokens);
    console.log("output_text matches:", text === outputText);
  }
}
