import { useStore } from '@nanostores/preact';
import { useState, useEffect } from 'preact/hooks';
import { $cart, removeFromCart, updateQuantity } from '../stores/cart';

export default function CartDrawer() {
  const cart = useStore($cart);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    document.addEventListener('toggle-cart', handler);
    return () => document.removeEventListener('toggle-cart', handler);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            priceId: item.priceId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          class="fixed inset-0 bg-black/25 z-40 transition-opacity backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        class={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-[0_24px_80px_rgba(17,17,17,0.18)] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div class="flex flex-col h-full">
          {/* Header */}
          <div class="flex items-center justify-between p-4 border-b border-border-light">
            <h2 class="text-lg font-bold">
              Your Cart {itemCount > 0 && <span class="text-gray-400">({itemCount})</span>}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close cart"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart Items */}
          <div class="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div class="text-center py-12">
                <span class="text-4xl block mb-4">🏓</span>
                <p class="text-gray-500 font-medium">Your cart is empty</p>
                <a
                  href="/shop"
                  class="inline-block mt-4 text-blackout hover:text-accent-light font-semibold text-sm"
                  onClick={() => setIsOpen(false)}
                >
                  Browse our merch →
                </a>
              </div>
            ) : (
              <div class="space-y-4">
                {cart.map((item) => (
                  <div key={item.priceId} class="flex gap-4 bg-surface-warm border border-border-light rounded-xl p-3">
                    {/* Image */}
                    <div class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} class="w-full h-full object-contain" />
                      ) : (
                        <div class="w-full h-full flex items-center justify-center text-2xl">🏓</div>
                      )}
                    </div>

                    {/* Details */}
                    <div class="flex-1 min-w-0">
                      <h3 class="font-semibold text-sm truncate">{item.name}</h3>
                      <p class="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>
                      <p class="text-sm font-bold text-blackout mt-1">
                        ${(item.price / 100).toFixed(2)}
                      </p>

                      {/* Quantity controls */}
                      <div class="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.priceId, item.quantity - 1)}
                          class="w-7 h-7 rounded-full bg-white border border-border hover:bg-surface-dark hover:border-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
                        >
                          −
                        </button>
                        <span class="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.priceId, item.quantity + 1)}
                          class="w-7 h-7 rounded-full bg-white border border-border hover:bg-surface-dark hover:border-gray-300 flex items-center justify-center text-sm font-bold transition-colors"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.priceId)}
                          class="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer — Checkout */}
          {cart.length > 0 && (
            <div class="border-t border-border-light p-4 space-y-3">
              <div class="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>${(total / 100).toFixed(2)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                class="w-full py-3 bg-blackout hover:bg-blackout-light text-white font-bold rounded-lg transition-colors text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Checkout'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                class="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
