exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { apiKey, action, data } = JSON.parse(event.body);

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid API key' })
      };
    }

    let requestBody;

    if (action === 'test') {
      // Test connection
      requestBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "test" }]
      };
    } else if (action === 'search') {
      // Web search
      requestBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: data.query
        }]
      };
    } else if (action === 'extract') {
      // Extract leads
      requestBody = {
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: data.messages
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid action' })
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: responseData.error?.message || 'API request failed',
          details: responseData
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
