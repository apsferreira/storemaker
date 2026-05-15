import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchCatalog } from '../api/catalog';
import { SEOHead } from '../components/seo/SEOHead';
import { SearchBar } from '../components/catalog/SearchBar';
import { CategoryFilter } from '../components/catalog/CategoryFilter';
import { ProductGrid } from '../components/catalog/ProductGrid';
import { Pagination } from '../components/catalog/Pagination';
import type { Product, Category } from '../types';

// Hero sections por template
function HeroBanner({ storeName, bannerUrl }: { storeName: string; bannerUrl?: string }) {
  const theme = useTheme();

  if (theme.heroLayout === 'combat') {
    // Jiu-Jitsu: dark, impactante, badge de luta
    return (
      <div
        className="w-full mb-8 rounded-lg overflow-hidden relative flex items-center min-h-[160px] sm:min-h-[220px]"
        style={{ background: 'linear-gradient(135deg, #0c0a09 0%, #1c1917 60%, #7f1d1d 100%)' }}
      >
        {bannerUrl && (
          <img src={bannerUrl} alt={storeName} className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative px-6 py-8 sm:px-10">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 mb-3 rounded-sm"
            style={{ backgroundColor: theme.accentColor, color: '#fff' }}
          >
            Equipamentos de luta
          </span>
          <h1
            className="text-2xl sm:text-4xl font-black uppercase leading-tight"
            style={{ color: theme.textColor, fontFamily: theme.fontFamilyHeading, letterSpacing: '-0.01em' }}
          >
            {storeName}
          </h1>
          <p className="mt-2 text-sm" style={{ color: theme.textMutedColor }}>
            Kimonos, rashguards, proteções e acessórios
          </p>
        </div>
      </div>
    );
  }

  if (theme.heroLayout === 'minimal') {
    // Food Delivery: fundo branco com accent laranja, foco em "pedido rapido"
    return (
      <div
        className="w-full mb-6 rounded-2xl overflow-hidden relative flex items-center min-h-[120px] sm:min-h-[160px] px-6 py-6"
        style={{ background: `linear-gradient(135deg, ${theme.secondaryColor} 0%, #fff 100%)`, border: `2px solid ${theme.borderColor}` }}
      >
        {bannerUrl && (
          <img src={bannerUrl} alt={storeName} className="absolute right-0 top-0 h-full w-1/3 object-cover opacity-30 rounded-r-2xl" />
        )}
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: theme.accentColor, color: '#fff' }}
            >
              Delivery
            </span>
            <span className="text-[11px]" style={{ color: theme.textMutedColor }}>Pedido minimo R$ 50</span>
          </div>
          <h1
            className="text-xl sm:text-3xl font-black"
            style={{ color: theme.primaryColor, fontFamily: theme.fontFamilyHeading }}
          >
            {storeName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: theme.textMutedColor }}>
            Salgados fresquinhos para seu evento
          </p>
        </div>
      </div>
    );
  }

  if (theme.heroLayout === 'editorial') {
    // Semi-joias: elegante, com banner full
    if (bannerUrl) {
      return (
        <div className="w-full h-40 sm:h-64 lg:h-80 rounded-xl overflow-hidden mb-8 relative">
          <img src={bannerUrl} alt={storeName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6">
            <h1 className="text-2xl sm:text-4xl font-bold text-white" style={{ fontFamily: theme.fontFamilyHeading }}>
              {storeName}
            </h1>
          </div>
        </div>
      );
    }
    return (
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: theme.fontFamilyHeading, color: theme.textColor }}>
          {storeName}
        </h1>
      </div>
    );
  }

  // Default: banner + titulo (moda feminina e outros)
  return (
    <div className="mb-6 sm:mb-8">
      {bannerUrl && (
        <div className="w-full h-32 sm:h-48 lg:h-64 rounded-xl overflow-hidden mb-6 shadow-sm">
          <img src={bannerUrl} alt={`Banner ${storeName}`} className="w-full h-full object-cover" />
        </div>
      )}
      <h1
        className="text-2xl sm:text-3xl font-bold mb-1"
        style={{ color: theme.textColor, fontFamily: theme.fontFamilyHeading }}
      >
        {storeName}
      </h1>
      <p className="text-sm" style={{ color: theme.textMutedColor }}>
        Explore nosso catalogo
      </p>
    </div>
  );
}

export function CatalogPage() {
  const { store } = useStore();
  const { refresh: refreshCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadCatalog = useCallback(async () => {
    if (!store.id) return;
    setLoading(true);
    try {
      const data = await fetchCatalog({
        storeId: store.id,
        page,
        perPage: 12,
        categoriaId: selectedCategory || undefined,
        search: search || undefined,
      });
      setProducts(data.data || []);
      setTotalPages(data.total_pages);

      // Extract unique categories from products for filter
      const catMap = new Map<string, Category>();
      (data.data || []).forEach((p) => {
        if (p.categoria_id) {
          // We don't have full category objects from the catalog endpoint,
          // so we just track IDs
          catMap.set(p.categoria_id, {
            id: p.categoria_id,
            loja_id: p.loja_id,
            name: p.categoria_id, // will be replaced if we had the endpoint
            slug: '',
            sort_order: 0,
            created_at: '',
          });
        }
      });
      // Keep existing categories if they were set
      if (categories.length === 0) {
        setCategories(Array.from(catMap.values()));
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [store.id, page, selectedCategory, search]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    refreshCart();
  }, []);

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(1);
  };

  const handleCategoryChange = (catId: string | null) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  return (
    <>
      <SEOHead
        title={store.name}
        description={`Confira os produtos da loja ${store.name}`}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero section (varia por template) */}
        <HeroBanner storeName={store.name} bannerUrl={store.banner_url} />

        {/* Search + Filter */}
        <div className="space-y-4 mb-6">
          <SearchBar onSearch={handleSearch} />
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategoryChange}
          />
        </div>

        {/* Grid */}
        <ProductGrid products={products} loading={loading} />

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </main>
    </>
  );
}
