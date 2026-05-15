import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { formatCurrency } from '../../utils/format';
import { CartItemRow } from './CartItemRow';

export function CartSidebar() {
  const { cart, isOpen, closeCart, loading } = useCart();
  const theme = useTheme();
  const navigate = useNavigate();

  const items = cart?.cart.items ?? [];
  const subtotal = cart?.subtotal_cents ?? 0;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 transition-opacity"
          onClick={closeCart}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm sm:max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} strokeWidth={2} />
              <h2 className="text-base font-bold">Carrinho</h2>
              {items.length > 0 && (
                <span className="text-xs font-medium text-gray-400">
                  ({items.length} item{items.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              aria-label="Fechar carrinho"
            >
              <X size={18} />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-gray-500" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 px-6 text-center">
                <ShoppingBag size={52} strokeWidth={1.2} className="mb-4" />
                <p className="text-base font-semibold text-gray-500">Carrinho vazio</p>
                <p className="text-sm mt-1.5 text-gray-400 leading-relaxed">
                  Adicione produtos ao carrinho para comecar sua compra.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-5 text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Ver produtos
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between text-base font-bold">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <button
                onClick={() => {
                  closeCart();
                  navigate('/checkout');
                }}
                className={`w-full py-3 rounded-lg font-bold text-center transition-colors ${theme.buttonStyle}`}
              >
                Finalizar Compra
              </button>
              <button
                onClick={closeCart}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Continuar comprando
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
