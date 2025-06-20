// server.js
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GENAI_API_KEY);

// Vishal's persona
const vishalBio = `
You are speaking as Vishal Sanap, a full-stack developer from India who graduated in 2024,
specializing in frontend with React and Next.js. You're exploring Generative AI voice-based apps.
Keep responses conversational, friendly, and to-the-point.
`;

// Rate limiting state (simple in-memory store)
const rateLimitStore = new Map();

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const clientId = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 10; // max 10 requests per minute

  if (!rateLimitStore.has(clientId)) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const clientData = rateLimitStore.get(clientId);
  
  if (now > clientData.resetTime) {
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (clientData.count >= maxRequests) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }

  clientData.count++;
  next();
};

// Ask Gemini endpoint
app.post('/api/ask', rateLimit, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required and must be a string' });
    }

    if (question.length > 1000) {
      return res.status(400).json({ error: 'Question is too long (max 1000 characters)' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = vishalBio + "\n\nUser asked: " + question;

    // Retry logic for rate limiting
    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        const result = await model.generateContent(prompt);
        response = result.response.text();
        break;
      } catch (error) {
        if (error.message.includes('429') || error.message.includes('quota')) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            continue;
          }
          return res.status(429).json({ 
            error: 'AI service rate limit exceeded. Please try again later.' 
          });
        }
        throw error;
      }
    }

    res.json({ response });

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ 
      error: 'Failed to generate response. Please try again.' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Voice Bot API'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Voice Bot API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;