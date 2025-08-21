import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { ECommerceService } from '../../lib/ecommerce';
import { Product } from '../../lib/ecommerce';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ShopManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    if (!user?.entity_id) return;
    setIsLoading(true);
    try {
      const entityProducts = await ECommerceService.searchProducts({ entity_id: user.entity_id });
      setProducts(entityProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await ECommerceService.deleteProduct(productId);
      fetchProducts();
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-dark">Shop Management</h2>
        <Link to="/shop/create" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Add New Product
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-4">
          {products.length === 0 ? (
            <p>No products found. Add your first product!</p>
          ) : (
            products.map(product => (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-dark">{product.name}</h3>
                  <p className="text-sm text-gray-600">
                    Price: ${product.price}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/shop/edit/${product.id}`} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDeleteProduct(product.id)} className="border border-red-300 text-red-700 px-3 py-1 rounded text-sm hover:bg-red-50 transition-colors">
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

export default ShopManagementPage;