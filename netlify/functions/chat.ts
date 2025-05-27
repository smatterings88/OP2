import { Handler } from '@netlify/functions';
import OpenAI from 'openai';

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 204, 
      headers, 
      body: JSON.stringify({})
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Request body is required' }),
    };
  }

  console.log('Chat payload:', event.body);

  try {
    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY environment variable');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API key is not configured. Please check your environment variables.' 
        }),
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { messages } = parsedBody;
    
    if (!Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid messages format. Expected an array.' }),
      };
    }

    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || !latestMessage.content) {
      console.error('No message content provided:', latestMessage);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No message content provided.' }),
      };
    }

    // Call the Chat Completions API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      functions: [{
        name: 'saveContact',
        description: 'Save user contact via Netlify function',
        parameters: {
          type: 'object',
          required: ['from_name', 'from_email', 'service_category', 'budget', 'project_details'],
          properties: {
            from_name: {
              type: 'string',
              description: 'Full name of the user'
            },
            from_email: {
              type: 'string',
              description: 'User\'s email address'
            },
            phone: {
              type: 'string',
              description: '(Optional) User\'s phone number'
            },
            service_category: {
              type: 'string',
              description: 'e.g. \'chat_inquiry\''
            },
            budget: {
              type: 'string',
              description: 'e.g. \'not_specified\''
            },
            project_details: {
              type: 'string',
              description: 'Full chat message or project details'
            },
            message: {
              type: 'string',
              description: '(Optional) Same as project_details'
            }
          }
        }
      }],
      function_call: 'auto'
    });

    const message = completion.choices[0].message;

    // Handle function calls
    if (message.function_call) {
      const args = JSON.parse(message.function_call.arguments);
      
      // Call the saveContact function
      const saveResponse = await fetch('/.netlify/functions/saveContact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });

      if (!saveResponse.ok) {
        console.error('Failed to save contact:', await saveResponse.text());
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to save contact information' })
        };
      }

      const saveResult = await saveResponse.json();

      // Continue the chat with the function result
      const followUp = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          ...messages,
          message,
          {
            role: 'function',
            name: message.function_call.name,
            content: JSON.stringify(saveResult)
          }
        ]
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ choices: [followUp.choices[0]] })
      };
    }

    // Return the assistant's reply when no function call
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ choices: [completion.choices[0]] })
    };

  } catch (error) {
    console.error('Chat function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error 
          ? `Error processing chat request: ${error.message}` 
          : 'An unexpected error occurred while processing the chat request'
      }),
    };
  }
};

export { handler };
