/**
 * Price data type definitions for QuantBoard V1
 * Matches the normalized data structure from the backend ingestor
 */

/**
 * Trade data structure received from WebSocket
 */
export interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  trade_id: number;
  is_buyer_maker: boolean;
}

/**
 * OHLC (Open, High, Low, Close) data structure for charting
 */
export interface OHLCData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Connection status type
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
