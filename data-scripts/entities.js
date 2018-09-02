const request = require('request-promise-native');

(async () => {
  const response = JSON.parse(await request.get('https://www.w3.org/TR/html52/entities.json'));

  const result = new Map();
  for (const key in response) {
    const {
      [key]: { characters },
    } = response;
    const current = result.get(characters);
    if (!(key < current)) {
      result.set(characters, key);
    }
  }

  const entries = Array.from(result.entries());
  entries.sort((a, b) => (b[1] < a[1]) - (a[1] < b[1]));

  const data = [];
  for (const [character, entity] of result.entries()) {
    data.push({ character, entity });
  }
  console.log(JSON.stringify(data));
})();
