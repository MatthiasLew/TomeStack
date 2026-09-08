import { BindingFormat, PriceOffer } from "@/types";

export interface LiveStoreOffer extends PriceOffer {
  storeName: string;
  storeLogo?: string;
  inStock: boolean;
  deliveryDays?: string;
  promoCode?: string;
  normalizedPrice: number; // numeric in PLN for sorting
}

export interface SeriesBasketOptimization {
  totalMissingBooks: number;
  cheapestCombinedPrice: number; // sum of best price per book
  bestSingleStore?: {
    storeName: string;
    totalPrice: number;
    availableBooksCount: number;
    shippingEstimate: number;
    grandTotal: number;
  };
  breakdown: Array<{
    bookId: string;
    bookTitle: string;
    volume: number;
    formatType: BindingFormat;
    offers: LiveStoreOffer[];
    bestOffer: LiveStoreOffer;
  }>;
}

/**
 * Parses Polish price string like "44,99 zł", "39.50 PLN", "52 zł" into float.
 */
export function parsePriceNumber(priceStr: string): number {
  if (!priceStr) return 0;
  const sanitized = priceStr
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  const val = parseFloat(sanitized);
  return isNaN(val) ? 0 : val;
}

/**
 * Generates direct search / affiliate purchase links for major bookstores.
 */
export function generateStorePurchaseUrl(store: string, title: string, isbn?: string): string {
  const query = isbn ? isbn.trim() : title.trim();
  const encoded = encodeURIComponent(query);

  switch (store.toLowerCase()) {
    case "allegro":
      return `https://allegro.pl/kategoria/ksiazki-i-komiksy-7?string=${encoded}`;
    case "empik":
      return `https://www.empik.com/szukaj/produkt?q=${encoded}&qtype=basicForm`;
    case "taniaksiazka":
      return `https://www.taniaksiazka.pl/szukaj/q-${encoded}`;
    case "świat książki":
    case "swiat ksiazki":
      return `https://www.swiatksiazki.pl/catalogsearch/result/?q=${encoded}`;
    case "gandalf":
      return `https://www.gandalf.com.pl/szukaj/?q=${encoded}`;
    default:
      return `https://www.google.com/search?q=kup+ksiazke+${encodeURIComponent(title + (isbn ? ` ${isbn}` : ""))}`;
  }
}

/**
 * Calculates optimal basket for a collection of missing books.
 * Identifies:
 * 1. Cheapest cherry-picked combination (buying each book at its absolute lowest price)
 * 2. Best single bookstore to minimize shipping packages and costs
 */
export function calculateSeriesBasket(
  missingBooks: Array<{
    id: string;
    title: string;
    volume: number;
    formatType: BindingFormat;
    prices: PriceOffer[];
  }>,
  formatPreference: "all" | "hardcover" | "paperback" = "all"
): SeriesBasketOptimization {
  const breakdown: SeriesBasketOptimization["breakdown"] = [];
  let cheapestCombinedPrice = 0;

  // Track store totals for single-store basket optimization
  const storeAggregates: Record<
    string,
    { storeName: string; totalPrice: number; availableBooksCount: number; shippingEstimate: number }
  > = {};

  missingBooks.forEach((b) => {
    // Filter offers by format preference if specified
    const filteredOffers = b.prices.filter((p) => {
      if (formatPreference === "all") return true;
      return p.formatType === formatPreference;
    });

    const activeOffers = filteredOffers.length > 0 ? filteredOffers : b.prices;

    const liveOffers: LiveStoreOffer[] = activeOffers.map((p) => {
      const num = parsePriceNumber(p.price);
      return {
        ...p,
        storeName: p.store,
        inStock: true,
        deliveryDays: p.shipping.toLowerCase().includes("gratis") ? "1-2 dni" : "2-3 dni",
        normalizedPrice: num,
        url: p.url || generateStorePurchaseUrl(p.store, b.title),
      };
    });

    // Sort by price ascending
    liveOffers.sort((a, b) => a.normalizedPrice - b.normalizedPrice);
    const best = liveOffers[0] || {
      store: "Księgarnie",
      storeName: "Księgarnie",
      formatType: b.formatType,
      format: b.formatType === "hardcover" ? "Twarda" : "Miękka",
      price: "0 zł",
      shipping: "Standard",
      url: generateStorePurchaseUrl("allegro", b.title),
      inStock: false,
      normalizedPrice: 0,
    };

    cheapestCombinedPrice += best.normalizedPrice;

    // Aggregate single store options
    liveOffers.forEach((offer) => {
      if (!storeAggregates[offer.storeName]) {
        storeAggregates[offer.storeName] = {
          storeName: offer.storeName,
          totalPrice: 0,
          availableBooksCount: 0,
          shippingEstimate: offer.shipping.toLowerCase().includes("smart") || offer.shipping.toLowerCase().includes("gratis") ? 0 : 9.99,
        };
      }
      storeAggregates[offer.storeName].totalPrice += offer.normalizedPrice;
      storeAggregates[offer.storeName].availableBooksCount += 1;
    });

    breakdown.push({
      bookId: b.id,
      bookTitle: b.title,
      volume: b.volume,
      formatType: b.formatType,
      offers: liveOffers,
      bestOffer: best,
    });
  });

  // Determine best single store (most books available with lowest grandTotal)
  let bestSingleStore: SeriesBasketOptimization["bestSingleStore"] | undefined = undefined;
  const storeList = Object.values(storeAggregates);

  if (storeList.length > 0) {
    storeList.sort((a, b) => {
      // Prioritize having all or most books
      if (b.availableBooksCount !== a.availableBooksCount) {
        return b.availableBooksCount - a.availableBooksCount;
      }
      return (a.totalPrice + a.shippingEstimate) - (b.totalPrice + b.shippingEstimate);
    });

    const top = storeList[0];
    bestSingleStore = {
      storeName: top.storeName,
      totalPrice: Math.round(top.totalPrice * 100) / 100,
      availableBooksCount: top.availableBooksCount,
      shippingEstimate: top.shippingEstimate,
      grandTotal: Math.round((top.totalPrice + top.shippingEstimate) * 100) / 100,
    };
  }

  return {
    totalMissingBooks: missingBooks.length,
    cheapestCombinedPrice: Math.round(cheapestCombinedPrice * 100) / 100,
    bestSingleStore,
    breakdown,
  };
}
