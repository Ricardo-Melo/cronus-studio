/**
 * Cronus — Netlify Serverless API Function
 * Roteia requisições do Netlify Functions diretamente para o motor da API com persistência Turso.
 */

const { handleApiCore } = require('../../api.js');

exports.handler = async (event, context) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  try {
    let pathname = event.path || '';
    if (pathname.includes('/.netlify/functions/api')) {
      pathname = pathname.replace('/.netlify/functions/api', '/api');
    }
    if (!pathname.startsWith('/api')) {
      pathname = '/api' + (pathname.startsWith('/') ? pathname : '/' + pathname);
    }

    let body = {};
    if (event.body) {
      try {
        body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      } catch (e) {
        body = {};
      }
    }

    const response = await handleApiCore({
      method: (event.httpMethod || 'GET').toUpperCase(),
      pathname,
      query: event.queryStringParameters || {},
      body
    });

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify(response.data)
    };
  } catch (err) {
    console.error('Netlify API Handler Error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
