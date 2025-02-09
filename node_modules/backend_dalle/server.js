const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const axios = require('axios');
const mysql = require('mysql2');
require('dotenv').config();
const winston = require('winston');

const app = express();
const port = 3020;

app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }), // Log all levels to a combined file
  ],
});
app.use((err, req, res, next) => {
  logger.error(`Error caught by error handling middleware: ${err.message}`, { error: err });
  const errorMessage = 'Internal Server Error';
  res.status(500).json({ error: errorMessage });
});

const dalleApiKey = process.env.DALLE_API_KEY;
const shutterstockApiKey = process.env.SHUTTERSTOCK_API_KEY;

const openai = new OpenAI({
    apiKey: dalleApiKey,
    dangerouslyAllowBrowser: true,
});

app.post('/dalle/search', async (req, res, next) => {
  try {
    const { query } = req.body;
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: query,
    });
    const imageUrl = image.data[0]?.url;
    res.json({ imageUrl });
    logger.info('DALL-E image search successful', { query, imageUrl });
  } catch (error) {
    // logger.error('Error in DALL-E image search', { error });
    next(error);
  }
});
app.post('/shutterstock/search', async (req, res, next) => {
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
      logger.info('Shutterstock image search successful', { query, imageUrls });
    } catch (error) {
      // logger.error('Error in Shutterstock image search', { error });
      next(error);
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
      const { organization_id, entity_id, logoUrl, Headlines, Subheadlines, CallToAction, imageUrl } = req.body;
      const createdAtTime = new Date();
      if (!organization_id || !entity_id || !imageUrl) {
        return res.status(500).json({ error: 'organization_id, entity_id, and image_url are required fields' });
      }
      console.log("you are in remodel database");
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ads (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          entity_id INT NOT NULL,
          logo_url VARCHAR(255),
          Headlines VARCHAR(255),
          Subheadlines VARCHAR(255),
          CallToAction VARCHAR(255),
          image_url VARCHAR(255) NOT NULL,
          created_at_time TIMESTAMP
        )
      `;
      
      dbConnection.query(createTableQuery, (error) => {
        if (error) {
          console.error('Error creating table:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        const insertQuery = 'INSERT INTO ads (organization_id, entity_id, logo_url, Headlines, Subheadlines, CallToAction, image_url, created_at_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const values = [organization_id, entity_id, logoUrl, Headlines, Subheadlines, CallToAction, imageUrl, createdAtTime];
  
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

  app.get('/getDownloadedImages', async (req, res) => {
    try {
      const { entity_id } = req.query;
  
      if (!entity_id) {
        return res.status(400).json({ error: 'entity_id parameter is required' });
      }
  
      const query = 'SELECT logo_url, Headlines, Subheadlines, CallToAction, image_url FROM ads WHERE entity_id = ?';
      const values = [entity_id];
  
      dbConnection.query(query, values, (error, results) => {
        if (error) {
          console.error('Error retrieving data from userLibrary:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          if (results.length === 0) {
            // No data found for the specified entity_id
            res.status(404).json({ error: 'Entity not found' });
          } else {
            console.log('Data retrieved successfully');
            res.json({ images: results });
          }
        }
      });
    } catch (error) {
      console.error('Error handling getDownloadedImages request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
   
  


  app.post('/addToLibrary', async (req, res) => {
    try {
      const { organization_id, entity_id, logoUrl, imageUrl } = req.body;
      const createdAtTime = new Date();
      console.log("you are in remodel database");
      if (!organization_id || !entity_id || !imageUrl) {
        return res.status(500).json({ error: 'organization_id, entity_id, and image_url are required fields' });
      }
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS userLibrary (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT,
          entity_id INT,
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
        const insertQuery = 'INSERT INTO userLibrary (organization_id, entity_id, logo_url, image_url, created_at_time) VALUES (?, ?, ?, ?, ?)';
        const values = [organization_id, entity_id, logoUrl, imageUrl, createdAtTime];
  
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
  app.get('/getUserLibrary', async (req, res) => {
    try {
      const { entity_id } = req.query;
  
      if (!entity_id) {
        return res.status(400).json({ error: 'entity_id parameter is required' });
      }
  
      const query = 'SELECT logo_url, image_url FROM userLibrary WHERE entity_id = ?';
      const values = [entity_id];
  
      dbConnection.query(query, values, (error, results) => {
        if (error) {
          console.error('Error retrieving data from userLibrary:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          if (results.length === 0) {
            // No data found for the specified entity_id
            res.status(404).json({ error: 'Entity not found' });
          } else {
            console.log('Data retrieved successfully');
            res.status(200).json({ images: results });
          }
        }
      });
    } catch (error) {
      console.error('Error handling getUserLibrary request:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  
module.exports = app;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
