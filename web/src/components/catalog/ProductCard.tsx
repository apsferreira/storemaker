import { Link } from 'react-router-dom';
import type { Product } from '../../types';
import { formatCurrency } from '../../utils/format';
import { useTheme } from '../../contexts/ThemeContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const theme = useTheme();
  const hasDiscount = product.compare_price_cents > product.price_cents;
  const mainPhoto = product.photos?.[0]?.url;
  const discountPct = hasDiscount
    ? Math.round(((product.compare_price_cents - product.price_cents) / product.compare_price_cents) * 100)
    : 0;
  const outOfStock = product.stock_quantity === 0;

  return (
    <Link
      to={`/produto/${product.slug}`}
      state={{ product }}
      className="group block overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        borderRadius: theme.borderRadius,
        backgroundColor: theme.cardBg,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
      }}
    >
      {/* Imagem */}
      <div className="aspect-square overflow-hidden relative bg-gray-50">
        {mainPhoto ? (
          <img
            src={mainPhoto}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${outOfStock ? 'opacity-60 grayscale-[30%]' : 'group-hover:scale-[1.04]'}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-200 gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-14 h-14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <span className="text-xs text-gray-300">Sem foto</span>
          </div>
        )}

        {/* Badge desconto */}
        {hasDiscount && !outOfStock && (
          <span className={`absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm ${theme.badgeDiscountStyle}`}>
            -{discountPct}%
          </span>
        )}

        {/* Overlay esgotado */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-black/50 to-transparent">
            <span className="text-white text-xs font-semibold tracking-wide uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Esgotado
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4">
        <h3
          className="font-medium text-sm sm:text-base line-clamp-2 mb-2 leading-snug"
          style={{ color: theme.textColor, fontFamily: theme.fontFamilyHeading }}
        >
          {product.name}
        </h3>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: outOfStock ? theme.textMutedColor : theme.primaryColor }}
          >
            {formatCurrency(product.price_cents)}
          </span>
          {hasDiscount && (
            <span className="text-xs line-through tabular-nums" style={{ color: theme.textMutedColor }}>
              {formatCurrency(product.compare_price_cents)}
            </span>
          )}
        </div>
        {product.variations && product.variations.length > 0 && (
          <p className="text-[11px] mt-1.5" style={{ color: theme.textMutedColor }}>
            {product.variations.length} op{product.variations.length > 1 ? 'coes' : 'cao'}
          </p>
        )}
      </div>
    </Link>
  );
}
