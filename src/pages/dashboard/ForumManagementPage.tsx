import React, { useState, useEffect } from 'react';
import { ForumService, ForumQuestion, ForumAnswer } from '../../lib/forum';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { CheckCircle, XCircle, MessageSquare, Users, Eye, Star, AlertTriangle } from 'lucide-react';

const ForumManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ForumQuestion[]>([]);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'answers'>('questions');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [answerFilter, setAnswerFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  useEffect(() => {
    loadData();
  }, [activeTab, questionFilter, answerFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'questions') {
        let fetchedQuestions: ForumQuestion[];
        switch (questionFilter) {
          case 'pending':
            fetchedQuestions = await ForumService.getAllQuestions({ status: 'pending_approval' });
            break;
          case 'approved':
            fetchedQuestions = await ForumService.getAllQuestions({ status: 'approved' });
            break;
          default:
            fetchedQuestions = await ForumService.getAllQuestions();
        }
        setQuestions(fetchedQuestions);
      } else {
        let fetchedAnswers: ForumAnswer[];
        switch (answerFilter) {
          case 'pending':
            fetchedAnswers = await ForumService.getAllAnswers({ status: 'pending_approval' });
            break;
          case 'approved':
            fetchedAnswers = await ForumService.getAllAnswers({ status: 'approved' });
            break;
          default:
            fetchedAnswers = await ForumService.getAllAnswers();
        }
        setAnswers(fetchedAnswers);
      }
    } catch (error) {
      console.error('Failed to load forum data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId: string) => {
    try {
      await ForumService.approveQuestion(questionId, 'Approved by admin');
      await loadData();
    } catch (error) {
      console.error('Failed to approve question:', error);
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await ForumService.rejectQuestion(questionId, reason);
      await loadData();
    } catch (error) {
      console.error('Failed to reject question:', error);
    }
  };

  const handleApproveAnswer = async (answerId: string) => {
    try {
      await ForumService.approveAnswer(answerId, 'Approved by admin');
      await loadData();
    } catch (error) {
      console.error('Failed to approve answer:', error);
    }
  };

  const handleRejectAnswer = async (answerId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await ForumService.rejectAnswer(answerId, reason);
      await loadData();
    } catch (error) {
      console.error('Failed to reject answer:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAuthorTypeColor = (type: string) => {
    switch (type) {
      case 'practitioner': return 'bg-blue-100 text-blue-800';
      case 'health_center': return 'bg-purple-100 text-purple-800';
      case 'super_admin': return 'bg-indigo-100 text-indigo-800';
      case 'anonymous': return 'bg-gray-100 text-gray-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forum Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Moderate Q&A forum questions and answers</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Pending Questions</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                {questions.filter(q => q.status === 'pending_approval').length}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="font-medium">Pending Answers</span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                {answers.filter(a => a.status === 'pending_approval').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'questions', label: 'Questions', icon: MessageSquare },
              { key: 'answers', label: 'Answers', icon: Users },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <>
          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'pending', label: 'Pending Approval' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'all', label: 'All Questions' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setQuestionFilter(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      questionFilter === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Questions List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map((question) => (
                <div key={question.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {question.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(question.priority)}`}>
                          {question.priority}
                        </span>
                        {question.featured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1" />
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {question.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {question.views} views
                        </span>
                        <span>{question.answer_count} answers</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAuthorTypeColor(question.author_type || 'public_user')}`}>
                          {question.is_anonymous ? 'Anonymous' : question.author_name}
                        </span>
                        <span className="text-xs">{new Date(question.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {question.tags.map((tag, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.status === 'approved' ? 'bg-green-100 text-green-800' :
                        question.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.status}
                      </span>
                      {question.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveQuestion(question.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 p-1"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectQuestion(question.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 p-1"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {question.admin_notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Admin Notes:</strong> {question.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Answers Tab */}
      {activeTab === 'answers' && (
        <>
          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: 'pending', label: 'Pending Approval' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'all', label: 'All Answers' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAnswerFilter(tab.key as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      answerFilter === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Answers List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold">Answers ({answers.length})</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {answers.map((answer) => (
                <div key={answer.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAuthorTypeColor(answer.author_type)}`}>
                          {answer.author_name}
                        </span>
                        {answer.author_credentials && (
                          <span className="text-sm text-gray-500">
                            {answer.author_credentials}
                          </span>
                        )}
                        {answer.is_accepted && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Accepted
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {answer.content.substring(0, 300)}...
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{answer.likes} likes</span>
                        <span className="text-xs">{new Date(answer.created_at).toLocaleDateString()}</span>
                      </div>
                      {answer.author_specialties && answer.author_specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {answer.author_specialties.map((specialty, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        answer.status === 'approved' ? 'bg-green-100 text-green-800' :
                        answer.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {answer.status}
                      </span>
                      {answer.status === 'pending_approval' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveAnswer(answer.id)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 p-1"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleRejectAnswer(answer.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 p-1"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {answer.admin_notes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Admin Notes:</strong> {answer.admin_notes}
                      </p>
                    </div>
                  )}
                  {answer.references && answer.references.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">References:</p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                        {answer.references.map((ref, index) => (
                          <li key={index}>{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ForumManagementPage;