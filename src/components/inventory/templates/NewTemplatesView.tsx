import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ShoppingCart, Package, AlertCircle, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductTemplate, useProductTemplates } from '../../../hooks/useProductTemplates';

interface NewTemplatesViewProps {
  selectedTemplates: ProductTemplate[];
  onTemplateSelect: (template: ProductTemplate) => void;
}

const NewTemplatesView: React.FC<NewTemplatesViewProps> = ({
  selectedTemplates,
  onTemplateSelect
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const {
    templates,
    loading,
    error,
    categories,
    isOnline
  } = useProductTemplates();

  const isSelected = (template: ProductTemplate) => 
    selectedTemplates.some(t => t.id === template.id);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    if (!Array.isArray(templates)) return [];
    
    let filtered = templates;

    // Filter by search term
    if (localSearchTerm.trim()) {
      const searchLower = localSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    return filtered;
  }, [templates, localSearchTerm, selectedCategory]);

  const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik03NS41IDExNS41SDE0MS41VjE2NS41SDc1LjVWMTE1LjVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik05NS41IDc1LjVIMTIxLjVWMTE1LjVIOTUuNVY3NS41WiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';

  // Highlight matching text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const regex = new RegExp(`(${search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filter Controls */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-background">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {!isOnline && (
          <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            ⚡ Offline mode - Showing cached templates
          </div>
        )}
      </div>

      {/* Templates Grid - Native scrollable container */}
      <div 
        className="flex-1 overflow-auto p-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'manipulation',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 20 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg aspect-square mb-2"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-4 mb-1"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded h-3 w-2/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Failed to load templates
              </h3>
              <p className="text-gray-500 dark:text-gray-400">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTemplates.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {localSearchTerm ? 'No templates found' : 'No templates available'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {localSearchTerm 
                  ? 'Try adjusting your search or category filter' 
                  : 'Templates will appear here when available'
                }
              </p>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredTemplates.map((template) => {
              if (!template || !template.id) return null;
              
              const selected = isSelected(template);
              
              return (
                <div
                  key={template.id}
                  className={cn(
                    "group relative bg-card rounded-lg border-2 transition-all duration-200 hover:shadow-lg cursor-pointer",
                    selected 
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md scale-105" 
                      : "border-border hover:border-purple-300 hover:scale-102"
                  )}
                  onClick={() => onTemplateSelect(template)}
                >
                  {/* Selection Indicator */}
                  {selected && (
                    <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="aspect-square rounded-t-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={template.image_url || fallbackImage}
                      alt={template.name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = fallbackImage;
                      }}
                    />
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
                      {highlightText(template.name, localSearchTerm)}
                    </h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {highlightText(template.category || 'General', localSearchTerm)}
                    </p>
                  </div>

                  {/* Action Button Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <Button
                      size="sm"
                      variant={selected ? "secondary" : "default"}
                      className={cn(
                        "shadow-lg transition-all duration-200",
                        selected 
                          ? "bg-white text-purple-600 hover:bg-gray-100 scale-110" 
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      )}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NewTemplatesView;