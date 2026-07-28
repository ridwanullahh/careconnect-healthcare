import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ForumService, ForumQuestion, ForumAnswer } from '../../lib/forum';
import { ForumInteractionService } from '../../lib/forum-interactions';
import { useAuth } from '../../lib/auth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, MessageSquare, ThumbsUp, ThumbsDown, Eye, CheckCircle, User, Flag } from 'lucide-react';

const ForumPostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const [question, setQuestion] = useState<ForumQuestion | null>(null);
  const [answers, setAnswers] = useState<ForumAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState({ upvotes: 0, downvotes: 0, userVote: null as string | null });
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportMsg, setReportMsg] = useState('');

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
        // Load real vote counts.
        try {
          const vc = await ForumInteractionService.getVoteCounts(fetchedQuestion.id);
          setVoteCounts(vc);
        } catch {}
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
              <MessageSquare className="w-4 h-4 mr-1" />
              {question.answer_count}
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              {question.views}
            </div>
          </div>

          {/* Voting + Reporting */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  const res = await ForumInteractionService.vote(question.id, user.id, 'upvote');
                  setVoteCounts({ upvotes: res.upvotes, downvotes: res.downvotes, userVote: res.userVote });
                } catch (e) { console.error(e); }
              }}
              disabled={!user}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors ${voteCounts.userVote === 'upvote' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={user ? 'Upvote' : 'Login to vote'}
            >
              <ThumbsUp className="w-4 h-4" />
              {voteCounts.upvotes}
            </button>
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  const res = await ForumInteractionService.vote(question.id, user.id, 'downvote');
                  setVoteCounts({ upvotes: res.upvotes, downvotes: res.downvotes, userVote: res.userVote });
                } catch (e) { console.error(e); }
              }}
              disabled={!user}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-colors ${voteCounts.userVote === 'downvote' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'} disabled:opacity-50 disabled:cursor-not-allowed`}
              title={user ? 'Downvote' : 'Login to vote'}
            >
              <ThumbsDown className="w-4 h-4" />
              {voteCounts.downvotes}
            </button>
            <button
              onClick={() => setReporting(!reporting)}
              disabled={!user}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={user ? 'Report this post' : 'Login to report'}
            >
              <Flag className="w-4 h-4" />
              Report
            </button>
          </div>

          {reporting && user && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Report this post</h4>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg mb-2 text-sm"
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam or promotional</option>
                <option value="harassment">Harassment or hate speech</option>
                <option value="misinformation">Medical misinformation</option>
                <option value="off_topic">Off-topic</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={async () => {
                  if (!reportReason) return;
                  try {
                    await ForumInteractionService.reportPost(question.id, user.id, reportReason);
                    setReportMsg('Thank you. Your report has been submitted for review.');
                    setReporting(false);
                    setReportReason('');
                  } catch (e: any) {
                    setReportMsg(e.message || 'Failed to submit report.');
                  }
                }}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700"
              >
                Submit Report
              </button>
              {reportMsg && <p className="mt-2 text-sm text-gray-600">{reportMsg}</p>}
            </div>
          )}
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