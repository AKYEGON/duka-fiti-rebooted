import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, Package, RotateCcw, Download, X, Grid, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Product } from '../../../types';
import { useProductTemplates, ProductTemplate } from '../../../hooks/useProductTemplates';
import { createPortal } from 'react-dom';

// Import the new focused components
import NewSpreadsheetView from './NewSpreadsheetView';
import NewTemplatesView from './NewTemplatesView';

interface BulkProductRow {
  id: string;
  name: string;
  category: string;
  costPrice: number | '';
  sellingPrice: number | '';
  currentStock: number | '';
  lowStockThreshold: number | '';
  isValid: boolean;
  errors: string[];
}

interface NewBulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

const NewBulkAddModal: React.FC<NewBulkAddModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'templates'>('spreadsheet');
  const [selectedTemplates, setSelectedTemplates] = useState<ProductTemplate[]>([]);
  const [spreadsheetData, setSpreadsheetData] = useState<BulkProductRow[]>([]);
  
  const { toast } = useToast();

  // Initialize empty spreadsheet data
  useEffect(() => {
    if (isOpen && spreadsheetData.length === 0) {
      const initialData: BulkProductRow[] = Array.from({ length: 20 }, (_, index) => ({
        id: `row_${index}`,
        name: '',
        category: '',
        costPrice: '',
        sellingPrice: '',
        currentStock: '',
        lowStockThreshold: '',
        isValid: false,
        errors: [],
      }));
      setSpreadsheetData(initialData);
    }
  }, [isOpen]);

  // Hide bottom navigation on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      const bottomNav = document.querySelector('[data-bottom-nav]');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'none';
      }
      document.body.style.overflow = 'hidden';
    } else {
      const bottomNav = document.querySelector('[data-bottom-nav]');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
      document.body.style.overflow = '';
    }

    return () => {
      const bottomNav = document.querySelector('[data-bottom-nav]');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTemplateSelect = useCallback((template: ProductTemplate) => {
    setSelectedTemplates(prev => {
      const isSelected = prev.some(t => t.id === template.id);
      if (isSelected) {
        return prev.filter(t => t.id !== template.id);
      } else {
        return [...prev, template];
      }
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setSelectedTemplates([]);
    const clearedData = spreadsheetData.map(row => ({
      ...row,
      name: '',
      category: '',
      costPrice: '' as const,
      sellingPrice: '' as const,
      currentStock: '' as const,
      lowStockThreshold: '' as const,
      isValid: false,
      errors: []
    }));
    setSpreadsheetData(clearedData);
  }, [spreadsheetData]);

  const handleSave = useCallback(() => {
    const validRows = spreadsheetData.filter(row => row.isValid && row.name.trim());
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Products",
        description: "Please add at least one valid product before saving.",
        variant: "destructive"
      });
      return;
    }

    const products = validRows.map(row => ({
      name: row.name.trim(),
      category: row.category,
      costPrice: Number(row.costPrice) || 0,
      sellingPrice: Number(row.sellingPrice),
      currentStock: Number(row.currentStock) || 0,
      lowStockThreshold: Number(row.lowStockThreshold) || 10,
      description: '',
      barcode: '',
      imageUrl: ''
    }));

    onSave(products);
    toast({
      title: "Products Added",
      description: `Successfully added ${products.length} products to inventory.`,
    });
    
    handleClose();
  }, [spreadsheetData, onSave, toast]);

  const handleClose = useCallback(() => {
    setViewMode('spreadsheet');
    setSelectedTemplates([]);
    setSpreadsheetData([]);
    onClose();
  }, [onClose]);

  const downloadTemplate = useCallback(() => {
    const csvContent = [
      'Name,Category,Cost Price,Selling Price,Current Stock,Low Stock Threshold',
      'Sample Product,General,10.00,15.00,100,10',
      'Another Product,Electronics,25.50,35.00,50,5'
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk-products-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded to your device.",
    });
  }, [toast]);

  const toggleView = () => {
    setViewMode(prev => prev === 'spreadsheet' ? 'templates' : 'spreadsheet');
  };

  const validProductsCount = spreadsheetData.filter(row => row.isValid).length;
  const filledProductsCount = spreadsheetData.filter(row => row.name.trim()).length;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center md:justify-center">
      <div className="w-full h-full md:h-[90vh] md:max-w-6xl md:mx-4 bg-background md:rounded-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bulk Add Products</h2>
              <p className="text-sm text-muted-foreground">
                {viewMode === 'spreadsheet' ? 'Spreadsheet Mode' : 'Template Selection'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleView}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {viewMode === 'spreadsheet' ? (
                <>
                  <Grid className="w-4 h-4" />
                  Templates
                </>
              ) : (
                <>
                  <Table className="w-4 h-4" />
                  Spreadsheet
                </>
              )}
            </Button>
            <Button onClick={handleClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden">
          {/* Spreadsheet View */}
          <div className={cn(
            "absolute inset-0 transition-transform duration-300 ease-in-out",
            viewMode === 'templates' ? "transform translate-y-full" : "transform translate-y-0"
          )}>
            <NewSpreadsheetView
              data={spreadsheetData}
              onDataChange={setSpreadsheetData}
              highlightedTemplates={selectedTemplates.map(t => t.name)}
            />
          </div>

          {/* Templates View */}
          <div className={cn(
            "absolute inset-0 transition-transform duration-300 ease-in-out",
            viewMode === 'spreadsheet' ? "transform translate-y-full" : "transform translate-y-0"
          )}>
            <NewTemplatesView
              selectedTemplates={selectedTemplates}
              onTemplateSelect={handleTemplateSelect}
            />
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {validProductsCount} valid
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {filledProductsCount} filled
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                {selectedTemplates.length} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={downloadTemplate} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                CSV Template
              </Button>
              <Button onClick={handleClearAll} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                Clear All
              </Button>
              <Button
                onClick={handleSave}
                disabled={validProductsCount === 0}
                size="sm"
              >
                Save {validProductsCount > 0 && `(${validProductsCount})`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NewBulkAddModal;