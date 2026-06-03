import { useState, useMemo } from 'preact/hooks';
import AddToCartButton from './AddToCartButton';

interface PriceOption {
  id: string;
  amount: number;
  size: string;
}

interface ProductItem {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  sport: string;
  colorName?: string;
  colorHex?: string;
  category?: string;
  isLive: boolean;
  prices: PriceOption[];
}

type GenderFilter = 'all' | 'mens' | 'womens';

interface Props {
  products: ProductItem[];
  isDemo: boolean;
}

const GENDER_FILTERS: { id: GenderFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mens', label: "Men's" },
  { id: 'womens', label: "Women's" },
];

/**
 * Derive gender from the product category field.
 * - 'mens-crew-tee' → 'mens'
 * - 'womens-racerback-tank' → 'womens'
 * - Fallback: check product name for "Men's" / "Women's"
 */
function getGender(product: ProductItem): 'mens' | 'womens' | 'unisex' {
  const cat = product.category || '';
  if (cat.startsWith('mens')) return 'mens';
  if (cat.startsWith('womens')) return 'womens';

  // Fallback: check name
  const name = product.name.toLowerCase();
  if (name.includes("men's") || name.includes('mens')) return 'mens';
  if (name.includes("women's") || name.includes('womens')) return 'womens';

  return 'unisex';
}

function getLowestPrice(prices: PriceOption[]): number {
  return Math.min(...prices.map((p) => p.amount));
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ShopFilterGrid({ products, isDemo }: Props) {
  const [activeFilter, setActiveFilter] = useState<GenderFilter>('all');

  const filteredProducts = useMemo(() => {
    if (activeFilter === 'all') return products;
    return products.filter((p) => getGender(p) === activeFilter);
  }, [activeFilter, products]);

  // Count products per gender for badge display
  const counts = useMemo(() => {
    const c = { all: products.length, mens: 0, womens: 0 };
    for (const p of products) {
      const g = getGender(p);
      if (g === 'mens') c.mens++;
      else if (g === 'womens') c.womens++;
    }
    return c;
  }, [products]);

  return (
    <div>
      {/* Gender Filter Pills */}
      <div class="flex justify-center mb-8">
        <div class="inline-flex items-center gap-1.5 p-1 bg-gray-100 rounded-full">
          {GENDER_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.id;
            const count = counts[filter.id];
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                class={`
                  px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blackout/30 focus:ring-offset-1
                  ${isActive
                    ? 'bg-blackout text-white shadow-sm'
                    : 'text-gray-600 hover:text-blackout hover:bg-white'
                  }
                `}
                aria-pressed={isActive}
              >
                {filter.label}
                <span class={`
                  ml-1.5 inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5
                  rounded-full text-[10px] font-bold
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid with transition */}
      <div
        class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 transition-opacity duration-300"
        style={{ opacity: 1 }}
      >
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            class="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-border flex flex-col animate-fade-in"
          >
            {/* Product Image */}
            <a href={`/product/${product.id}`} class="block">
              <div class="aspect-[4/5] bg-white overflow-hidden relative">
                {product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div class="w-full h-full flex items-center justify-center bg-gray-50">
                    <span class="text-5xl opacity-60">🏓</span>
                  </div>
                )}
                {/* Color swatch badge */}
                {product.colorHex && (
                  <div class="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span
                      class="w-3 h-3 rounded-full border border-gray-300 inline-block"
                      style={{ backgroundColor: product.colorHex }}
                    />
                    <span class="text-[10px] font-medium text-gray-600">{product.colorName}</span>
                  </div>
                )}
                {/* Multi-angle badge */}
                {product.images.length > 1 && (
                  <div class="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                    </svg>
                    {product.images.length}
                  </div>
                )}
              </div>
            </a>

            {/* Product Info */}
            <div class="p-3 sm:p-4 flex flex-col flex-grow">
              <a href={`/product/${product.id}`} class="block">
                <h3 class="font-bold text-sm sm:text-base group-hover:text-blackout transition-colors line-clamp-2">
                  {product.name}
                </h3>
              </a>
              <div class="mt-1.5">
                <span class="text-base sm:text-lg font-black text-blackout">
                  {product.prices.length > 1 &&
                  getLowestPrice(product.prices) !== Math.max(...product.prices.map((p) => p.amount))
                    ? `From ${formatPrice(getLowestPrice(product.prices))}`
                    : formatPrice(getLowestPrice(product.prices))}
                </span>
              </div>

              {/* Add to Cart */}
              <div class="mt-auto pt-2">
                <AddToCartButton
                  productId={product.id}
                  productName={product.name}
                  productImage={product.images[0] || ''}
                  isDemo={isDemo || !product.isLive}
                  prices={product.prices.map((p) => ({
                    id: p.id,
                    amount: p.amount,
                    size: p.size,
                  }))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state for filtered view */}
      {filteredProducts.length === 0 && (
        <div class="bg-blackout/5 rounded-2xl p-12 text-center mt-6">
          <span class="text-5xl mb-4 block">🏓</span>
          <h2 class="text-2xl font-bold mb-2">
            No {activeFilter === 'mens' ? "Men's" : "Women's"} Products Found
          </h2>
          <p class="text-gray-500 max-w-md mx-auto mb-4">
            Try viewing all products or check back later for new arrivals.
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            class="inline-flex items-center gap-2 px-6 py-3 bg-blackout text-white rounded-full font-semibold hover:bg-blackout/90 transition-colors"
          >
            View All Products
          </button>
        </div>
      )}
    </div>
  );
}
