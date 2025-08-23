// Medical Disclaimer Component
import React from 'react';
import { AlertTriangle, Phone, ExternalLink } from 'lucide-react';

interface MedicalDisclaimerProps {
  type?: 'general' | 'ai_tool' | 'emergency' | 'calculator';
  toolName?: string;
  className?: string;
}

const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ 
  type = 'general', 
  toolName,
  className = ''
}) => {
  const getDisclaimerContent = () => {
    switch (type) {
      case 'emergency':
        return {
          title: '🚨 Emergency Medical Disclaimer',
          content: (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-red-600 font-semibold">
                <Phone className="w-4 h-4" />
                <span>For medical emergencies, call 911 immediately</span>
              </div>
              <p className="text-sm text-gray-700">
                This emergency triage tool is for educational purposes only and should not delay 
                seeking immediate medical attention. If you are experiencing a medical emergency, 
                contact emergency services right away.
              </p>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs text-red-800">
                  <strong>Call 911 if you experience:</strong> Chest pain, difficulty breathing, 
                  severe bleeding, loss of consciousness, stroke symptoms, or thoughts of self-harm.
                </p>
              </div>
            </div>
          ),
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500'
        };

      case 'ai_tool':
        return {
          title: '🤖 AI Health Tool Disclaimer',
          content: (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <strong>{toolName || 'This AI tool'}</strong> provides educational information only 
                and is not intended as medical advice, diagnosis, or treatment. The AI analysis is 
                based on patterns in data and may not account for your unique medical history.
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                <li>Always consult qualified healthcare professionals for medical decisions</li>
                <li>Do not rely solely on AI recommendations for health concerns</li>
                <li>Seek immediate medical attention for urgent symptoms</li>
              </ul>
            </div>
          ),
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500'
        };

      case 'calculator':
        return {
          title: '📊 Health Calculator Disclaimer',
          content: (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <strong>{toolName || 'This calculator'}</strong> provides estimates based on 
                standard formulas and should not replace professional medical assessment.
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                <li>Results may not apply to all individuals or medical conditions</li>
                <li>Consult healthcare providers for personalized health guidance</li>
                <li>Individual health needs vary significantly</li>
              </ul>
            </div>
          ),
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-500'
        };

      default:
        return {
          title: '⚕️ Medical Information Disclaimer',
          content: (
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                The information provided on CareConnect is for educational and informational 
                purposes only and is not intended as medical advice.
              </p>
              <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                <li>Always consult qualified healthcare professionals for medical advice</li>
                <li>This platform does not provide diagnosis or treatment recommendations</li>
                <li>Individual health needs require personalized medical care</li>
              </ul>
            </div>
          ),
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500'
        };
    }
  };

  const disclaimer = getDisclaimerContent();

  return (
    <div className={`${disclaimer.bgColor} ${disclaimer.borderColor} border rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertTriangle className={`w-5 h-5 ${disclaimer.iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            {disclaimer.title}
          </h4>
          {disclaimer.content}
          
          {/* Emergency Contacts for Emergency Type */}
          {type === 'emergency' && (
            <div className="mt-4 p-3 bg-white rounded border">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Emergency Contacts</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <strong>Emergency:</strong><br />
                  <a href="tel:911" className="text-red-600 hover:underline flex items-center">
                    911 <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div>
                  <strong>Crisis Text Line:</strong><br />
                  <a href="sms:741741" className="text-blue-600 hover:underline flex items-center">
                    Text HOME to 741741 <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div>
                  <strong>Poison Control:</strong><br />
                  <a href="tel:1-800-222-1222" className="text-green-600 hover:underline flex items-center">
                    1-800-222-1222 <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          )}
          
          {/* Professional Help Resources */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need to find healthcare providers? Use our{' '}
              <a href="/directory" className="text-primary hover:underline">
                Healthcare Directory
              </a>
              {' '}to locate verified professionals in your area.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;