const express = require('express');
const AIWebScraper = require('../../../ai-scraper');

const router = express.Router();

// Store active scrapers to manage resources
const activeScraper = new Map();

// Initialize scraper for session
async function getOrCreateScraper(sessionId = 'default') {
  if (!activeScraper.has(sessionId)) {
    const scraper = new AIWebScraper();
    await scraper.initialize();
    activeScraper.set(sessionId, scraper);
    
    // Auto-cleanup after 10 minutes of inactivity
    setTimeout(() => {
      if (activeScraper.has(sessionId)) {
        activeScraper.get(sessionId).close();
        activeScraper.delete(sessionId);
      }
    }, 10 * 60 * 1000);
  }
  
  return activeScraper.get(sessionId);
}

// AI Analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { url, sessionId = 'default' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    const results = await scraper.generatePageReport(url);
    
    if (!results) {
      return res.status(500).json({ error: 'Failed to analyze page' });
    }
    
    res.json(results);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

// Interactive testing endpoint
router.post('/interact', async (req, res) => {
  try {
    const { url, interactions, sessionId = 'default' } = req.body;
    
    if (!url || !interactions) {
      return res.status(400).json({ error: 'URL and interactions are required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    const results = await scraper.simulateInteraction(url, interactions);
    
    res.json(results);
  } catch (error) {
    console.error('Interactive test error:', error);
    res.status(500).json({ 
      error: 'Interactive test failed', 
      details: error.message 
    });
  }
});

// Custom script execution endpoint
router.post('/custom', async (req, res) => {
  try {
    const { url, script, sessionId = 'default' } = req.body;
    
    if (!url || !script) {
      return res.status(400).json({ error: 'URL and script are required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    
    // Navigate to page first
    await scraper.page.goto(url, { waitUntil: 'networkidle0' });
    
    // Execute custom script
    const result = await scraper.page.evaluate(script);
    
    res.json({ 
      success: true, 
      result,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Custom script error:', error);
    res.status(500).json({ 
      error: 'Script execution failed', 
      details: error.message 
    });
  }
});

// Element discovery endpoint
router.post('/discover', async (req, res) => {
  try {
    const { url, sessionId = 'default' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    const elements = await scraper.discoverElements(url);
    
    res.json({
      url,
      elements,
      discoveredAt: new Date().toISOString(),
      count: elements.length
    });
  } catch (error) {
    console.error('Element discovery error:', error);
    res.status(500).json({ 
      error: 'Element discovery failed', 
      details: error.message 
    });
  }
});

// Data extraction endpoint
router.post('/extract', async (req, res) => {
  try {
    const { url, extractionRules = {}, sessionId = 'default' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    const data = await scraper.extractData(url, extractionRules);
    
    if (!data) {
      return res.status(500).json({ error: 'Failed to extract data' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Data extraction error:', error);
    res.status(500).json({ 
      error: 'Data extraction failed', 
      details: error.message 
    });
  }
});

// Batch testing endpoint for comprehensive testing
router.post('/batch-test', async (req, res) => {
  try {
    const { url, testSuite, sessionId = 'default' } = req.body;
    
    if (!url || !testSuite) {
      return res.status(400).json({ error: 'URL and test suite are required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    const results = {
      url,
      startedAt: new Date().toISOString(),
      tests: []
    };

    // Run each test in the suite
    for (const test of testSuite) {
      try {
        let testResult = {
          name: test.name,
          type: test.type,
          success: false,
          error: null,
          data: null,
          duration: 0
        };

        const startTime = Date.now();

        switch (test.type) {
          case 'analysis':
            testResult.data = await scraper.generatePageReport(url);
            testResult.success = !!testResult.data;
            break;
            
          case 'interaction':
            testResult.data = await scraper.simulateInteraction(url, test.interactions);
            testResult.success = testResult.data.every(r => r.success);
            break;
            
          case 'extraction':
            testResult.data = await scraper.extractData(url, test.rules);
            testResult.success = !!testResult.data;
            break;
            
          case 'custom':
            await scraper.page.goto(url, { waitUntil: 'networkidle0' });
            testResult.data = await scraper.page.evaluate(test.script);
            testResult.success = true;
            break;
            
          default:
            testResult.error = `Unknown test type: ${test.type}`;
        }

        testResult.duration = Date.now() - startTime;
        results.tests.push(testResult);
        
      } catch (error) {
        results.tests.push({
          name: test.name,
          type: test.type,
          success: false,
          error: error.message,
          data: null,
          duration: 0
        });
      }
    }

    results.completedAt = new Date().toISOString();
    results.summary = {
      total: results.tests.length,
      passed: results.tests.filter(t => t.success).length,
      failed: results.tests.filter(t => !t.success).length,
      duration: results.tests.reduce((acc, t) => acc + t.duration, 0)
    };

    res.json(results);
  } catch (error) {
    console.error('Batch test error:', error);
    res.status(500).json({ 
      error: 'Batch test failed', 
      details: error.message 
    });
  }
});

// Performance testing endpoint
router.post('/performance', async (req, res) => {
  try {
    const { url, sessionId = 'default' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const scraper = await getOrCreateScraper(sessionId);
    
    // Collect performance metrics
    const metrics = await scraper.page.evaluate(() => {
      return {
        performance: performance.getEntriesByType('navigation')[0],
        resources: performance.getEntriesByType('resource').length,
        memory: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null
      };
    });

    res.json({
      url,
      metrics,
      analyzedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Performance analysis error:', error);
    res.status(500).json({ 
      error: 'Performance analysis failed', 
      details: error.message 
    });
  }
});

// Cleanup endpoint
router.post('/cleanup', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    
    if (activeScraper.has(sessionId)) {
      await activeScraper.get(sessionId).close();
      activeScraper.delete(sessionId);
    }
    
    res.json({ success: true, message: 'Session cleaned up' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      error: 'Cleanup failed', 
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: activeScraper.size,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;