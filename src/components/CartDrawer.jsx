import React, { useState } from 'react';
import { ShoppingBag, X, Plus, Minus, Trash2, Tag, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import DashButton from './ui/DashButton';
import { useAppContext } from '../context/AppContext';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CartDrawer = ({ isOpen, onClose, onProceedToCheckout, catalogPromos = [], appliedPromo, setAppliedPromo, language = 'en' }) => {
  const { cartItems, removeFromCart, updateQuantity, getCartSubtotal, clearCart, cartCount } = useCart();
  const { t } = useAppContext();

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');

  if (!isOpen) return null;

  const subtotal = getCartSubtotal();

  // Calculate discount
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discountAmount = subtotal * (parseFloat(appliedPromo.value) / 100);
    } else if (appliedPromo.discount_type === 'fixed') {
      discountAmount = parseFloat(appliedPromo.value);
    }
    if (discountAmount > subtotal) discountAmount = subtotal;
  }

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = () => {
    setPromoError('');
    if (!promoCode.trim()) return;
    const found = catalogPromos.find(p => p.code.toUpperCase() === promoCode.trim().toUpperCase());
    if (found) {
      setAppliedPromo(found);
    } else {
      setAppliedPromo(null);
      setPromoError(t('invalid_or_inactive_promo_code'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 end-0 max-w-full flex ltr:ps-10 rtl:pe-10">
        <div className="w-screen max-w-md bg-[#020617] text-white shadow-2xl flex flex-col border-l border-white/10">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {t('shopping_cart')}
                </h3>
                <span className="text-xs text-slate-400">
                  {cartCount} {language === 'en' ? (cartCount === 1 ? 'item' : 'items') : 'منتجات'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
                  <ShoppingBag size={32} />
                </div>
                <h4 className="text-base font-semibold text-white mb-1">
                  {t('your_cart_is_empty')}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  {t('explore_our_digital_products_a')}
                </p>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemImage = item.image_url
                  ? (item.image_url.startsWith('http') || item.image_url.startsWith('/') ? item.image_url : `${API_BASE_URL}${item.image_url}`)
                  : null;

                return (
                  <div
                    key={item.cartItemId}
                    className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex gap-4 transition-all hover:border-white/20"
                  >
                    {/* Item Image / Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {itemImage ? (
                        <img src={itemImage} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-extrabold text-sm text-blue-400">
                          {item.name ? item.name.charAt(0) : 'P'}
                        </span>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-white truncate">{item.name}</h4>
                          <button
                            onClick={() => removeFromCart(item.cartItemId)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5 uppercase">
                            {item.isTopup ? (t('top_up')) : (t('gift_card'))}
                          </span>
                        </div>

                        {/* Top-up Dynamic Fields preview */}
                        {item.isTopup && item.dynamicFields && Object.keys(item.dynamicFields).length > 0 && (
                          <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/5 text-[11px] space-y-0.5 text-slate-300">
                            {Object.entries(item.dynamicFields).map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-2 truncate">
                                <span className="text-slate-500 capitalize">{k.replace('_', ' ')}:</span>
                                <span className="font-mono font-medium text-white" dir="ltr">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quantity & Price */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <div className="text-end">
                          <span className="text-xs font-bold text-blue-400 font-mono" dir="ltr">
                            ${(item.selling_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 border-t border-white/10 space-y-4 bg-slate-950/50">
              
              {/* Promo Code Input */}
              <div>
                <div className="flex gap-2 rounded-xl bg-white/5 border border-white/10 p-1">
                  <input
                    type="text"
                    placeholder={t('promo_code')}
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs font-mono uppercase text-white outline-none placeholder-slate-500"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    {t('apply')}
                  </button>
                </div>
                {promoError && <p className="text-[11px] text-red-400 mt-1">{promoError}</p>}
                {appliedPromo && (
                  <p className="text-[11px] text-green-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {appliedPromo.code} applied!
                  </p>
                )}
              </div>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{t('subtotal')}</span>
                  <span className="font-mono text-white" dir="ltr">${subtotal.toFixed(2)}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-400 font-medium">
                    <span>{t('discount')}</span>
                    <span className="font-mono" dir="ltr">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>{t('total')}</span>
                  <span className="font-mono text-blue-400" dir="ltr">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <DashButton
                  onClick={() => { onClose(); onProceedToCheckout(); }}
                  className="dash-btn dash-btn-primary w-full justify-center py-3 text-sm font-bold rounded-xl"
                >
                  {t('proceed_to_checkout')} <ArrowRight size={16} />
                </DashButton>

                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
                >
                  {t('clear_cart')}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
