import fs from "node:fs";
import WordPOS from "wordpos";

async function findWordsWithRepeatedLetters() {
  const wp = new WordPOS();
  const seen = new Set();
  const repeated = [];
  for (let i = 0; i < 50; i++) {
    const words = await wp.rand({ count: 1000 });
    for (const word of words) {
      if (word.match(/[^a-z]/)) {
        continue;
      }
      if (seen.has(word)) {
        continue;
      }
      if (word.length < 5) {
        continue;
      }
      if (word.match(/xv|xx|xl|ii/)) {
        continue;
      }
      const letterCounts = word.split("").reduce((acc, letter) => {
        acc[letter] = (acc[letter] || 0) + 1;
        return acc;
      }, {});
      const lettersSortedByCount = Object.entries(letterCounts).sort(
        (a, b) => b[1] - a[1],
      );
      const mostRepeatedLetter = lettersSortedByCount[0];
      const hasRepeatedLetter = mostRepeatedLetter[1] > 2;
      if (hasRepeatedLetter) {
        repeated.push({
          word,
          letter: mostRepeatedLetter[0],
          count: mostRepeatedLetter[1],
        });
        seen.add(word);
      }
    }
  }
  return repeated;
}

const words = await findWordsWithRepeatedLetters();
fs.writeFileSync("words.json", JSON.stringify(words, null, 2));

console.log(words);
console.log(words.length);
