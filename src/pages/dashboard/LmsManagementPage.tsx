import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { LMSService } from '../../lib/lms';
import { Course } from '../../lib/lms';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const LmsManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCourses = async () => {
    if (!user?.entity_id) return;
    setIsLoading(true);
    try {
      const entityCourses = await LMSService.searchCourses({ entity_id: user.entity_id });
      setCourses(entityCourses);
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      await LMSService.deleteCourse(courseId);
      fetchCourses();
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">LMS Management</h2>
        <Link to="/courses/create" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Create New Course
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {courses.length === 0 ? (
            <p>No courses found. Create your first course!</p>
          ) : (
            courses.map(course => (
              <div key={course.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-dark">{course.title}</h3>
                  <p className="text-sm text-gray-600">
                    {course.modules_count} modules • {course.lessons_count} lessons
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/courses/edit/${course.id}`} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDeleteCourse(course.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LmsManagementPage;