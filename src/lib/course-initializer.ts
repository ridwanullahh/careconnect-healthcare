// Course Initialization Service
import { initializeProductionCourses } from './lms';
import { githubDB } from './database';

export class CourseInitializer {
  private static initialized = false;

  static async initializeIfNeeded(): Promise<void> {
    if (this.initialized) {
      console.log('Courses already initialized');
      return;
    }

    try {
      console.log('Checking if courses need initialization...');
      
      // Check if courses already exist
      const existingCourses = await githubDB.find('courses', {});
      
      if (existingCourses.length === 0) {
        console.log('No courses found, initializing production courses...');
        await initializeProductionCourses();
        this.initialized = true;
        console.log('✅ Production courses initialized successfully');
      } else {
        console.log(`Found ${existingCourses.length} existing courses, skipping initialization`);
        this.initialized = true;
      }
    } catch (error) {
      console.error('❌ Error during course initialization:', error);
      throw error;
    }
  }

  static async forceReinitialize(): Promise<void> {
    try {
      console.log('Force reinitializing courses...');
      
      // Clear existing courses
      const existingCourses = await githubDB.find('courses', {});
      for (const course of existingCourses) {
        await githubDB.delete('courses', course.id);
      }
      
      // Clear existing modules and lessons
      const existingModules = await githubDB.find('course_modules', {});
      for (const module of existingModules) {
        await githubDB.delete('course_modules', module.id);
      }
      
      const existingLessons = await githubDB.find('course_lessons', {});
      for (const lesson of existingLessons) {
        await githubDB.delete('course_lessons', lesson.id);
      }
      
      // Initialize fresh courses
      await initializeProductionCourses();
      this.initialized = true;
      console.log('✅ Courses force reinitialized successfully');
    } catch (error) {
      console.error('❌ Error during force reinitialization:', error);
      throw error;
    }
  }
}

// Auto-initialize on module load
CourseInitializer.initializeIfNeeded().catch(console.error);