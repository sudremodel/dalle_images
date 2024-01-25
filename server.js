const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const axios = require('axios');
const mysql = require('mysql2');
require('dotenv').config();
const cors = require("cors");

const app = express();
app.use(cors);
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
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };
  const dbConnection = mysql.createConnection(dbConfig);
  dbConnection.connect((err) => {
    if (err) {
      console.error('Error connecting to database:', err);
    } else {
      console.log('Connected to database');
    }
  });
  app.post('/storeDownload', async (req, res) => {
    try {
      const { organization_id, company_id, logoUrl, Headlines, Subheadlines, CallToAction, imageUrl } = req.body;
      const createdAtTime = new Date();
      console.log("you are in remodel database");
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT,
          company_id INT,
          logo_url VARCHAR(255),
          Headlines VARCHAR(255),
          Subheadlines VARCHAR(255),
          CallToAction VARCHAR(255),
          image_url VARCHAR(255),
          created_at_time TIMESTAMP
        )
      `;
      
      dbConnection.query(createTableQuery, (error) => {
        if (error) {
          console.error('Error creating table:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        const insertQuery = 'INSERT INTO ads (organization_id, company_id, logo_url, Headlines, Subheadlines, CallToAction, image_url, created_at_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [organization_id, company_id, logoUrl, Headlines, Subheadlines, CallToAction, imageUrl, createdAtTime];
  
        dbConnection.query(insertQuery, values, (error, results) => {
          if (error) {
            console.error('Error storing data in the database:', error);
            res.status(500).json({ error: 'Internal Server Error' });
          } else {
            console.log('Data stored successfully');
            res.json({ success: true });
          }
        });
      });
    } catch (error) {
      console.error('Error handling storeData request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });  
  app.post('/addToLibrary', async (req, res) => {
    try {
      const { organization_id, company_id, logoUrl, imageUrl } = req.body;
      const createdAtTime = new Date();
      console.log("you are in remodel database");
  
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS userLibrary (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT,
          company_id INT,
          logo_url VARCHAR(255),
          image_url VARCHAR(255),
          created_at_time TIMESTAMP
        )
      `;
      dbConnection.query(createTableQuery, (error) => {
        if (error) {
          console.error('Error creating table:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        // Insert data into the 'userLibrary' table
        const insertQuery = 'INSERT INTO userLibrary (organization_id, company_id, logo_url, image_url, created_at_time) VALUES (?, ?, ?, ?, ?)';
        const values = [organization_id, company_id, logoUrl, imageUrl, createdAtTime];
  
        dbConnection.query(insertQuery, values, (error, results) => {
          if (error) {
            console.error('Error storing data in the database:', error);
            res.status(500).json({ error: 'Internal Server Error' });
          } else {
            console.log('Data stored successfully');
            res.json({ success: true });
          }
        });
      });
    } catch (error) {
      console.error('Error handling storeData request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
