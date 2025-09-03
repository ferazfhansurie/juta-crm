import React, { useState, useCallback, useRef } from 'react';
import Button from "@/components/Base/Button";
import { FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import LoadingIcon from "@/components/Base/LoadingIcon";
import { toast } from 'react-toastify';

interface AITestResult {
  url: string;
  timestamp: string;
  summary: {
    totalElements: number;
    interactiveElements: number;
    contentElements: number;
    forms: number;
  };
  discoveredElements: any[];
  extractedData: any;
  aiRecommendations: any[];
}

interface InteractionResult {
  type: string;
  selector: string;
  success: boolean;
  error?: string;
  data?: any;
}

const AIPageTester: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<AITestResult | null>(null);
  const [interactionResults, setInteractionResults] = useState<InteractionResult[]>([]);
  const [customScript, setCustomScript] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const runAIAnalysis = useCallback(async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL to analyze');
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/ai-scraper/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setTestResults(results);
      toast.success('AI analysis completed successfully!');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.info('Analysis cancelled');
      } else {
        console.error('AI analysis failed:', error);
        toast.error('Failed to analyze page: ' + error.message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [url]);

  const runInteractiveTest = useCallback(async (interactions: any[]) => {
    if (!url.trim()) {
      toast.error('Please enter a URL first');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-scraper/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, interactions }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setInteractionResults(results);
      toast.success('Interactive test completed!');
    } catch (error: any) {
      console.error('Interactive test failed:', error);
      toast.error('Interactive test failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  const runCustomScript = useCallback(async () => {
    if (!url.trim() || !customScript.trim()) {
      toast.error('Please enter both URL and custom script');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-scraper/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, script: customScript }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const results = await response.json();
      setInteractionResults([{
        type: 'custom_script',
        selector: 'custom',
        success: true,
        data: results
      }]);
      toast.success('Custom script executed successfully!');
    } catch (error: any) {
      console.error('Custom script failed:', error);
      toast.error('Custom script failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [url, customScript]);

  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const generateSmartTests = useCallback(() => {
    if (!testResults) {
      toast.error('Please run AI analysis first');
      return;
    }

    const interactions = [];

    // Auto-generate form tests
    testResults.discoveredElements
      .filter(el => el.type === 'form')
      .forEach(form => {
        form.fields.forEach((field: any) => {
          if (field.type === 'text' || field.type === 'email') {
            interactions.push({
              type: 'type',
              selector: field.selector,
              value: field.type === 'email' ? 'test@example.com' : 'test input',
              description: `Fill ${field.name || field.id} field`
            });
          }
        });
      });

    // Auto-generate button click tests
    testResults.discoveredElements
      .filter(el => el.type === 'interactive' && el.tagName === 'button')
      .slice(0, 3) // Limit to first 3 buttons
      .forEach(button => {
        interactions.push({
          type: 'click',
          selector: button.selector,
          description: `Click ${button.text || 'button'}`
        });
      });

    // Take screenshot
    interactions.push({
      type: 'screenshot',
      selector: 'body',
      fullPage: true,
      description: 'Take full page screenshot'
    });

    runInteractiveTest(interactions);
  }, [testResults, runInteractiveTest]);

  const exportResults = useCallback(() => {
    if (!testResults) {
      toast.error('No results to export');
      return;
    }

    const dataStr = JSON.stringify({
      testResults,
      interactionResults,
      exportedAt: new Date().toISOString()
    }, null, 2);

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-test-results-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Results exported successfully!');
  }, [testResults, interactionResults]);

  return (
    <div className="col-span-12 mt-8">
      <div className="intro-y flex items-center h-10">
        <h2 className="text-lg font-medium truncate mr-5">AI-Powered Page Testing</h2>
      </div>

      <div className="grid grid-cols-12 gap-6 mt-5">
        {/* Configuration Panel */}
        <div className="intro-y col-span-12 lg:col-span-6">
          <div className="box">
            <div className="flex flex-col sm:flex-row items-center p-5 border-b border-slate-200/60">
              <h2 className="font-medium text-base mr-auto">Test Configuration</h2>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="form-label">Target URL</label>
                <FormInput
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant="primary"
                  onClick={runAIAnalysis}
                  disabled={isLoading || !url.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <LoadingIcon icon="spinning-circles" className="w-4 h-4 mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Lucide icon="Brain" className="w-4 h-4 mr-2" />
                      AI Analysis
                    </>
                  )}
                </Button>

                {isLoading && (
                  <Button variant="secondary" onClick={stopAnalysis}>
                    <Lucide icon="Square" className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline-primary"
                  onClick={generateSmartTests}
                  disabled={isLoading || !testResults}
                  className="flex-1"
                >
                  <Lucide icon="Zap" className="w-4 h-4 mr-2" />
                  Smart Tests
                </Button>

                <Button
                  variant="outline-secondary"
                  onClick={exportResults}
                  disabled={!testResults}
                >
                  <Lucide icon="Download" className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <label className="form-label">Custom JavaScript</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="// Enter custom JavaScript to execute
return document.title;"
                  value={customScript}
                  onChange={(e) => setCustomScript(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  variant="outline-warning"
                  onClick={runCustomScript}
                  disabled={isLoading || !url.trim() || !customScript.trim()}
                  className="mt-2"
                  size="sm"
                >
                  <Lucide icon="Code" className="w-4 h-4 mr-2" />
                  Execute Script
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="intro-y col-span-12 lg:col-span-6">
          <div className="box">
            <div className="flex flex-col sm:flex-row items-center p-5 border-b border-slate-200/60">
              <h2 className="font-medium text-base mr-auto">Analysis Results</h2>
              {testResults && (
                <div className="text-xs text-slate-500">
                  {testResults.summary.totalElements} elements discovered
                </div>
              )}
            </div>
            <div className="p-5">
              {!testResults ? (
                <div className="text-center text-slate-500 py-8">
                  <Lucide icon="Search" className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>Run AI analysis to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Discovery Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Interactive:</span>
                        <span className="ml-2 font-medium">{testResults.summary.interactiveElements}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Content:</span>
                        <span className="ml-2 font-medium">{testResults.summary.contentElements}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Forms:</span>
                        <span className="ml-2 font-medium">{testResults.summary.forms}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Total:</span>
                        <span className="ml-2 font-medium">{testResults.summary.totalElements}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Recommendations */}
                  {testResults.aiRecommendations.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">AI Recommendations</h3>
                      <div className="space-y-2">
                        {testResults.aiRecommendations.map((rec, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-md text-sm ${
                              rec.priority === 'high'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                : 'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}
                          >
                            <div className="font-medium capitalize">{rec.type.replace('_', ' ')}</div>
                            <div className="mt-1">{rec.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interaction Results */}
                  {interactionResults.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Test Results</h3>
                      <div className="space-y-2">
                        {interactionResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-md text-sm ${
                              result.success
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">{result.type.replace('_', ' ')}</span>
                              <Lucide
                                icon={result.success ? "CheckCircle" : "XCircle"}
                                className="w-4 h-4"
                              />
                            </div>
                            {result.error && (
                              <div className="mt-1 text-xs">{result.error}</div>
                            )}
                            {result.data && result.type === 'screenshot' && (
                              <div className="mt-2">
                                <img
                                  src={`data:image/png;base64,${result.data}`}
                                  alt="Screenshot"
                                  className="max-w-full h-auto rounded border"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPageTester;