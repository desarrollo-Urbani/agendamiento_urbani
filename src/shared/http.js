const { AppError } = require('./errors');

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (_error) {
    throw new AppError('Invalid JSON body', 400, 'INVALID_JSON');
  }
}

function parseQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}

module.exports = {
  sendJson,
  readJsonBody,
  parseQuery
};
