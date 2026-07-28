import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ForumService, ForumQuestion, ForumAnswer } from '../../lib/forum';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, MessageSquare, ThumbsUp, Eye, CheckCircle, User } from 'lucide-react';

const ForumPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const [question, setQuestion] = useState<ForumQuestion | null>(null);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      loadPost(postId);
    }
  }, [postId]);

  const loadPost = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedQuestion = await ForumService.getQuestion(id);
      if (fetchedQuestion) {
        setQuestion(fetchedQuestion);
        const fetchedAnswers = await ForumService.getAnswers(fetchedQuestion.id);
        setAnswers(fetchedAnswers);
      } else {
        setError('Post not found.');
      }
    } catch (err) {
      setError('Failed to load post details.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light text-center px-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">{error}</h2>
        <Link to="/community" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Back to Community
        </Link>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="bg-light py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/community" className="inline-flex items-center text-primary mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Community
        </Link>
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-dark mb-4">{question.title}</h1>
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              <span>{question.is_anonymous ? 'Anonymous' : question.author_name}</span>
            </div>
            <span>{new Date(question.created_at).toLocaleDateString()}</span>
            <div className="flex items-center">
              <ThumbsUp className="w-4 h-4 mr-1" />
              {question.likes}
            </div>
            <div className="flex items-center">
              <MessageSquare className="w-4 h-4 mr-1" />
              {question.answer_count}
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {question.views}
            </div>
          </div>
          <div className="prose max-w-none text-gray-800 mb-8">{question.content}</div>

          {/* Answers */}
          {answers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Answers</h2>
              <div className="space-y-4">
                {answers.map((ans) => (
                  <div key={ans.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{ans.author_name}</span>
                        {ans.is_accepted && (
                          <span className="inline-flex items-center text-green-700 gap-1"><CheckCircle className="w-4 h-4" /> Accepted</span>
                        )}
                      </div>
                      <span>{new Date(ans.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-gray-800 whitespace-pre-line">{ans.content}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPostPage;