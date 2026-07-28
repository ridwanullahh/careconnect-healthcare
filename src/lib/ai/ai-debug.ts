// AI Debug Helper - For testing AI integration
import { geminiAI } from './gemini-service';

export const testAIIntegration = async () => {
  console.log('🧪 Testing AI Integration...');
  
  try {
    const testPrompt = 'Generate a simple JSON response with a "test" field containing "AI is working"';
    const response = await geminiAI.generateContent(testPrompt, 'default');
    
    console.log('✅ AI Response received:', response);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response);
      console.log('✅ JSON parsing successful:', parsed);
    } catch (e) {
      console.log('⚠️ Response is not JSON, but AI is responding:', response.substring(0, 100));
    }
    
    return true;
  } catch (error) {
    console.error('❌ AI Integration test failed:', error);
    return false;
  }
};

// Test care path generation specifically
export const testCarePathGeneration = async (concern: string = 'I have a headache') => {
  console.log('🧪 Testing Care Path Generation for:', concern);
  
  try {
    const { carePathService } = await import('./care-path');
    const result = await carePathService.generateCarePathCard(concern);
    
    console.log('✅ Care Path Generated:', result);
    return result;
  } catch (error) {
    console.error('❌ Care Path Generation failed:', error);
    return null;
  }
};

// Auto-run tests in development
if (import.meta.env.DEV) {
  console.log('🚀 AILab Debug Mode - Running AI tests...');
  
  // Test basic AI integration
  testAIIntegration().then(success => {
    if (success) {
      console.log('✅ AI Integration test passed');
    } else {
      console.log('❌ AI Integration test failed - using fallbacks');
    }
  });
  
  // Make test functions available globally for debugging
  (window as any).testAI = testAIIntegration;
  (window as any).testCarePath = testCarePathGeneration;
}