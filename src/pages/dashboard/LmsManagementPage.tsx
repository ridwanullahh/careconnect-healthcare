import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToastService } from '../../lib/toast-service';
import { useNavigate } from 'react-router-dom';
import {
  Course,
  LMSService,
  CourseStatus,
  CourseEnrollment,
  EnrollmentStatus,
} from '../../lib/lms';
import { useAuth } from '../../lib/auth';
import { githubDB as dbHelpers, collections } from '../../lib/database';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog';
import {
  Users,
  BarChart3,
  Library,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  Pencil,
  Save,
  X as XIcon,
  AlertCircle,
} from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface CourseModuleLite {
  id: string;
  course_id: string;
  title: string;
  order: number;
  is_locked: boolean;
}

interface CourseLessonLite {
  id: string;
  module_id: string;
  title: string;
  type: string;
  order: number;
  estimated_duration: number;
}

interface CourseWithStats extends Course {
  modules_actual_count?: number;
  lessons_actual_count?: number;
  quizzes_actual_count?: number;
}

type TabId = 'courses' | 'students' | 'analytics' | 'content';

const LmsManagementPage: React.FC = () => {
  const toast = useToastService();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('courses');

  // Students tab state
  const [studentCourseId, setStudentCourseId] = useState<string>('');
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});

  // Analytics tab state
  const [analytics, setAnalytics] = useState<{
    totalCourses: number;
    publishedCourses: number;
    draftCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    activeEnrollments: number;
    completionRate: number;
    averageProgress: number;
    mostPopularCourse: { title: string; enrollments: number } | null;
    courseBreakdown: Array<{ id: string; title: string; enrollments: number; completions: number; completionRate: number }>;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Content library tab state
  const [contentData, setContentData] = useState<
    Array<{
      course: CourseWithStats;
      modules: Array<{
        module: CourseModuleLite;
        lessons: CourseLessonLite[];
      }>;
    }>
  >([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; status: CourseStatus }>({
    title: '',
    status: CourseStatus.DRAFT,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // ---- Initial load ----
  const loadCourses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const filter = currentUser?.entity_id ? { entity_id: currentUser.entity_id } : {};
      const data = await dbHelpers.find<CourseWithStats>(collections.courses, filter);
      setCourses(data);
      if (data.length > 0 && !studentCourseId) {
        setStudentCourseId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
      setLoadError('Failed to load courses. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, studentCourseId]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    loadCourses();
  }, [isAuthenticated, currentUser, loadCourses, navigate]);

  // ---- Students tab ----
  const loadEnrollments = useCallback(async () => {
    if (!studentCourseId) {
      setEnrollments([]);
      return;
    }
    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      const rows = await dbHelpers.find<CourseEnrollment>(collections.course_enrollments, {
        course_id: studentCourseId,
      });
      setEnrollments(rows);

      // Hydrate profile names for each enrollment.user_id
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      const profileEntries: Record<string, Profile> = {};
      for (const uid of userIds) {
        try {
          const profiles = await dbHelpers.find<Profile>(collections.profiles, { user_id: uid });
          if (profiles.length > 0) {
            profileEntries[uid] = profiles[0];
          }
        } catch {
          // ignore individual profile fetch errors
        }
      }
      setProfileMap(profileEntries);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      setEnrollmentsError('Failed to load student enrollments.');
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [studentCourseId]);

  useEffect(() => {
    if (activeTab === 'students') {
      loadEnrollments();
    }
  }, [activeTab, loadEnrollments]);

  // ---- Analytics tab ----
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const filter = currentUser?.entity_id ? { entity_id: currentUser.entity_id } : {};
      const allCourses = await dbHelpers.find<Course>(collections.courses, filter);
      const courseIds = allCourses.map((c) => c.id);

      // Fetch all enrollments for these courses
      const allEnrollments: CourseEnrollment[] = [];
      if (courseIds.length > 0) {
        // dbHelpers.find filters by exact equality of one field; iterate per course
        for (const cid of courseIds) {
          const rows = await dbHelpers.find<CourseEnrollment>(collections.course_enrollments, {
            course_id: cid,
          });
          allEnrollments.push(...rows);
        }
      }

      const totalCourses = allCourses.length;
      const publishedCourses = allCourses.filter((c) => c.status === CourseStatus.PUBLISHED).length;
      const draftCourses = allCourses.filter((c) => c.status === CourseStatus.DRAFT).length;
      const totalEnrollments = allEnrollments.length;
      const completedEnrollments = allEnrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length;
      const activeEnrollments = allEnrollments.filter(
        (e) => e.status === EnrollmentStatus.ACTIVE,
      ).length;
      const completionRate =
        totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;
      const averageProgress =
        totalEnrollments > 0
          ? Math.round(
              allEnrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) /
                totalEnrollments,
            )
          : 0;

      // Most popular course by enrollment count
      const countsByCourse: Record<string, number> = {};
      for (const e of allEnrollments) {
        countsByCourse[e.course_id] = (countsByCourse[e.course_id] || 0) + 1;
      }
      let mostPopularCourse: { title: string; enrollments: number } | null = null;
      for (const c of allCourses) {
        const count = countsByCourse[c.id] || 0;
        if (!mostPopularCourse || count > mostPopularCourse.enrollments) {
          mostPopularCourse = { title: c.title, enrollments: count };
        }
      }
      // If no enrollments at all, do not show a misleading "most popular"
      if (totalEnrollments === 0) mostPopularCourse = null;

      const courseBreakdown = allCourses.map((c) => {
        const courseEnrolls = allEnrollments.filter((e) => e.course_id === c.id);
        const completions = courseEnrolls.filter(
          (e) => e.status === EnrollmentStatus.COMPLETED,
        ).length;
        return {
          id: c.id,
          title: c.title,
          enrollments: courseEnrolls.length,
          completions,
          completionRate:
            courseEnrolls.length > 0
              ? Math.round((completions / courseEnrolls.length) * 100)
              : 0,
        };
      });

      setAnalytics({
        totalCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        completedEnrollments,
        activeEnrollments,
        completionRate,
        averageProgress,
        mostPopularCourse,
        courseBreakdown,
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setAnalyticsError('Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab, loadAnalytics]);

  // ---- Content library tab ----
  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const filter = currentUser?.entity_id ? { entity_id: currentUser.entity_id } : {};
      const allCourses = await dbHelpers.find<CourseWithStats>(collections.courses, filter);

      const enriched: Array<{
        course: CourseWithStats;
        modules: Array<{ module: CourseModuleLite; lessons: CourseLessonLite[] }>;
      }> = [];

      for (const course of allCourses) {
        const modules = await dbHelpers.find<CourseModuleLite>(collections.course_modules, {
          course_id: course.id,
        });
        modules.sort((a, b) => (a.order || 0) - (b.order || 0));

        const moduleEntries: Array<{ module: CourseModuleLite; lessons: CourseLessonLite[] }> = [];
        let lessonCount = 0;
        let quizCount = 0;
        for (const m of modules) {
          const lessons = await dbHelpers.find<CourseLessonLite>(collections.course_lessons, {
            module_id: m.id,
          });
          lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
          lessonCount += lessons.length;
          quizCount += lessons.filter((l) => l.type === 'quiz').length;
          moduleEntries.push({ module: m, lessons });
        }

        enriched.push({
          course: {
            ...course,
            modules_actual_count: modules.length,
            lessons_actual_count: lessonCount,
            quizzes_actual_count: quizCount,
          },
          modules: moduleEntries,
        });
      }

      setContentData(enriched);
    } catch (err) {
      console.error('Error loading content library:', err);
      setContentError('Failed to load content library.');
    } finally {
      setContentLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'content') {
      loadContent();
    }
  }, [activeTab, loadContent]);

  // ---- Course actions ----
  const handleCreateCourse = () => {
    navigate('/courses/create');
  };

  const handleEditCourse = (course: Course) => {
    navigate(`/courses/${course.id}`);
  };

  const handleViewCourse = (course: Course) => {
    navigate(`/courses/${course.id}`);
  };

  const handlePublishCourse = async (courseId: string) => {
    try {
      await LMSService.publishCourse(courseId);
      await loadCourses();
      toast.showSuccess('Course published successfully');
    } catch (err) {
      console.error('Error publishing course:', err);
      toast.showError('Failed to publish course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? This cannot be undone.')) {
      return;
    }
    try {
      await LMSService.deleteCourse(courseId);
      await loadCourses();
      toast.showSuccess('Course deleted successfully');
    } catch (err) {
      console.error('Error deleting course:', err);
      toast.showError('Failed to delete course');
    }
  };

  // ---- Content library edit dialog ----
  const openEditDialog = (course: CourseWithStats) => {
    setEditingCourseId(course.id);
    setEditForm({ title: course.title, status: course.status });
  };

  const closeEditDialog = () => {
    setEditingCourseId(null);
    setEditForm({ title: '', status: CourseStatus.DRAFT });
    setSavingEdit(false);
  };

  const handleSaveEdit = async () => {
    if (!editingCourseId) return;
    if (!editForm.title.trim()) {
      toast.showError('Course title cannot be empty');
      return;
    }
    setSavingEdit(true);
    try {
      await dbHelpers.update(collections.courses, editingCourseId, {
        title: editForm.title.trim(),
        status: editForm.status,
        updated_at: new Date().toISOString(),
      });
      toast.showSuccess('Course updated successfully');
      closeEditDialog();
      await loadContent();
      await loadCourses();
    } catch (err) {
      console.error('Error updating course:', err);
      toast.showError('Failed to update course');
      setSavingEdit(false);
    }
  };

  // ---- UI helpers ----
  const getStatusBadge = (status: CourseStatus) => {
    const map: Record<CourseStatus, { className: string; label: string }> = {
      [CourseStatus.DRAFT]: {
        className: 'bg-slate-100 text-slate-700 border border-slate-200',
        label: 'Draft',
      },
      [CourseStatus.UNDER_REVIEW]: {
        className: 'bg-amber-100 text-amber-800 border border-amber-200',
        label: 'Under Review',
      },
      [CourseStatus.PUBLISHED]: {
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        label: 'Published',
      },
      [CourseStatus.ARCHIVED]: {
        className: 'bg-rose-100 text-rose-800 border border-rose-200',
        label: 'Archived',
      },
    };
    const cfg = map[status] || map[CourseStatus.DRAFT];
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  const getEnrollmentStatusBadge = (status: EnrollmentStatus) => {
    const map: Record<EnrollmentStatus, { className: string; label: string }> = {
      [EnrollmentStatus.ACTIVE]: {
        className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        label: 'Active',
      },
      [EnrollmentStatus.COMPLETED]: {
        className: 'bg-teal-100 text-teal-800 border border-teal-200',
        label: 'Completed',
      },
      [EnrollmentStatus.DROPPED]: {
        className: 'bg-rose-100 text-rose-800 border border-rose-200',
        label: 'Dropped',
      },
      [EnrollmentStatus.SUSPENDED]: {
        className: 'bg-amber-100 text-amber-800 border border-amber-200',
        label: 'Suspended',
      },
    };
    const cfg = map[status] || map[EnrollmentStatus.ACTIVE];
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
        {cfg.label}
      </span>
    );
  };

  const selectedCourseForStudents = useMemo(
    () => courses.find((c) => c.id === studentCourseId) || null,
    [courses, studentCourseId],
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading LMS dashboard..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-slate-700 mb-4">{loadError}</p>
            <Button onClick={loadCourses}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string; count?: number; icon: React.ReactNode }> = [
    { id: 'courses', label: 'Courses', count: courses.length, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'students', label: 'Students', icon: <Users className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'content', label: 'Content Library', icon: <Library className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">LMS Management</h1>
          <p className="text-slate-600 mt-2">
            Manage your courses, students, and learning content
          </p>
        </div>
        <Button onClick={handleCreateCourse}>Create New Course</Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8">
        <nav className="flex flex-wrap space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* =================== Courses Tab =================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-100">
                  <BookOpen className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Courses</p>
                  <p className="text-2xl font-semibold text-slate-900">{courses.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-100">
                  <CheckCircle2 className="w-6 h-6 text-teal-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Published</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {courses.filter((c) => c.status === CourseStatus.PUBLISHED).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Draft</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {courses.filter((c) => c.status === CourseStatus.DRAFT).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-full bg-slate-100">
                  <Users className="w-6 h-6 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Students</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {courses.reduce((sum, course) => sum + (course.enrolled_count || 0), 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Courses Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Course Management</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {courses.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                  No courses found. Click "Create New Course" to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {courses.map((course) => (
                        <tr key={course.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-slate-900">
                                  {course.title}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {course.category} • {course.level}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(course.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {course.enrolled_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {course.is_free
                              ? 'Free'
                              : `$${((course.price || 0) * (course.enrolled_count || 0)).toLocaleString()}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => handleViewCourse(course)}
                                className="text-emerald-700 hover:text-emerald-900"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleEditCourse(course)}
                                className="text-teal-700 hover:text-teal-900"
                              >
                                Edit
                              </button>
                              {course.status === CourseStatus.DRAFT && (
                                <button
                                  onClick={() => handlePublishCourse(course.id)}
                                  className="text-emerald-700 hover:text-emerald-900"
                                >
                                  Publish
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteCourse(course.id)}
                                className="text-rose-600 hover:text-rose-900"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =================== Students Tab =================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Student Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-w-md mb-4">
                <Label htmlFor="student-course-select">Filter by course</Label>
                <Select value={studentCourseId} onValueChange={setStudentCourseId}>
                  <SelectTrigger id="student-course-select">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {enrollmentsLoading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner text="Loading enrollments..." />
                </div>
              ) : enrollmentsError ? (
                <div className="p-6 text-center text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>{enrollmentsError}</p>
                  <Button variant="outline" className="mt-3" onClick={loadEnrollments}>
                    Retry
                  </Button>
                </div>
              ) : !studentCourseId ? (
                <div className="p-10 text-center text-slate-500">
                  Select a course above to view enrolled students.
                </div>
              ) : enrollments.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                  No students are currently enrolled in
                  {selectedCourseForStudents ? (
                    <span className="font-medium text-slate-700">
                      {' '}
                      "{selectedCourseForStudents.title}"
                    </span>
                  ) : (
                    ' this course'
                  )}
                  .
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Course
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Enrolled
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Completed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {enrollments.map((enr) => {
                        const profile = profileMap[enr.user_id];
                        const studentName = profile
                          ? `${profile.first_name} ${profile.last_name}`.trim()
                          : `User #${enr.user_id}`;
                        const progress = Math.round(enr.progress_percentage || 0);
                        const course = courses.find((c) => c.id === enr.course_id);
                        return (
                          <tr key={enr.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-medium">
                                  {studentName.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-sm font-medium text-slate-900">
                                  {studentName}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {course?.title || `Course #${enr.course_id}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 min-w-[140px]">
                                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-slate-700 w-9 text-right">
                                  {progress}%
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getEnrollmentStatusBadge(enr.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {enr.enrolled_at
                                ? new Date(enr.enrolled_at).toLocaleDateString()
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                              {enr.completed_at
                                ? new Date(enr.completed_at).toLocaleDateString()
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =================== Analytics Tab =================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <Card>
              <CardContent className="p-10 flex justify-center">
                <LoadingSpinner text="Computing analytics..." />
              </CardContent>
            </Card>
          ) : analyticsError ? (
            <Card>
              <CardContent className="p-6 text-center text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{analyticsError}</p>
                <Button variant="outline" className="mt-3" onClick={loadAnalytics}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-600">Total Courses</p>
                      <BookOpen className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{analytics.totalCourses}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {analytics.publishedCourses} published • {analytics.draftCourses} draft
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-600">Total Enrollments</p>
                      <Users className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {analytics.totalEnrollments}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {analytics.activeEnrollments} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-600">Completion Rate</p>
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                      {analytics.completionRate}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {analytics.completedEnrollments} of {analytics.totalEnrollments} completed
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-600">Avg. Progress</p>
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    <p className="text-3xl font-bold text-slate-900">{analytics.averageProgress}%</p>
                    <p className="text-xs text-slate-500 mt-1">Across all enrollments</p>
                  </CardContent>
                </Card>
              </div>

              {analytics.mostPopularCourse && (
                <Card>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-emerald-100">
                      <Award className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Most Popular Course
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {analytics.mostPopularCourse.title}
                      </p>
                      <p className="text-sm text-slate-600">
                        {analytics.mostPopularCourse.enrollments} enrollment
                        {analytics.mostPopularCourse.enrollments === 1 ? '' : 's'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Per-Course Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {analytics.courseBreakdown.length === 0 ? (
                    <div className="p-10 text-center text-slate-500">
                      No course data available yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Course
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Enrollments
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Completions
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              Completion Rate
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {analytics.courseBreakdown.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {row.title}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {row.enrollments}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                {row.completions}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-700">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="bg-emerald-500 h-2 rounded-full"
                                      style={{ width: `${row.completionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-slate-700">
                                    {row.completionRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* =================== Content Library Tab =================== */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {contentLoading ? (
            <Card>
              <CardContent className="p-10 flex justify-center">
                <LoadingSpinner text="Loading content library..." />
              </CardContent>
            </Card>
          ) : contentError ? (
            <Card>
              <CardContent className="p-6 text-center text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>{contentError}</p>
                <Button variant="outline" className="mt-3" onClick={loadContent}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : contentData.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-slate-500">
                <Library className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                No content available. Create a course to get started.
              </CardContent>
            </Card>
          ) : (
            contentData.map(({ course, modules }) => (
              <Card key={course.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        {getStatusBadge(course.status)}
                      </div>
                      <p className="text-sm text-slate-600">
                        {course.category} • {course.level}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                        <Badge variant="secondary">
                          {modules.length} module{modules.length === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant="secondary">
                          {course.lessons_actual_count || 0} lesson
                          {(course.lessons_actual_count || 0) === 1 ? '' : 's'}
                        </Badge>
                        <Badge variant="secondary">
                          {course.quizzes_actual_count || 0} quiz
                          {(course.quizzes_actual_count || 0) === 1 ? '' : 'zes'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(course)}
                      className="flex items-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {modules.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No modules have been added to this course yet.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-track]:bg-slate-100">
                      {modules.map(({ module, lessons }) => (
                        <div
                          key={module.id}
                          className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-800 text-sm">
                              Module {module.order || 0}: {module.title}
                            </h4>
                            <span className="text-xs text-slate-500">
                              {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          {lessons.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">
                              No lessons in this module.
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {lessons.map((lesson) => (
                                <li
                                  key={lesson.id}
                                  className="flex items-center gap-2 text-sm text-slate-700"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                  <span className="flex-1">{lesson.title}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-xs capitalize border-slate-300 text-slate-600"
                                  >
                                    {lesson.type}
                                  </Badge>
                                  <span className="text-xs text-slate-500 w-20 text-right">
                                    {lesson.estimated_duration || 0} min
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Dialog (Content Library) */}
      <Dialog open={editingCourseId !== null} onOpenChange={(o) => !o && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Course Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Enter course title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as CourseStatus }))}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CourseStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={CourseStatus.UNDER_REVIEW}>Under Review</SelectItem>
                  <SelectItem value={CourseStatus.PUBLISHED}>Published</SelectItem>
                  <SelectItem value={CourseStatus.ARCHIVED}>Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="flex items-center gap-1.5">
                <XIcon className="w-4 h-4" />
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="flex items-center gap-1.5">
              <Save className="w-4 h-4" />
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LmsManagementPage;
