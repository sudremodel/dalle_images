const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const axios = require('axios');
require('dotenv').config();


const app = express();
const port = 3020;

app.use(bodyParser.json());

const dalleApiKey = process.env.DALLE_API_KEY;
const shutterstockApiKey = process.env.SHUTTERSTOCK_API_KEY;
// Middleware to check for API key in request headers
const checkApiKey = (req, res, next) => {
  const apiKeyHeader = req.headers.authorization;

  if (!apiKeyHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const [bearer, apiKey] = apiKeyHeader.split(' ');

  // Check the API key based on the endpoint
  if (req.path === '/dalle/search' && apiKeyHeader !== dalleApiKey) {
    return res.status(401).json({ error: 'Unauthorized for DALL-E endpoint' });
  }

  if (req.path === '/shutterstock/search' && bearer !== 'Bearer' && apiKeyHeader !== shutterstockApiKey) {
    return res.status(401).json({ error: 'Unauthorized for Shutterstock endpoint' });
  }

  // API key is valid, continue to the next middleware or route handler
  next();
};

const openai = new OpenAI({
    apiKey: dalleApiKey,
    dangerouslyAllowBrowser: true,
});

app.post('/dalle/search', checkApiKey, async (req, res) => {
  try {
    const { query } = req.body;
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: query,
    });
    const imageUrl = image.data[0]?.url;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error in DALL-E image search:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post('/shutterstock/search',checkApiKey, async (req, res) => {
    try {
      const { query } = req.body;
      const response = await axios.get('https://api.shutterstock.com/v2/images/search', {
        headers: {
          'Authorization': `Bearer ${shutterstockApiKey}`,
        },
        params: {
          query,
          per_page: 10,
          page: 1,
        },
      });
  
      const imageUrls = response.data.data.map(img => img.assets.preview.url);
      res.json({ imageUrls });
    } catch (error) {
      console.error('Error in Shutterstock image search:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
