
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, MoreVertical, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import AddProductModal from './inventory/AddProductModal';
import NewBulkAddModal from './inventory/templates/NewBulkAddModal';
import UncountableProductModal from './inventory/UncountableProductModal';
import VariationProductModal from './inventory/VariationProductModal';
import EditProductModal from './inventory/EditProductModal';
import DeleteProductModal from './inventory/DeleteProductModal';
import RestockModal from './inventory/RestockModal';
import { ProductMode } from './inventory/AddProductDropdown';
import InventoryFilters from './inventory/InventoryFilters';
import InventoryProductGrid from './inventory/InventoryProductGrid';
import InventoryHeader from './inventory/InventoryHeader';
import PremiumStatsCards from './inventory/PremiumStatsCards';
import { TooltipWrapper } from './TooltipWrapper';
import { Product } from '../types';
import { useUnifiedProducts } from '../hooks/useUnifiedProducts';
import { useUnifiedSyncManager } from '../hooks/useUnifiedSyncManager';

const InventoryPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [showUncountableModal, setShowUncountableModal] = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');

  const { toast } = useToast();
  const { 
    products, 
    loading, 
    error, 
    createProduct, 
    updateProduct, 
    deleteProduct,
    refetch,
    isOnline,
    pendingOperations,
    syncStatus
  } = useUnifiedProducts();
  
  const { globalSyncInProgress } = useUnifiedSyncManager();

  // Get unique categories from products
  const categories = useMemo(() => {
    const uniqueCategories = ['all', ...new Set(products.map(p => p.category))];
    return uniqueCategories;
  }, [products]);

  // Calculate inventory stats
  const { totalProducts, totalValue, lowStockCount } = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => {
      // Only count products with specified stock (exclude -1 unspecified quantities)
      if (product.currentStock === -1) return sum;
      return sum + (product.sellingPrice * product.currentStock);
    }, 0);
    const lowStockCount = products.filter(product => 
      product.currentStock !== -1 && // Exclude unspecified quantities
      product.currentStock <= (product.lowStockThreshold || 5) // Use product's threshold or default
    ).length;
    
    return { totalProducts, totalValue, lowStockCount };
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort products
    switch (sortBy) {
      case 'stock':
        filtered = filtered.sort((a, b) => b.currentStock - a.currentStock);
        break;
      case 'price':
        filtered = filtered.sort((a, b) => b.sellingPrice - a.sellingPrice);
        break;
      default: // name
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, sortBy]);

  // Handle sync completion notification
  useEffect(() => {
    const handleSyncComplete = () => {
      if (pendingOperations === 0) {
        toast({
          title: "Sync Complete",
          description: "All offline changes have been synchronized",
          duration: 3000,
        });
      }
    };

    window.addEventListener('product-synced', handleSyncComplete);
    return () => window.removeEventListener('product-synced', handleSyncComplete);
  }, [pendingOperations, toast]);

  // Handle stats card clicks for filtering
  const handleStatsCardClick = (filter: string) => {
    switch (filter) {
      case 'all':
        setSelectedCategory('all');
        setSearchTerm('');
        break;
      case 'low-stock':
        setSelectedCategory('all');
        break;
      case 'value':
        setSortBy('price');
        break;
      default:
        break;
    }
  };

  const handleAddProductMode = (mode: ProductMode) => {
    switch (mode) {
      case 'normal':
        setShowAddModal(true);
        break;
      case 'bulk':
        setShowTemplatesPanel(true);
        break;
      case 'uncountable':
        setShowUncountableModal(true);
        break;
      case 'variation':
        setShowVariationModal(true);
        break;
    }
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createProduct(productData);
      setShowAddModal(false);
      
      if (!isOnline) {
        toast({
          title: "Product Added Offline",
          description: "Product will be synced when connection is restored.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Product Added",
          description: `${productData.name} has been added to your inventory.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBulkAddProducts = async (productsData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      const results = await Promise.allSettled(
        productsData.map(productData => createProduct(productData))
      );
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      setShowTemplatesPanel(false);
      
      if (failed === 0) {
        toast({
          title: "Bulk Products Added",
          description: `${successful} products have been added to your inventory.`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Partial Success",
          description: `${successful} products added, ${failed} failed. Please check and retry failed items.`,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error in bulk add:', error);
      toast({
        title: "Error",
        description: "Failed to add products. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    console.log('[InventoryPage] Opening edit modal for product:', product.id);
    setSelectedProduct(product);
    setShowEditModal(true);
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      await updateProduct(id, productData);
      setShowEditModal(false);
      setSelectedProduct(null);
      
      if (!isOnline) {
        toast({
          title: "Product Updated Offline",
          description: "Changes will be synced when connection is restored.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Product Updated",
          description: `Product has been updated.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = (product: Product) => {
    console.log('[InventoryPage] Opening delete modal for product:', product.id);
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      await deleteProduct(selectedProduct.id);
      setShowDeleteModal(false);
      setSelectedProduct(null);
      
      toast({
        title: "Product Deleted",
        description: `${selectedProduct.name} has been removed from inventory.`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRestock = (product: Product) => {
    console.log('[InventoryPage] Opening restock modal for product:', product.id);
    setSelectedProduct(product);
    setShowRestockModal(true);
  };

  const handleRestockProduct = async (quantity: number, buyingPrice: number) => {
    if (!selectedProduct) return;

    try {
      const newStock = selectedProduct.currentStock + quantity;
      await updateProduct(selectedProduct.id, { 
        currentStock: newStock,
        costPrice: buyingPrice 
      });
      
      setShowRestockModal(false);
      setSelectedProduct(null);
      
      if (!isOnline) {
        toast({
          title: "Restock Recorded Offline",
          description: "Stock update will be synced when connection is restored.",
          duration: 3000,
        });
      } else {
        toast({
          title: "Product Restocked",
          description: `${selectedProduct.name} stock updated to ${newStock} units.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error restocking product:', error);
      toast({
        title: "Error",
        description: "Failed to restock product. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
            <Box className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error loading inventory</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <Button 
            onClick={() => refetch()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipWrapper>
      <div className="space-y-6">
        {/* Header Section with InventoryHeader */}
        <InventoryHeader
          totalProducts={totalProducts}
          totalValue={totalValue}
          lowStockCount={lowStockCount}
          onAddProduct={handleAddProductMode}
        />

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products by name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <InventoryFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        )}

        {/* Products Grid */}
        <InventoryProductGrid
          products={filteredProducts}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onRestock={handleRestock}
        />

        {/* Modals */}
        <AddProductModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddProduct}
        />

        <NewBulkAddModal
          isOpen={showTemplatesPanel}
          onClose={() => setShowTemplatesPanel(false)}
          onSave={handleBulkAddProducts}
        />

        <UncountableProductModal
          isOpen={showUncountableModal}
          onClose={() => setShowUncountableModal(false)}
          onSave={handleAddProduct}
        />

        <VariationProductModal
          isOpen={showVariationModal}
          onClose={() => setShowVariationModal(false)}
          onSave={handleBulkAddProducts}
          existingProducts={products}
        />

        <EditProductModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSave={handleUpdateProduct}
          product={selectedProduct}
        />

        <DeleteProductModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedProduct(null);
          }}
          onDelete={handleConfirmDelete}
          product={selectedProduct}
        />

        <RestockModal
          isOpen={showRestockModal}
          onClose={() => {
            setShowRestockModal(false);
            setSelectedProduct(null);
          }}
          onSave={handleRestockProduct}
          product={selectedProduct}
        />
      </div>
    </TooltipWrapper>
  );
};

export default InventoryPage;
