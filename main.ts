import fs from "node:fs";
import "dotenv/config";
import cliProgress from "cli-progress";

const words = JSON.parse(fs.readFileSync("words.json", "utf-8"));

function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mean(arr) {
  return arr.reduce((a, b) => a + b) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => Math.pow(x - m, 2))));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimLines(str) {
  return str
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
}

function promptGroq(llm, prompt, debug) {
  const trimmed = trimLines(prompt);
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({
      model: llm,
      response_format: {"type": "json_object"},
      messages: [{ role: "user", content: trimmed }],
      stream: false,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
  })
    .then((response) => response.json())
    .then((json) => {
      if (debug) {
        console.log(json.choices[0].message.content);
      }
      return JSON.parse(json.choices[0].message.content.trim());
    });
}

function promptLLM(llm, prompt) {
  const trimmed = trimLines(prompt);
  return fetch("http://localhost:11434/api/generate", {
    method: "POST",
    body: JSON.stringify({
      model: llm,
      prompt: trimmed,
      stream: false,
      format: "json",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((json) => JSON.parse(json.response.trim()));
}

async function getRepeatedCount(llm, total, debug) {
  const results = [];
  let errored = 0;
  let correct = 0;

  const bar = new cliProgress.SingleBar({
    format:
      "[{bar}] {percentage}% | ETA: {eta_formatted} | Duration: {duration_formatted} | {value}/{total}",
  });
  bar.start(total, 0);

  for (let i = 0; i < total; i++) {
    const { word, letter, count } = choose(words);
    try {
      const response = await promptGroq(
        llm,
        `
          How many times does the letter "${letter}" appear in the word "${word}"?
          Respond with JSON in the format { "count": N }
        `,
        debug,
      );
      const result = {
        expected: count,
        actual: response.count,
        correct: response.count === count,
        word,
        letter,
      };
      results.push(result);

      if (debug) {
        console.log(result);
      }

      if (response.count === count) {
        correct++;
      }
    } catch (e) {
      errored++;
      console.error(e);
    }
    bar.increment();
    await sleep(2000);
  }

  bar.stop();
  if (debug) {
    console.log(results);
  }
  const finalResult = {
    llm,
    percentage: (correct / (total - errored)) * 100,
    errored,
  };
  return finalResult;
}

const llm = process.argv[2] || "gemma:2b";
const total = Number(process.argv[3]) || 200;
const samples = Number(process.argv[4]) || 10;
const debug = process.argv[5] === "debug";
const percentages = [];

for (let i = 0; i < samples; i++) {
  const result = await getRepeatedCount(llm, total, debug);
  console.log(result);
  const { percentage } = result;
  percentages.push(percentage);
}

console.log({ stdDev: stdDev(percentages), mean: mean(percentages) });
