import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { HealthTool, ComprehensiveHealthToolsService, ToolType } from '../../lib/complete-health-tools';
import { githubDB, collections } from '../../lib/database';
import { initializeAllHealthTools } from '../../lib/health-tools';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { 
  Sparkles, 
  Calculator, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Star,
  Download,
  Share2
} from 'lucide-react';

const ToolDetailPage = () => {
  const { toolId } = useParams<{ toolId: string }>();
  const [tool, setTool] = useState<HealthTool | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [inputData, setInputData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTool = async () => {
      if (!toolId) {
        setError('Tool ID not provided');
        setLoading(false);
        return;
      }

      try {
        // Ensure tools are initialized first
        await initializeAllHealthTools();
        
        const toolData = await githubDB.findById(collections.health_tools, toolId);
        if (!toolData) {
          setError('Tool not found');
        } else {
          setTool(toolData);
          console.log('✅ Loaded tool:', toolData.name, 'Type:', toolData.type);
        }
      } catch (err) {
        setError('Failed to load health tool');
        console.error('Error loading tool:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTool();
  }, [toolId]);

  const handleRunTool = async () => {
    if (!tool) return;

    setRunning(true);
    setError(null);
    
    try {
      let toolResult;
      
      // Ensure the service is properly imported and available
      if (tool.type === ToolType.AI_POWERED) {
        // Check if executeAITool method exists
        if (typeof ComprehensiveHealthToolsService.executeAITool !== 'function') {
          throw new Error('AI tool execution service not available');
        }
        toolResult = await ComprehensiveHealthToolsService.executeAITool(tool.id, inputData);
      } else {
        // Check if executeCalculatorTool method exists
        if (typeof ComprehensiveHealthToolsService.executeCalculatorTool !== 'function') {
          throw new Error('Calculator tool execution service not available');
        }
        toolResult = await ComprehensiveHealthToolsService.executeCalculatorTool(tool.id, inputData);
      }
      
      setResult(toolResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run health tool';
      setError(errorMessage);
      console.error('Error running tool:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setInputData(prev => ({ ...prev, [field]: value }));
  };

  const validateRequired = () => {
    const requiredFields = tool?.config.input_fields?.filter(f => f.required) || [];
    return requiredFields.every(field => 
      inputData[field.name] !== undefined && 
      inputData[field.name] !== null && 
      inputData[field.name] !== ''
    );
  };

  const renderInputField = (field: any) => {
    const value = inputData[field.name] || '';
    
    switch (field.type) {
      case 'select':
        return (
          <select
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
        
      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={(value as string[])?.includes(option) || false}
                  onChange={(e) => {
                    const currentValues = (value as string[]) || [];
                    if (e.target.checked) {
                      handleInputChange(field.name, [...currentValues, option]);
                    } else {
                      handleInputChange(field.name, currentValues.filter(v => v !== option));
                    }
                  }}
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );
        
      case 'textarea':
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={4}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
        
      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              className="w-full"
              min={field.min || 0}
              max={field.max || 100}
              step={field.step || 1}
              value={value}
              onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{field.min || 0}</span>
              <span className="font-semibold">{value}</span>
              <span>{field.max || 100}</span>
            </div>
          </div>
        );
        
      case 'number':
        return (
          <input
            type="number"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={value}
            onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );
        
      case 'date':
        return (
          <input
            type="date"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          />
        );
        
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
              checked={value || false}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
            />
            <span className="text-sm text-gray-700">Yes</span>
          </label>
        );
        
      default:
        return (
          <input
            type="text"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const { result: resultData, disclaimer, emergency_alert } = result;

    return (
      <div className="space-y-4">
        {emergency_alert && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-800">Emergency Alert</span>
            </div>
            <p className="text-red-700 mt-2">
              This may require immediate medical attention. Call 911 if this is a medical emergency.
            </p>
          </div>
        )}
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Results</h3>
            <div className="flex space-x-2">
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Download className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            {typeof resultData === 'string' ? (
              <div className="whitespace-pre-wrap text-gray-700">{resultData}</div>
            ) : (
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(resultData, null, 2)}
              </pre>
            )}
          </div>
        </div>
        
        {disclaimer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Medical Disclaimer</span>
            </div>
            <p className="text-yellow-700 text-sm mt-2">{disclaimer}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Tool Not Found</h2>
          <p className="text-gray-600">The requested health tool could not be found.</p>
        </div>
      </div>
    );
  }

  const getToolIcon = () => {
    switch (tool.type) {
      case ToolType.AI_POWERED:
        return <Sparkles className="w-6 h-6" />;
      case ToolType.CALCULATOR:
        return <Calculator className="w-6 h-6" />;
      case ToolType.TRACKER:
        return <Activity className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  const getToolTypeColor = () => {
    switch (tool.type) {
      case ToolType.AI_POWERED:
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case ToolType.CALCULATOR:
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case ToolType.TRACKER:
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`${getToolTypeColor()} text-white rounded-xl p-8 mb-8`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                {getToolIcon()}
                <div>
                  <h1 className="text-3xl font-bold">{tool.name}</h1>
                  <p className="text-white/90 text-lg mt-2">{tool.description}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{tool.estimated_duration} minutes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span>{tool.rating || 4.5}/5</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Activity className="w-4 h-4" />
                  <span>{tool.usage_count || 0} uses</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                {tool.type === ToolType.AI_POWERED ? 'AI-Powered' : 
                 tool.type === ToolType.CALCULATOR ? 'Calculator' : 
                 'Health Tool'}
              </span>
              {tool.emergency_tool && (
                <div className="mt-2">
                  <span className="inline-block bg-red-500 px-3 py-1 rounded-full text-sm">
                    Emergency Tool
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-dark">Tool Input</h2>
            
            <div className="space-y-6">
              {tool.config.input_fields?.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                    {field.unit && (
                      <span className="text-gray-500 ml-1">({field.unit})</span>
                    )}
                  </label>
                  
                  {renderInputField(field)}
                  
                  {field.description && (
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
              )) || (
                <p className="text-gray-500 italic">No input fields configured for this tool.</p>
              )}
            </div>
            
            <button
              onClick={handleRunTool}
              disabled={running || !validateRequired()}
              className="w-full mt-8 bg-primary text-white py-4 px-6 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {running ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {getToolIcon()}
                  <span>Run {tool.name}</span>
                </>
              )}
            </button>
            
            {!validateRequired() && (
              <p className="text-sm text-red-600 mt-2">
                Please fill in all required fields
              </p>
            )}
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6 text-dark">Results</h2>
              {result ? (
                renderResult()
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Run the tool to see results here</p>
                </div>
              )}
            </div>
            
            {/* Medical Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800">Medical Disclaimer</h3>
              </div>
              <p className="text-yellow-700 text-sm">
                {tool.config.medical_disclaimer}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolDetailPage;