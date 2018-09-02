const request = require('request-promise-native');

(async () => {
  const response = JSON.parse(await request.get('https://www.w3.org/TR/html52/entities.json'));

  const result = new Map();
  for (const key in response) {
    const current = result.get(key);
    const {
      [key]: { characters },
    } = response;
    if (!(characters < current)) {
      result.set(key, characters);
    }
  }

  const data = [];
  for (const [entity, character] of result.entries()) {
    data.push({ entity, character });
  }
  console.log(JSON.stringify(data));
})();
