import { useStore } from '@nanostores/preact';
import { $cart } from '../stores/cart';

export default function CartIcon() {
  const cart = useStore($cart);
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <button
      onClick={() => {
        document.dispatchEvent(new CustomEvent('toggle-cart'));
      }}
      class="relative p-2 text-text-light hover:text-blackout transition-colors"
      aria-label={`Shopping cart with ${count} items`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
      {count > 0 && (
        <span class="absolute -top-1 -right-1 bg-blackout text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1">
          {count}
        </span>
      )}
    </button>
  );
}
