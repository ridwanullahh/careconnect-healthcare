import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { HealthcareEntity, getEntity } from '../../lib/entities';
import { Course, LMSService } from '../../lib/lms';
import { BlogPost, BlogService } from '../../lib/blog';
import { Product, ECommerceService } from '../../lib/ecommerce';
import { Cause, CrowdfundingService } from '../../lib/crowdfunding';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const EntityDetailPage = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const [entity, setEntity] = useState<HealthcareEntity | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [causes, setCauses] = useState<Cause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEntity = async () => {
      if (!entityId) {
        setError('Entity ID not provided');
        setLoading(false);
        return;
      }

      try {
        const entityData = await getEntity(entityId);
        setEntity(entityData);

        if (entityData) {
          const [entityCourses, entityBlogPosts, entityProducts, entityCauses] = await Promise.all([
            LMSService.searchCourses({ entity_id: entityId }),
            BlogService.getPosts({ query: '', category: '', tag: '', sortBy: 'newest' }),
            ECommerceService.searchProducts({ entity_id: entityId }),
            CrowdfundingService.searchCauses({ entity_id: entityId })
          ]);
          setCourses(entityCourses.filter(c => c.entity_id === entityId));
          setBlogPosts(entityBlogPosts.filter(p => p.entityId === entityId));
          setProducts(entityProducts);
          setCauses(entityCauses.filter(c => c.entity_id === entityId));
        }
      } catch (err) {
        setError('Failed to load entity details');
        console.error('Error loading entity:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntity();
  }, [entityId]);

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
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Entity Not Found</h2>
          <p className="text-gray-600">The requested entity could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-6">
          <h1 className="text-3xl font-bold mb-2">{entity.name}</h1>
          <p className="text-lg opacity-90">{entity.entity_type.replace('_', ' ').toUpperCase()}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-dark">Basic Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <span className="ml-2 text-gray-600">{entity.email}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>
                  <span className="ml-2 text-gray-600">{entity.phone || 'Not provided'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Address:</span>
                  <span className="ml-2 text-gray-600">
                    {entity.address 
                      ? `${entity.address?.street || ''}, ${entity.address?.city || ''}, ${entity.address?.state || ''} ${entity.address?.postal_code || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'Not provided'
                      : 'Not provided'
                    }
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Verification Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    entity.verification_status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : entity.verification_status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {entity.verification_status}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-dark">About</h2>
              <p className="text-gray-600 leading-relaxed">
                {entity.description || 'No description available.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              Book Appointment
            </button>
            <button className="bg-accent text-dark px-6 py-2 rounded-lg hover:bg-accent/90 transition-colors">
              View Services
            </button>
            <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Contact
            </button>
          </div>

          {/* Courses Section */}
          {courses.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-dark">Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map(course => (
                  <div key={course.id} className="bg-light p-4 rounded-lg">
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-600">{course.short_description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blog Section */}
          {blogPosts.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-dark">Blog Posts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogPosts.map(post => (
                  <div key={post.id} className="bg-light p-4 rounded-lg">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-gray-600">{post.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shop Section */}
          {products.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-dark">Shop</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <div key={product.id} className="bg-light p-4 rounded-lg">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-gray-600">${product.price}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Causes Section */}
          {causes.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-dark">Causes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {causes.map(cause => (
                  <div key={cause.id} className="bg-light p-4 rounded-lg">
                    <h3 className="font-semibold">{cause.title}</h3>
                    <p className="text-sm text-gray-600">Goal: ${cause.goal_amount}</p>
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

export default EntityDetailPage;