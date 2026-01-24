/**
 * Symbol configuration for QuantBoard V1
 * Defines supported symbols and default settings
 */

export interface SymbolConfig {
  symbol: string;
  name: string;
  icon: string;
  baseAsset: string;
  quoteAsset: string;
}

export const SYMBOL_CONFIG = {
  default: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
  maxSubscriptions: 10,
  historyLimit: 1000,
  updateThrottle: 100, // ms
} as const;

export const SUPPORTED_SYMBOLS: SymbolConfig[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', icon: 'btc', baseAsset: 'BTC', quoteAsset: 'USDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum', icon: 'eth', baseAsset: 'ETH', quoteAsset: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB', icon: 'bnb', baseAsset: 'BNB', quoteAsset: 'USDT' },
  { symbol: 'SOLUSDT', name: 'Solana', icon: 'sol', baseAsset: 'SOL', quoteAsset: 'USDT' },
  { symbol: 'XRPUSDT', name: 'XRP', icon: 'xrp', baseAsset: 'XRP', quoteAsset: 'USDT' },
  { symbol: 'ADAUSDT', name: 'Cardano', icon: 'ada', baseAsset: 'ADA', quoteAsset: 'USDT' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', icon: 'doge', baseAsset: 'DOGE', quoteAsset: 'USDT' },
  { symbol: 'MATICUSDT', name: 'Polygon', icon: 'matic', baseAsset: 'MATIC', quoteAsset: 'USDT' },
  { symbol: 'DOTUSDT', name: 'Polkadot', icon: 'dot', baseAsset: 'DOT', quoteAsset: 'USDT' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', icon: 'avax', baseAsset: 'AVAX', quoteAsset: 'USDT' },
  { symbol: 'LINKUSDT', name: 'Chainlink', icon: 'link', baseAsset: 'LINK', quoteAsset: 'USDT' },
  { symbol: 'UNIUSDT', name: 'Uniswap', icon: 'uni', baseAsset: 'UNI', quoteAsset: 'USDT' },
  { symbol: 'AAVEUSDT', name: 'Aave', icon: 'aave', baseAsset: 'AAVE', quoteAsset: 'USDT' },
  { symbol: 'LTCUSDT', name: 'Litecoin', icon: 'ltc', baseAsset: 'LTC', quoteAsset: 'USDT' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', icon: 'atom', baseAsset: 'ATOM', quoteAsset: 'USDT' },
];

export function getSymbolInfo(symbol: string): SymbolConfig | undefined {
  return SUPPORTED_SYMBOLS.find(s => s.symbol === symbol.toUpperCase());
}

export function getSymbolName(symbol: string): string {
  const info = getSymbolInfo(symbol);
  return info?.name || symbol.replace('USDT', '');
}

export function getSymbolIcon(symbol: string): string {
  const info = getSymbolInfo(symbol);
  return info?.icon || symbol.replace('USDT', '').toLowerCase();
}
