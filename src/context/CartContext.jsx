import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children, storeId }) => {
  const [cartItems, setCartItems] = useState([]);

  const storageKey = storeId ? `koara_cart_${storeId}` : 'koara_cart_default';

  // Load cart from localStorage when storeId changes
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      } else {
        setCartItems([]);
      }
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
      setCartItems([]);
    }
  }, [storageKey]);

  // Sync cart to localStorage on change
  const saveCart = useCallback((items) => {
    setCartItems(items);
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [storageKey]);

  // Add item to cart
  const addToCart = useCallback((product, quantity = 1, dynamicFields = {}) => {
    const isTopup = !!product.isTopup || !!product.offer_id || !!product.offerId;
    const itemPrice = parseFloat(product.selling_price ?? product.salePrice ?? product.sale_price ?? product.price ?? 0);

    setCartItems((prevItems) => {
      // For platform/gift card products without topup fields, group by product ID
      if (!isTopup) {
        const existingIndex = prevItems.findIndex(
          (item) => !item.isTopup && (item.platformProductId === product.id || item.id === product.id)
        );

        if (existingIndex > -1) {
          const updated = [...prevItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + quantity
          };
          saveCart(updated);
          return updated;
        }
      }

      // Top-up or new gift card item
      const newItem = {
        cartItemId: `cart_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        storeId,
        id: product.id || product.offer_id || product.offerId,
        platformProductId: !isTopup ? (product.id || product.catalog_product_id) : null,
        offerId: isTopup ? (product.offer_id || product.offerId || product.id) : null,
        isTopup,
        name: product.name || product.custom_title || 'Product',
        category: product.category || 'Digital',
        image_url: product.image_url || product.custom_image_url || null,
        selling_price: itemPrice,
        quantity: Math.max(1, quantity),
        dynamicFields: isTopup ? dynamicFields : {}
      };

      const updated = [...prevItems, newItem];
      saveCart(updated);
      return updated;
    });
  }, [storeId, saveCart]);

  // Remove item from cart
  const removeFromCart = useCallback((cartItemId) => {
    setCartItems((prevItems) => {
      const updated = prevItems.filter((item) => item.cartItemId !== cartItemId);
      saveCart(updated);
      return updated;
    });
  }, [saveCart]);

  // Update item quantity
  const updateQuantity = useCallback((cartItemId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems((prevItems) => {
      const updated = prevItems.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
      );
      saveCart(updated);
      return updated;
    });
  }, [removeFromCart, saveCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    saveCart([]);
  }, [saveCart]);

  // Subtotal calculation
  const getCartSubtotal = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.selling_price * item.quantity), 0);
  }, [cartItems]);

  // Total items count
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartSubtotal,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
