import { useState } from 'preact/hooks';
import { addToCart } from '../stores/cart';

interface PriceOption {
  id: string;
  amount: number;
  size: string;
}

interface Props {
  productId: string;
  productName: string;
  productImage: string;
  prices: PriceOption[];
}

export default function AddToCartButton({ productId, productName, productImage, prices }: Props) {
  const [selectedPrice, setSelectedPrice] = useState(prices[0]);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      priceId: selectedPrice.id,
      productId,
      name: productName,
      image: productImage,
      price: selectedPrice.amount,
      size: selectedPrice.size,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    // Open cart drawer
    document.dispatchEvent(new CustomEvent('toggle-cart'));
  };

  return (
    <div>
      {/* Size selector */}
      {prices.length > 1 && (
        <div class="flex flex-wrap gap-2 mt-3">
          {prices.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPrice(p)}
              class={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                selectedPrice.id === p.id
                  ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#0a0a0a]'
              }`}
            >
              {p.size}
            </button>
          ))}
        </div>
      )}

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        class={`mt-3 w-full py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-blackout hover:bg-accent-light text-white'
        }`}
      >
        {added ? '✓ Added!' : `Add to Cart — $${(selectedPrice.amount / 100).toFixed(2)}`}
      </button>
    </div>
  );
}
