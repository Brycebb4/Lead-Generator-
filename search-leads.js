exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, data } = JSON.parse(event.body);

    if (action === 'search') {
      const tavilyRes = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: data.query,
          search_depth: 'advanced',
          max_results: 8
        })
      });
      const tavilyData = await tavilyRes.json();

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ content: tavilyData.results || [] })
      };
    }

    if (action === 'extract') {
      const messages = [
        { 
          role: "system", 
          content: "You are a precise JSON extractor. Return ONLY a valid JSON array of leads. No explanations, no markdown, no extra text. Example format: [{\"title\":\"...\",\"contactName\":\"...\",\"phone\":\"...\",\"email\":\"...\",\"location\":\"...\",\"details\":\"...\",\"urgency\":8,\"estimatedValue\":\"$450\",\"source\":\"Craigslist\",\"sourceUrl\":\"...\",\"nextSteps\":\"...\"}]" 
        },
        ...data.messages
      ];

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: messages,
          max_tokens: 2000,
          temperature: 0.1
          // response_format removed — this was the bug
        })
      });
      const groqData = await groqRes.json();
      let text = groqData.choices?.[0]?.message?.content || '[]';

      // Safety fallback: ensure it's always a parseable array string
      if (!text.trim().startsWith('[')) {
        text = '[]';
      }

      const mimickedClaude = { content: [{ type: 'text', text }] };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(mimickedClaude)
      };
    }

    if (action === 'test') {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
