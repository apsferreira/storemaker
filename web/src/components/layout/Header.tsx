import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';

export function Header() {
  const { store } = useStore();
  const { toggleCart, itemCount } = useCart();
  const theme = useTheme();

  return (
    <header className={`${theme.headerBg} sticky top-0 z-40 backdrop-blur-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo / Nome da Loja */}
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            {store.logo_url && (
              <img
                src={store.logo_url}
                alt={store.name}
                className="h-7 w-7 object-contain rounded shrink-0"
              />
            )}
            <span className="text-base sm:text-lg font-bold truncate max-w-[180px] sm:max-w-[260px]">
              {store.name}
            </span>
          </Link>

          {/* Carrinho */}
          <button
            onClick={toggleCart}
            className="relative p-2 rounded-lg hover:bg-black/5 transition-colors"
            aria-label={`Abrir carrinho${itemCount > 0 ? ` (${itemCount} item${itemCount > 1 ? 's' : ''})` : ''}`}
          >
            <ShoppingBag size={22} strokeWidth={1.8} />
            {itemCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1"
                style={{ backgroundColor: theme.primaryColor }}
              >
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
