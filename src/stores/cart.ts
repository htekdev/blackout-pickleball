import { persistentAtom } from '@nanostores/persistent';

export interface CartItem {
  priceId: string;
  productId: string;
  name: string;
  image: string;
  price: number;     // in cents
  size: string;
  quantity: number;
}

export const $cart = persistentAtom<CartItem[]>('blackout-cart', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function addToCart(item: CartItem) {
  const current = $cart.get();
  const existing = current.find((i) => i.priceId === item.priceId);
  if (existing) {
    $cart.set(
      current.map((i) =>
        i.priceId === item.priceId ? { ...i, quantity: i.quantity + item.quantity } : i
      )
    );
  } else {
    $cart.set([...current, item]);
  }
}

export function removeFromCart(priceId: string) {
  $cart.set($cart.get().filter((i) => i.priceId !== priceId));
}

export function updateQuantity(priceId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromCart(priceId);
    return;
  }
  $cart.set(
    $cart.get().map((i) => (i.priceId === priceId ? { ...i, quantity } : i))
  );
}

export function clearCart() {
  $cart.set([]);
}

export function getCartTotal(): number {
  return $cart.get().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function getCartCount(): number {
  return $cart.get().reduce((sum, i) => sum + i.quantity, 0);
}
