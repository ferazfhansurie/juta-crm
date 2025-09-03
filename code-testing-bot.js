#!/usr/bin/env node

/**
 * Code Testing Bot for CRM System
 * Analyzes functions across all pages for database operations, API calls, websockets, auth, and menu-related functionality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CodeTestingBot {
  constructor() {
    this.results = {
      summary: {
        totalFiles: 0,
        totalFunctions: 0,
        databaseOperations: 0,
        apiCalls: 0,
        websocketConnections: 0,
        authOperations: 0,
        menuRelatedFunctions: 0,
        errorHandlingCount: 0,
        issuesFound: 0
      },
      fileAnalysis: [],
      issues: [],
      recommendations: [],
      detectedPatterns: {
        imports: new Set(),
        functions: new Set(),
        apiEndpoints: new Set(),
        technologies: new Set()
      }
    };

    // Dynamic patterns that get updated based on codebase analysis
    this.dynamicPatterns = {
      detectedLibraries: new Set(),
      detectedFrameworks: new Set(),
      commonPatterns: new Map(),
      customHooks: new Set(),
      apiPatterns: new Set()
    };

    // Patterns to detect in code
    this.patterns = {
      database: {
        neon: /neon|postgres|sql|pg\.|pool\.|client\.|query\(/g,
        prisma: /prisma\.|PrismaClient|findMany|findUnique|create|update|delete|upsert/g,
        drizzle: /drizzle|db\.|select|insert|update|delete|from|where/g
      },
      api: {
        axios: /axios\.(get|post|put|delete|patch)|axios\(/g,
        fetch: /fetch\s*\(|await\s+fetch/g,
        apiRoutes: /\/api\/|baseUrl|endpoint/g
      },
      functions: {
        arrow: /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
        regular: /function\s+(\w+)\s*\([^)]*\)/g,
        method: /(\w+)\s*:\s*\([^)]*\)\s*=>/g,
        async: /async\s+(function\s+)?(\w+)/g,
        handler: /handle\w+|on\w+|use\w+/g
      },
      errorHandling: /try\s*{|catch\s*\(|\.catch\(|throw\s+|error|Error/g,
      menuItems: /pathname\s*:\s*["']([^"']+)["']/g,
      websocket: /socket|websocket|ws\.|io\(|emit|on\(/g,
      auth: /token|auth|login|logout|session|jwt|bearer/gi
    };

    // Menu items from the simple-menu.ts
    this.menuPaths = [
      '/chat',
      '/crud-data-list', 
      '/dashboard',
      '/inbox',
      '/calendar',
      '/users-layout-2'
    ];
  }

  async analyzeCodebase() {
    console.log('🤖 Starting adaptive code analysis...\n');
    
    const srcPath = path.join(__dirname, 'src');
    
    // First pass: Learn patterns from the codebase
    console.log('📚 Learning patterns from your codebase...');
    await this.learnCodebasePatterns(srcPath);
    
    // Second pass: Analyze using learned patterns
    console.log('🔍 Analyzing with discovered patterns...');
    await this.analyzeDirectory(srcPath);
    
    this.generateReport();
    this.saveResults();
  }

  async learnCodebasePatterns(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.learnCodebasePatterns(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
        await this.learnFromFile(fullPath);
      }
    }
    
    // Update patterns based on what we learned
    this.updateDynamicPatterns();
  }

  async learnFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Learn import patterns
      const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      importMatches.forEach(imp => {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);  
        if (match) {
          this.results.detectedPatterns.imports.add(match[1]);
        }
      });
      
      // Learn function patterns
      const functionMatches = content.match(/(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g) || [];
      functionMatches.forEach(func => {
        const match = func.match(/(\w+)\s*=/);
        if (match && match[1].length > 3) {
          this.results.detectedPatterns.functions.add(match[1]);
        }
      });
      
      // Learn API endpoint patterns
      const apiMatches = content.match(/['"`]\/api\/[^'"`]+['"`]/g) || [];
      apiMatches.forEach(api => {
        this.results.detectedPatterns.apiEndpoints.add(api.replace(/['"`]/g, ''));
      });
      
      // Detect technologies being used
      this.detectTechnologies(content);
      
    } catch (error) {
      // Silently continue on error during learning phase
    }
  }

  detectTechnologies(content) {
    const techPatterns = {
      'React': /import.*react|useState|useEffect|JSX/i,
      'TypeScript': /interface\s+\w+|type\s+\w+\s*=/,
      'Axios': /axios\.|import.*axios/,
      'Socket.io': /socket\.io|io\(/,
      'Firebase': /firebase|getFirestore|getAuth/,
      'Neon': /neon|@neondatabase/,
      'Prisma': /prisma|PrismaClient/,
      'Drizzle': /drizzle-orm/,
      'Tailwind': /className.*\s(bg-|text-|p-|m-|flex|grid)/,
      'Zustand': /zustand|create.*store/,
      'React Query': /react-query|@tanstack\/react-query/,
      'Next.js': /next\/|getServerSideProps|getStaticProps/,
      'Vite': /import\.meta/
    };
    
    Object.entries(techPatterns).forEach(([tech, pattern]) => {
      if (pattern.test(content)) {
        this.results.detectedPatterns.technologies.add(tech);
      }
    });
  }

  updateDynamicPatterns() {
    // Create dynamic regex patterns based on detected libraries
    const importArray = Array.from(this.results.detectedPatterns.imports);
    
    // Build database pattern based on detected DB libraries
    const dbLibs = importArray.filter(imp => 
      imp.includes('neon') || 
      imp.includes('prisma') || 
      imp.includes('drizzle') ||
      imp.includes('postgres') ||
      imp.includes('mysql') ||
      imp.includes('mongodb')
    );
    
    // Build API pattern based on detected HTTP libraries
    const httpLibs = importArray.filter(imp => 
      imp.includes('axios') || 
      imp.includes('fetch') ||
      imp.includes('@tanstack/react-query') ||
      imp.includes('swr')
    );
    
    // Update patterns object to include discovered patterns
    if (dbLibs.length > 0) {
      const dbPattern = dbLibs.map(lib => lib.split('/').pop()).join('|');
      this.patterns.database.discovered = new RegExp(`(${dbPattern})\\.\\w+|query\\(|execute\\(|findMany|findFirst`, 'g');
    }
    
    if (httpLibs.length > 0) {
      const httpPattern = httpLibs.map(lib => lib.split('/').pop()).join('|');
      this.patterns.api.discovered = new RegExp(`(${httpPattern})\\.|fetch\\(|useMutation|useQuery`, 'g');
    }
    
    console.log(`📊 Discovered ${this.results.detectedPatterns.technologies.size} technologies:`);
    console.log(`   ${Array.from(this.results.detectedPatterns.technologies).join(', ')}`);
  }

  async analyzeDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.analyzeDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.js')) {
        await this.analyzeFile(fullPath);
      }
    }
  }

  async analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(__dirname, filePath);
      
      this.results.summary.totalFiles++;
      
      const analysis = {
        file: relativePath,
        functions: this.extractFunctions(content),
        databaseUsage: this.analyzeDatabaseUsage(content),
        apiCalls: this.analyzeApiCalls(content),
        websocketUsage: this.analyzeWebsocketUsage(content),
        authUsage: this.analyzeAuthUsage(content),
        errorHandling: this.analyzeErrorHandling(content),
        menuRelated: this.isMenuRelatedFile(relativePath),
        issues: [],
        metrics: {
          lines: content.split('\n').length,
          complexity: this.calculateComplexity(content)
        }
      };

      // Check for common issues
      this.checkForIssues(content, analysis);
      
      this.results.fileAnalysis.push(analysis);
      this.updateSummaryStats(analysis);
      
    } catch (error) {
      this.results.issues.push({
        type: 'file_read_error',
        file: filePath,
        message: `Error reading file: ${error.message}`
      });
    }
  }

  extractFunctions(content) {
    const functions = [];
    
    // Extract arrow functions
    let match;
    while ((match = this.patterns.functions.arrow.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'arrow',
        line: this.getLineNumber(content, match.index)
      });
    }

    // Reset regex
    this.patterns.functions.arrow.lastIndex = 0;
    
    // Extract regular functions
    while ((match = this.patterns.functions.regular.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'function',
        line: this.getLineNumber(content, match.index)
      });
    }

    this.patterns.functions.regular.lastIndex = 0;

    return functions;
  }

  analyzeFirebaseUsage(content) {
    const usage = {
      auth: [],
      firestore: [],
      storage: []
    };

    for (const [category, pattern] of Object.entries(this.patterns.firebase)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        usage[category].push({
          operation: match[0],
          line: this.getLineNumber(content, match.index)
        });
      }
      pattern.lastIndex = 0; // Reset regex
    }

    return usage;
  }

  analyzeDatabaseUsage(content) {
    const usage = {
      neon: [],
      prisma: [],
      drizzle: []
    };

    for (const [category, pattern] of Object.entries(this.patterns.database)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        usage[category].push({
          operation: match[0],
          line: this.getLineNumber(content, match.index)
        });
      }
      pattern.lastIndex = 0;
    }

    return usage;
  }

  analyzeApiCalls(content) {
    const calls = [];
    
    for (const [type, pattern] of Object.entries(this.patterns.api)) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        calls.push({
          type: type,
          call: match[0],
          line: this.getLineNumber(content, match.index)
        });
      }
      pattern.lastIndex = 0;
    }

    return calls;
  }

  analyzeWebsocketUsage(content) {
    const usage = [];
    let match;
    while ((match = this.patterns.websocket.exec(content)) !== null) {
      usage.push({
        operation: match[0],
        line: this.getLineNumber(content, match.index)
      });
    }
    this.patterns.websocket.lastIndex = 0;
    return usage;
  }

  analyzeAuthUsage(content) {
    const usage = [];
    let match;
    while ((match = this.patterns.auth.exec(content)) !== null) {
      usage.push({
        operation: match[0],
        line: this.getLineNumber(content, match.index)
      });
    }
    this.patterns.auth.lastIndex = 0;
    return usage;
  }

  analyzeErrorHandling(content) {
    const matches = content.match(this.patterns.errorHandling) || [];
    return {
      count: matches.length,
      hasErrorHandling: matches.length > 0,
      patterns: matches
    };
  }

  isMenuRelatedFile(filePath) {
    return this.menuPaths.some(menuPath => {
      const normalizedPath = menuPath.replace(/^\//, '').replace(/\//g, '');
      return filePath.includes(normalizedPath) || filePath.includes('menu') || filePath.includes('Menu');
    });
  }

  checkForIssues(content, analysis) {
    const issues = [];

    // Check for missing error handling in async functions
    if (content.includes('async') && !analysis.errorHandling.hasErrorHandling) {
      issues.push({
        type: 'missing_error_handling',
        severity: 'medium',
        message: 'Async function without error handling detected'
      });
    }

    // Check for console.log statements
    if (content.includes('console.log')) {
      issues.push({
        type: 'debug_statement',
        severity: 'low',
        message: 'Console.log statements found - should be removed in production'
      });
    }

    // Check for hardcoded API endpoints
    const hardcodedUrls = content.match(/https?:\/\/[^\s"']+/g);
    if (hardcodedUrls && hardcodedUrls.length > 0) {
      issues.push({
        type: 'hardcoded_url',
        severity: 'medium',
        message: `Hardcoded URLs found: ${hardcodedUrls.join(', ')}`
      });
    }

    // Check for database operations without error handling
    const hasDatabaseOps = Object.values(analysis.databaseUsage).some(ops => ops.length > 0);
    if (hasDatabaseOps && !analysis.errorHandling.hasErrorHandling) {
      issues.push({
        type: 'database_without_error_handling',
        severity: 'high',
        message: 'Database operations without proper error handling'
      });
    }

    // Check for API calls without error handling
    if (analysis.apiCalls.length > 0 && !analysis.errorHandling.hasErrorHandling) {
      issues.push({
        type: 'api_without_error_handling',
        severity: 'high',
        message: 'API calls without proper error handling'
      });
    }

    // Check for websocket usage without error handling
    if (analysis.websocketUsage.length > 0 && !analysis.errorHandling.hasErrorHandling) {
      issues.push({
        type: 'websocket_without_error_handling',
        severity: 'medium',
        message: 'WebSocket operations without proper error handling'
      });
    }

    analysis.issues = issues;
    this.results.issues.push(...issues.map(issue => ({
      ...issue,
      file: analysis.file
    })));
  }

  calculateComplexity(content) {
    // Simple complexity calculation based on control structures
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s*if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /&&|\|\|/g
    ];

    let complexity = 1; // Base complexity
    
    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      complexity += matches.length;
    });

    return complexity;
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  updateSummaryStats(analysis) {
    this.results.summary.totalFunctions += analysis.functions.length;
    
    const databaseOpsCount = Object.values(analysis.databaseUsage)
      .reduce((sum, ops) => sum + ops.length, 0);
    this.results.summary.databaseOperations += databaseOpsCount;
    
    this.results.summary.apiCalls += analysis.apiCalls.length;
    this.results.summary.websocketConnections += analysis.websocketUsage.length;
    this.results.summary.authOperations += analysis.authUsage.length;
    
    if (analysis.menuRelated) {
      this.results.summary.menuRelatedFunctions++;
    }
    
    if (analysis.errorHandling.hasErrorHandling) {
      this.results.summary.errorHandlingCount++;
    }
    
    this.results.summary.issuesFound += analysis.issues.length;
  }

  generateReport() {
    console.log('📊 COMPREHENSIVE CODE ANALYSIS REPORT');
    console.log('=' .repeat(50));
    
    console.log('\n📈 SUMMARY STATISTICS:');
    console.log(`Total Files Analyzed: ${this.results.summary.totalFiles}`);
    console.log(`Total Functions Found: ${this.results.summary.totalFunctions}`);
    console.log(`Database Operations: ${this.results.summary.databaseOperations}`);
    console.log(`API Calls: ${this.results.summary.apiCalls}`);
    console.log(`WebSocket Connections: ${this.results.summary.websocketConnections}`);
    console.log(`Auth Operations: ${this.results.summary.authOperations}`);
    console.log(`Menu-Related Files: ${this.results.summary.menuRelatedFunctions}`);
    console.log(`Files with Error Handling: ${this.results.summary.errorHandlingCount}`);
    console.log(`Issues Found: ${this.results.summary.issuesFound}`);

    console.log('\n🔥 TOP FILES BY COMPLEXITY:');
    const topComplexFiles = this.results.fileAnalysis
      .sort((a, b) => b.metrics.complexity - a.metrics.complexity)
      .slice(0, 10);
    
    topComplexFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file.file} (Complexity: ${file.metrics.complexity})`);
    });

    console.log('\n⚠️  CRITICAL ISSUES:');
    const criticalIssues = this.results.issues.filter(issue => issue.severity === 'high');
    criticalIssues.forEach(issue => {
      console.log(`❌ ${issue.file}: ${issue.message}`);
    });

    console.log('\n🔧 DATABASE USAGE BY FILE:');
    const databaseFiles = this.results.fileAnalysis.filter(file => 
      Object.values(file.databaseUsage).some(ops => ops.length > 0)
    );
    
    databaseFiles.slice(0, 10).forEach(file => {
      const neonOps = file.databaseUsage.neon.length;
      const prismaOps = file.databaseUsage.prisma.length;
      const drizzleOps = file.databaseUsage.drizzle.length;
      console.log(`🗄️ ${file.file}: Neon(${neonOps}) Prisma(${prismaOps}) Drizzle(${drizzleOps})`);
    });
    
    console.log('\n🌐 API & WEBSOCKET USAGE:');
    const apiFiles = this.results.fileAnalysis.filter(file => 
      file.apiCalls.length > 0 || file.websocketUsage.length > 0 || file.authUsage.length > 0
    );
    
    apiFiles.slice(0, 10).forEach(file => {
      console.log(`🔗 ${file.file}: API(${file.apiCalls.length}) WebSocket(${file.websocketUsage.length}) Auth(${file.authUsage.length})`);
    });

    this.generateRecommendations();
  }

  generateRecommendations() {
    const recommendations = [];

    // Error handling recommendations
    const filesWithoutErrorHandling = this.results.fileAnalysis.filter(
      file => (
        Object.values(file.databaseUsage).some(ops => ops.length > 0) ||
        file.apiCalls.length > 0 ||
        file.websocketUsage.length > 0
      ) && !file.errorHandling.hasErrorHandling
    );

    if (filesWithoutErrorHandling.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'error_handling',
        message: `Add error handling to ${filesWithoutErrorHandling.length} files with database/API operations`,
        files: filesWithoutErrorHandling.map(f => f.file)
      });
    }

    // Performance recommendations
    const highComplexityFiles = this.results.fileAnalysis.filter(
      file => file.metrics.complexity > 20
    );

    if (highComplexityFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: `Consider refactoring ${highComplexityFiles.length} high-complexity files`,
        files: highComplexityFiles.map(f => f.file)
      });
    }

    this.results.recommendations = recommendations;

    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
    });
  }

  saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `code-analysis-report-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${filename}`);
    
    // Save a simplified HTML report
    this.saveHtmlReport(timestamp);
  }

  saveHtmlReport(timestamp) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Code Analysis Report - ${timestamp}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .issue { background: #ffe6e6; padding: 10px; margin: 10px 0; border-left: 4px solid #ff0000; }
        .recommendation { background: #e6f3ff; padding: 10px; margin: 10px 0; border-left: 4px solid #0066cc; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🤖 Code Analysis Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="summary">
        <h2>📈 Summary Statistics</h2>
        <ul>
            <li>Total Files: ${this.results.summary.totalFiles}</li>
            <li>Total Functions: ${this.results.summary.totalFunctions}</li>
            <li>Database Operations: ${this.results.summary.databaseOperations}</li>
            <li>WebSocket Connections: ${this.results.summary.websocketConnections}</li>
            <li>Auth Operations: ${this.results.summary.authOperations}</li>
            <li>API Calls: ${this.results.summary.apiCalls}</li>
            <li>Issues Found: ${this.results.summary.issuesFound}</li>
        </ul>
    </div>

    <h2>⚠️ Issues Found</h2>
    ${this.results.issues.map(issue => `
        <div class="issue">
            <strong>${issue.file}</strong><br>
            <strong>${issue.severity.toUpperCase()}:</strong> ${issue.message}
        </div>
    `).join('')}

    <h2>💡 Recommendations</h2>
    ${this.results.recommendations.map(rec => `
        <div class="recommendation">
            <strong>${rec.priority.toUpperCase()}:</strong> ${rec.message}
        </div>
    `).join('')}

    <h2>📁 File Analysis</h2>
    <table>
        <tr>
            <th>File</th>
            <th>Functions</th>
            <th>Complexity</th>
            <th>DB Ops</th>
            <th>WebSocket</th>
            <th>Auth</th>
            <th>API Calls</th>
            <th>Issues</th>
        </tr>
        ${this.results.fileAnalysis.map(file => `
            <tr>
                <td>${file.file}</td>
                <td>${file.functions.length}</td>
                <td>${file.metrics.complexity}</td>
                <td>${Object.values(file.databaseUsage).reduce((sum, ops) => sum + ops.length, 0)}</td>
                <td>${file.websocketUsage.length}</td>
                <td>${file.authUsage.length}</td>
                <td>${file.apiCalls.length}</td>
                <td>${file.issues.length}</td>
            </tr>
        `).join('')}
    </table>
</body>
</html>
    `;

    fs.writeFileSync(`code-analysis-report-${timestamp}.html`, htmlContent);
    console.log(`📄 HTML report saved to: code-analysis-report-${timestamp}.html`);
  }
}

// Run the analysis
const bot = new CodeTestingBot();
bot.analyzeCodebase().catch(console.error);