import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Bell, BookOpen, BriefcaseBusiness, ChevronRight, CircleHelp, Clock3,
  LineChart, Menu, Newspaper, Plus, Search, ShieldCheck, Star, StarOff, Target,
  Trophy, X,
} from 'lucide-react';
import {
  AlertInputCondition, OrderInputType, type Alert, type NewsItem, type Portfolio,
  type PricePoint, type Stock, type StockDetail,
  getGetPortfolioQueryKey, getGetWatchlistQueryKey, getListAlertsQueryKey,
  getListOrdersQueryKey, useAddToWatchlist, useCreateAlert, useCreateOrder,
  useDeleteAlert, useGetLeaderboard, useGetMarketOverview, useGetPortfolio,
  useGetStock, useGetStockHistory, useGetWatchlist, useListAlerts, useListNews,
  useListOrders, useListStocks, useRemoveFromWatchlist,
} from '@/api-client-react';
import { Link, Route, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/auth';
import { clearToken, getToken, type AuthUser } from '@/auth';
import { ApiError } from '@/api-client-react/custom-fetch';
import { useToast } from '@/hooks/use-toast';

const queryClient = new QueryClient();
const AuthUserContext = createContext<AuthUser | null>(null);

const money = (value = 0) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const compactMoney = (value = 0) => value >= 10000000 ? `₹${(value / 10000000).toFixed(1)}Cr` : value >= 100000 ? `₹${(value / 100000).toFixed(1)}L` : money(value);
const signed = (value = 0, digits = 2) => `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
const formatDate = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};
const formatTime = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const tone = (value = 0) => value >= 0 ? 'positive' : 'negative';
function orderErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.data && typeof error.data === 'object' && 'error' in error.data && typeof error.data.error === 'string') return error.data.error;
  return error instanceof Error ? error.message : 'The order could not be completed.';
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="loading-grid" data-testid="loading-skeleton">{Array.from({ length: lines }).map((_, index) => <div key={index} className="skeleton loading-line" style={{ width: `${76 - index * 12}%` }} />)}</div>;
}

function QueryState({ loading, error, retry, children }: { loading?: boolean; error?: unknown; retry?: () => void; children: ReactNode }) {
  if (loading) return <Skeleton lines={4} />;
  if (error) return <div className="error-box" data-testid="status-query-error">We could not load this panel. <button className="btn btn-danger btn-sm" onClick={retry} data-testid="button-retry">Try again</button></div>;
  return <>{children}</>;
}

function Logo() {
  return <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark">S</span><span className="brand-name">Stock<span>Sphere</span></span></Link>;
}

const navItems = [
  { href: '/', label: 'Market desk', icon: Activity },
  { href: '/stocks', label: 'Stock explorer', icon: LineChart },
  { href: '/portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
  { href: '/alerts', label: 'Price alerts', icon: Bell },
  { href: '/news', label: 'Market news', icon: Newspaper },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

function Shell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useContext(AuthUserContext);
  const profileInitial = user?.name.trim().charAt(0).toUpperCase() || 'U';
  const active = (href: string) => href === '/' ? location === '/' : location.startsWith(href);
  return <div className="app-shell">
    <aside className="sidebar" aria-label="Primary navigation">
      <Logo />
      <div className="eyebrow">Workspace</div>
      <nav className="nav-stack">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`nav-item ${active(href) ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="nav-icon" /><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="nav-stack">
          <button className="nav-item" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-help"><CircleHelp className="nav-icon" /><span>How it works</span></button>
        </div>
      </div>
    </aside>
    {mobileOpen && <div className="modal-backdrop" onClick={() => setMobileOpen(false)}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">StockSphere</div><h2 className="modal-title">Practice without pressure</h2></div><button className="icon-btn" onClick={() => setMobileOpen(false)} data-testid="button-close-help"><X size={16} /></button></div><p className="page-subtitle">StockSphere is a paper-trading workspace for exploring Indian equities. Prices are for education, not financial advice.</p><div className="notice">No real orders are placed. Your cash balance and returns are simulated.</div></div></div>}
    <main className="main-area">
      <header className="topbar">
        <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={17} /></button>
        <div className="topbar-search"><Search size={15} /><input aria-label="Search stocks" placeholder="Search symbols, companies..." onKeyDown={event => { if (event.key === 'Enter') setLocation(`/stocks?search=${encodeURIComponent(event.currentTarget.value)}`); }} data-testid="input-global-search" /></div>
        <div className="top-actions"><button className="icon-btn" onClick={() => setLocation('/alerts')} data-testid="button-top-alerts"><Bell size={16} /></button><div className="profile"><div className="avatar" aria-hidden="true">{profileInitial}</div><div className="profile-name">{user?.name || 'Account'}</div><button className="btn btn-ghost btn-sm" onClick={() => { clearToken(); window.location.reload(); }}>Sign out</button></div></div>
      </header>
      {children}
    </main>
  </div>;
}

function SectionTitle({ title, action, href }: { title: string; action?: string; href?: string }) {
  return <div className="section-head"><h2 className="section-title">{title}</h2>{action && href && <Link className="section-link" href={href} data-testid={`link-see-${title.toLowerCase().replaceAll(' ', '-')}`}>{action} <ChevronRight size={11} style={{ verticalAlign: 'middle' }} /></Link>}</div>;
}

function StockIdentity({ stock }: { stock: Stock | StockDetail }) {
  return <div className="stock-cell"><div className="ticker">{stock.symbol.slice(0, 3)}</div><div><div className="stock-symbol">{stock.symbol}</div><div className="stock-company">{stock.name}</div></div></div>;
}

function Sparkline({ positive = true }: { positive?: boolean }) {
  return <svg viewBox="0 0 84 28" className="sparkline" aria-hidden="true"><path d={positive ? 'M1 24 C12 23 15 17 23 18 S34 9 41 13 S52 6 60 10 S72 4 83 2' : 'M1 4 C12 5 15 12 23 10 S34 19 41 15 S52 22 60 18 S72 24 83 26'} fill="none" stroke={positive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} strokeWidth="2" strokeLinecap="round" /></svg>;
}

function StockTable({ stocks, watchlist, onToggle }: { stocks: Stock[]; watchlist: string[]; onToggle: (stock: Stock) => void }) {
  if (!stocks.length) return <div className="empty" data-testid="empty-stock-list"><Search size={24} /><div>No stocks match this view.</div><p>Try a different symbol or sector.</p></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Company</th><th>Last price</th><th>Day move</th><th>Market cap</th><th>Volume</th><th /></tr></thead><tbody>{stocks.map(stock => <tr key={stock.symbol} data-testid={`row-stock-${stock.symbol}`}><td><Link href={`/stocks/${stock.symbol}`} style={{ textDecoration: 'none', color: 'inherit' }} data-testid={`link-stock-${stock.symbol}`}><StockIdentity stock={stock} /></Link></td><td className="font-mono">{money(stock.price)}</td><td><span className={`chip ${stock.changePercent >= 0 ? 'chip-green' : 'chip-red'}`}>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span></td><td className="font-mono">{compactMoney(stock.marketCap)}</td><td className="font-mono">{stock.volume.toLocaleString('en-IN')}</td><td><button className="icon-btn" onClick={() => onToggle(stock)} aria-label={`${watchlist.includes(stock.symbol) ? 'Remove' : 'Add'} ${stock.symbol} watchlist`} data-testid={`button-watchlist-${stock.symbol}`}>{watchlist.includes(stock.symbol) ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}</button></td></tr>)}</tbody></table></div>;
}

function Dashboard() {
  const user = useContext(AuthUserContext);
  const firstName = user?.name.trim().split(/\s+/)[0] || 'Trader';
  const market = useGetMarketOverview();
  const watch = useGetWatchlist();
  const portfolio = useGetPortfolio();
  const news = useListNews();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const watchSymbols = (watch.data ?? []).map(stock => stock.symbol);
  const toggleWatch = (stock: Stock) => {
    const mutation = watchSymbols.includes(stock.symbol) ? remove : add;
    mutation.mutate({ symbol: stock.symbol }, { onSuccess: data => { qc.setQueryData(getGetWatchlistQueryKey(), data); setFeedback(`${stock.symbol} ${watchSymbols.includes(stock.symbol) ? 'removed from' : 'added to'} watchlist`); setTimeout(() => setFeedback(''), 2200); } });
  };
  const indices = market.data?.indices ?? [];
  const movers = market.data?.movers ?? [];
  const sectors = market.data?.sectors ?? [];
  return <div className="page fade-in">
    <div className="page-heading"><div><div className="eyebrow">Monday, 08 September 2025 · NSE / BSE context</div><h1 className="page-title">Good morning, {firstName}.</h1><p className="page-subtitle">A focused read on the Indian market before you make your next paper trade.</p></div><div className="notice"><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Paper trading only</div></div>
    {feedback && <div className="toast-inline fade-in" data-testid="status-watchlist-feedback">{feedback}</div>}
    <QueryState loading={market.isLoading || portfolio.isLoading} error={market.error || portfolio.error} retry={() => { void market.refetch(); void portfolio.refetch(); }}>
      <div className="market-tape">{indices.map(index => <div className="tape-item" key={index.name} data-testid={`metric-index-${index.name}`}><div className="tape-name">{index.name}</div><div className="tape-value">{index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div><div className={`tape-change ${tone(index.changePercent)}`}>{signed(index.changePercent)}%</div></div>)}<div className="tape-item"><div className="tape-name">Market pulse</div><div className="tape-value">{sectors.filter(s => s.changePercent > 0).length}/{sectors.length}</div><div className="tape-change neutral">sectors green</div></div></div>
      <div className="grid-4" style={{ marginBottom: 17 }}>
        <div className="card metric-card"><div className="metric-label">Paper portfolio</div><div className="metric-value">{money(portfolio.data?.value)}</div><div className={`metric-meta ${tone(portfolio.data?.profitLoss)}`}>{signed(portfolio.data?.profitLoss)} · {signed(portfolio.data?.profitLossPercent)}%</div></div>
        <div className="card metric-card"><div className="metric-label">Available cash</div><div className="metric-value">{money(portfolio.data?.cash)}</div><div className="metric-meta">Ready to deploy</div></div>
        <div className="card metric-card"><div className="metric-label">Tracked names</div><div className="metric-value">{watch.data?.length ?? 0}</div><div className="metric-meta">Personal watchlist</div></div>
        <div className="card metric-card"><div className="metric-label">Market update</div><div className="metric-value">{market.data?.updatedAt ? formatTime(market.data.updatedAt).split(',')[1] : '—'}</div><div className="metric-meta">Data refresh</div></div>
      </div>
    </QueryState>
    <div className="dashboard-grid">
      <div className="card card-pad"><SectionTitle title="Market movers" action="Explore all" href="/stocks" /><QueryState loading={market.isLoading} error={market.error} retry={() => void market.refetch()}><StockTable stocks={movers.slice(0, 5)} watchlist={watchSymbols} onToggle={toggleWatch} /></QueryState></div>
      <div className="card card-pad"><SectionTitle title="Indices" /><QueryState loading={market.isLoading} error={market.error} retry={() => void market.refetch()}>{indices.length ? indices.map(index => <div className="index-row" key={index.name}><div><div className="index-name">{index.name}</div><div className="index-value">{index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div></div><div className="index-right"><Sparkline positive={index.changePercent >= 0} /><div className={tone(index.changePercent)}>{signed(index.changePercent)}%</div></div></div>) : <div className="empty">No index data yet.</div>}</QueryState></div>
    </div>
    <div className="split-grid" style={{ marginTop: 16 }}>
      <div className="card card-pad"><SectionTitle title="Your watchlist" action="Manage" href="/stocks" /><QueryState loading={watch.isLoading} error={watch.error} retry={() => void watch.refetch()}>{watch.data?.length ? <StockTable stocks={watch.data.slice(0, 5)} watchlist={watchSymbols} onToggle={toggleWatch} /> : <div className="empty"><Star size={23} /><div>Your watchlist is quiet.</div><p>Star names from the explorer to keep them close.</p><Link href="/stocks" className="btn btn-secondary btn-sm" data-testid="link-empty-watchlist">Find stocks</Link></div>}</QueryState></div>
      <div className="card card-pad"><SectionTitle title="Fresh from the desk" action="All news" href="/news" /><QueryState loading={news.isLoading} error={news.error} retry={() => void news.refetch()}><div className="news-list">{(news.data ?? []).slice(0, 3).map(item => <NewsRow item={item} key={item.id} />)}</div>{!news.data?.length && <div className="empty">No headlines have landed yet.</div>}</QueryState></div>
    </div>
    <div className="footer-note"><ShieldCheck size={13} /> Educational simulation. StockSphere does not provide investment advice or execute real orders.</div>
  </div>;
}

function NewsRow({ item }: { item: NewsItem }) {
  return <Link className="news-item" href={item.symbol ? `/stocks/${item.symbol}` : '/news'} data-testid={`link-news-${item.id}`}><div className="news-meta">{item.source} · {formatDate(item.publishedAt)} {item.symbol && `· ${item.symbol}`}</div><div className="news-title">{item.title}</div><div className="news-summary">{item.summary}</div></Link>;
}

function StocksPage() {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const params = useMemo(() => ({ search: search || undefined, sector: sector || undefined }), [search, sector]);
  const stocks = useListStocks(params);
  const watch = useGetWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState('');
  const sectors = useMemo(() => Array.from(new Set((stocks.data ?? []).map(stock => stock.sector))).sort(), [stocks.data]);
  const toggleWatch = (stock: Stock) => {
    const exists = (watch.data ?? []).some(item => item.symbol === stock.symbol);
    (exists ? remove : add).mutate({ symbol: stock.symbol }, { onSuccess: data => { qc.setQueryData(getGetWatchlistQueryKey(), data); setFeedback(`${stock.symbol} ${exists ? 'removed from' : 'added to'} your watchlist`); setTimeout(() => setFeedback(''), 2200); } });
  };
  return <div className="page fade-in"><div className="page-heading"><div><div className="eyebrow">NSE · BSE universe</div><h1 className="page-title">Stock explorer</h1><p className="page-subtitle">Search the names shaping India’s public markets. Open a card for fundamentals, price history, and a paper-trade ticket.</p></div><Link href="/portfolio" className="btn btn-secondary" data-testid="link-explorer-portfolio"><BriefcaseBusiness size={14} /> View portfolio</Link></div>
    {feedback && <div className="toast-inline" data-testid="status-explorer-feedback">{feedback}</div>}
    <div className="card card-pad"><div className="search-row"><div className="search-wrap"><Search size={15} /><input className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by symbol or company name" data-testid="input-stock-search" /></div><select className="select" style={{ maxWidth: 190 }} value={sector} onChange={event => setSector(event.target.value)} data-testid="select-sector"><option value="">All sectors</option>{sectors.map(item => <option value={item} key={item}>{item}</option>)}</select></div><div className="filter-pills" style={{ marginBottom: 18 }}><button className={`pill ${!sector ? 'active' : ''}`} onClick={() => setSector('')} data-testid="button-sector-all">All names</button>{sectors.map(item => <button className={`pill ${sector === item ? 'active' : ''}`} onClick={() => setSector(item)} key={item} data-testid={`button-sector-${item}`}>{item}</button>)}</div><QueryState loading={stocks.isLoading} error={stocks.error} retry={() => void stocks.refetch()}><StockTable stocks={stocks.data ?? []} watchlist={(watch.data ?? []).map(item => item.symbol)} onToggle={toggleWatch} /></QueryState></div>
    <div className="footer-note"><Clock3 size={13} /> Prices are indicative and delayed context may apply.</div>
  </div>;
}

function Chart({ points }: { points: PricePoint[] }) {
  const safe = points.length ? points : [{ label: '—', price: 0 }];
  const min = Math.min(...safe.map(point => point.price));
  const max = Math.max(...safe.map(point => point.price));
  const spread = max - min || 1;
  const coords = safe.map((point, index) => `${(index / Math.max(safe.length - 1, 1)) * 100},${93 - ((point.price - min) / spread) * 78}`).join(' ');
  return <div className="chart-area"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chart-svg"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".2" /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" /></linearGradient></defs>{[15, 40, 65, 90].map(y => <line x1="0" x2="100" y1={y} y2={y} className="chart-gridline" key={y} />)}<polygon points={`0,100 ${coords} 100,100`} className="chart-fill" /><polyline points={coords} className="chart-line" vectorEffect="non-scaling-stroke" /></svg><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'space-between' }}>{safe.filter((_, index) => index === 0 || index === safe.length - 1 || index === Math.floor(safe.length / 2)).map((point, index) => <span className="chart-label" key={`${point.label}-${index}`}>{point.label}</span>)}</div></div>;
}

function StockDetailPage() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const detail = useGetStock(symbol);
  const history = useGetStockHistory(symbol);
  const news = useListNews({ symbol });
  const watch = useGetWatchlist();
  const portfolio = useGetPortfolio();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const order = useCreateOrder();
  const qc = useQueryClient();
  const [range, setRange] = useState('1Y');
  const visibleHistory = useMemo(() => {
    const points = history.data ?? [];
    if (range === '1D') return points;
    if (range === '1W') return points.slice(1, 8);
    if (range === '1M') return points.filter((_, index) => index % 2 === 0);
    return points.filter((_, index) => index % 2 === 1 || index === points.length - 1);
  }, [history.data, range]);
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('1');
  const [feedback, setFeedback] = useState('');
  const isWatched = (watch.data ?? []).some(item => item.symbol === symbol);
  const stock = detail.data;
  const ownedShares = portfolio.data?.holdings.find(holding => holding.symbol === symbol)?.shares ?? 0;
  const toggleWatch = () => (isWatched ? remove : add).mutate({ symbol }, { onSuccess: data => { qc.setQueryData(getGetWatchlistQueryKey(), data); setFeedback(isWatched ? 'Removed from watchlist' : 'Added to watchlist'); } });
  const placeOrder = () => {
    const numericQuantity = Number(quantity);
    if (!Number.isSafeInteger(numericQuantity) || numericQuantity < 1) { setFeedback('Enter a whole-share quantity of at least 1.'); return; }
    if (side === 'BUY' && stock && numericQuantity * stock.price > (portfolio.data?.cash ?? 0)) { setFeedback(`Not enough cash. Available: ${money(portfolio.data?.cash)}.`); return; }
    if (side === 'SELL' && numericQuantity > ownedShares) { setFeedback(`You can sell up to ${ownedShares} ${symbol} shares from your portfolio.`); return; }
    order.mutate({ data: { symbol, type: side === 'BUY' ? OrderInputType.BUY : OrderInputType.SELL, quantity: numericQuantity } }, { onSuccess: result => { setFeedback(`${result.type} filled: ${result.quantity} ${result.symbol} at ${money(result.price)} per share; ${money(result.total)} ${result.type === 'BUY' ? 'used' : 'returned to cash'}.`); void qc.invalidateQueries({ queryKey: getGetPortfolioQueryKey() }); void qc.invalidateQueries({ queryKey: getListOrdersQueryKey() }); }, onError: error => setFeedback(orderErrorMessage(error)) });
  };
  return <div className="page fade-in"><QueryState loading={detail.isLoading} error={detail.error} retry={() => void detail.refetch()}>{stock && <><div className="detail-hero"><div><div className="detail-symbol">{stock.symbol} · {stock.sector}</div><h1 className="detail-name">{stock.name}</h1><div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="detail-price">{money(stock.price)}</span><span className={`chip ${stock.changePercent >= 0 ? 'chip-green' : 'chip-red'}`}>{signed(stock.change)} · {signed(stock.changePercent)}%</span></div></div><div className="detail-actions"><button className="btn btn-secondary" onClick={toggleWatch} data-testid="button-detail-watch">{isWatched ? <Star size={14} fill="currentColor" /> : <StarOff size={14} />}{isWatched ? 'Watching' : 'Watch'}</button><Link className="btn btn-ghost" href="/stocks" data-testid="link-back-explorer"><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Explorer</Link></div></div>{feedback && <div className="toast-inline" data-testid="status-detail-feedback">{feedback}</div>}<div className="grid-2"><div className="card card-pad"><div className="section-head"><div><div className="eyebrow">Price history</div><h2 className="section-title" style={{ marginTop: 5 }}>A wider view</h2></div><div className="range-tabs">{['1D', '1W', '1M', '1Y'].map(item => <button className={`range-tab ${range === item ? 'active' : ''}`} onClick={() => setRange(item)} key={item} data-testid={`button-range-${item}`}>{item}</button>)}</div></div><QueryState loading={history.isLoading} error={history.error} retry={() => void history.refetch()}><Chart points={visibleHistory} /></QueryState></div><div className="card trade-panel"><div className="eyebrow">Practice order</div><h2 className="section-title" style={{ margin: '7px 0 16px' }}>Build a position</h2><div className="trade-toggle"><button className={side === 'BUY' ? 'active-buy' : ''} onClick={() => setSide('BUY')} data-testid="button-order-buy">Buy</button><button className={side === 'SELL' ? 'active-sell' : ''} onClick={() => setSide('SELL')} data-testid="button-order-sell">Sell</button></div><label className="field-label" htmlFor="order-quantity">Quantity</label><input id="order-quantity" className="input" type="number" min="1" value={quantity} onChange={event => setQuantity(event.target.value)} data-testid="input-order-quantity" /><div className="trade-total"><span>Estimated value</span><span>{money(stock.price * Number(quantity || 0))}</span></div><button className={`btn ${side === 'BUY' ? 'btn-primary' : 'btn-danger'}`} style={{ width: '100%', marginTop: 15 }} onClick={placeOrder} disabled={order.isPending} data-testid="button-submit-order">{order.isPending ? 'Submitting…' : `${side === 'BUY' ? 'Buy' : 'Sell'} ${stock.symbol}`}</button><div className="notice" style={{ marginTop: 15 }}><ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Paper order only. Nothing here touches a bank account.</div></div></div><div className="card fundamentals" style={{ marginTop: 16 }}>{[['52W high', money(stock.high52)], ['52W low', money(stock.low52)], ['P / E ratio', stock.peRatio.toFixed(1)], ['Dividend yield', `${stock.dividendYield.toFixed(2)}%`]].map(([label, value]) => <div className="fundamental" key={label}><div className="metric-label">{label}</div><div className="fund-value">{value}</div></div>)}</div><div className="split-grid" style={{ marginTop: 16 }}><div className="card card-pad"><div className="eyebrow">About the company</div><p className="page-subtitle" style={{ color: 'hsl(var(--foreground))', marginTop: 9 }}>{stock.description}</p></div><div className="card card-pad"><SectionTitle title="Related news" action="See all" href="/news" /><QueryState loading={news.isLoading} error={news.error} retry={() => void news.refetch()}><div className="news-list">{(news.data ?? []).slice(0, 3).map(item => <NewsRow item={item} key={item.id} />)}</div>{!news.data?.length && <div className="empty">No related headlines right now.</div>}</QueryState></div></div></>}</QueryState></div>;
}

function PortfolioPage() {
  const portfolio = useGetPortfolio();
  const orders = useListOrders();
  const [tab, setTab] = useState<'holdings' | 'orders'>('holdings');
  const value = portfolio.data?.value || 1;
  const holdings = portfolio.data?.holdings ?? [];
  return <div className="page fade-in"><div className="page-heading"><div><div className="eyebrow">Paper account · INR</div><h1 className="page-title">Your portfolio</h1><p className="page-subtitle">See what your decisions look like when the stakes are safely simulated.</p></div><Link href="/stocks" className="btn btn-primary" data-testid="link-portfolio-trade"><Plus size={14} /> Find a trade</Link></div><QueryState loading={portfolio.isLoading} error={portfolio.error} retry={() => void portfolio.refetch()}><div className="grid-4" style={{ marginBottom: 16 }}><div className="card metric-card"><div className="metric-label">Total value</div><div className="metric-value">{money(portfolio.data?.value)}</div><div className="metric-meta">Cash + invested</div></div><div className="card metric-card"><div className="metric-label">Invested</div><div className="metric-value">{money(portfolio.data?.invested)}</div><div className="metric-meta">{holdings.length} open positions</div></div><div className="card metric-card"><div className="metric-label">Cash available</div><div className="metric-value">{money(portfolio.data?.cash)}</div><div className="metric-meta">Unallocated</div></div><div className="card metric-card"><div className="metric-label">Total P / L</div><div className={`metric-value ${tone(portfolio.data?.profitLoss)}`}>{signed(portfolio.data?.profitLossPercent)}%</div><div className={`metric-meta ${tone(portfolio.data?.profitLoss)}`}>{money(portfolio.data?.profitLoss)}</div></div></div><div className="split-grid"><div className="card card-pad"><div className="section-head"><div><div className="eyebrow">Positions</div><h2 className="section-title" style={{ marginTop: 5 }}>Holdings & activity</h2></div><div className="range-tabs"><button className={`range-tab ${tab === 'holdings' ? 'active' : ''}`} onClick={() => setTab('holdings')} data-testid="button-tab-holdings">Holdings</button><button className={`range-tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')} data-testid="button-tab-orders">Orders</button></div></div>{tab === 'holdings' ? <HoldingsTable holdings={holdings} /> : <OrdersTable orders={orders.data ?? []} loading={orders.isLoading} error={orders.error} retry={() => void orders.refetch()} />}</div><div className="card card-pad"><SectionTitle title="Allocation" />{holdings.length ? <div className="allocation">{holdings.map((holding, index) => <div className="allocation-row" key={holding.symbol}><span className="font-mono">{holding.symbol}</span><div className="allocation-bar"><div className="allocation-fill" style={{ width: `${Math.max(4, holding.value / value * 100)}%`, background: `hsl(var(--chart-${(index % 5) + 1}))` }} /></div><span className="font-mono" style={{ textAlign: 'right' }}>{(holding.value / value * 100).toFixed(1)}%</span></div>)}</div> : <div className="empty"><BriefcaseBusiness size={23} />Build your first position to see allocation.</div>}</div></div></QueryState><div className="footer-note"><ShieldCheck size={13} /> This portfolio is simulated for learning. Past performance in a practice account has no predictive value.</div></div>;
}

function SellHoldingAction({ holding }: { holding: Portfolio['holdings'][number] }) {
  const [quantity, setQuantity] = useState('1');
  const order = useCreateOrder();
  const qc = useQueryClient();
  const { toast } = useToast();
  const numericQuantity = Number(quantity);
  const estimatedProceeds = numericQuantity * holding.currentPrice;
  const submit = () => {
    if (!Number.isSafeInteger(numericQuantity) || numericQuantity < 1) {
      toast({ title: 'Enter a whole-share quantity of at least 1.', variant: 'destructive' });
      return;
    }
    if (numericQuantity > holding.shares) {
      toast({ title: `You own only ${holding.shares} ${holding.symbol} shares.`, variant: 'destructive' });
      return;
    }
    order.mutate({ data: { symbol: holding.symbol, type: OrderInputType.SELL, quantity: numericQuantity } }, {
      onSuccess: result => {
        toast({ title: 'Sell order completed', description: `${result.quantity} ${result.symbol} at ${money(result.price)} each. ${money(result.total)} returned to cash.` });
        void qc.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        void qc.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      },
      onError: error => toast({ title: 'Sell order failed', description: orderErrorMessage(error), variant: 'destructive' }),
    });
  };

  return <div className="holding-sell"><div><div className="holding-sell-controls"><input className="input holding-sell-quantity" type="number" min="1" max={holding.shares} step="1" value={quantity} onChange={event => setQuantity(event.target.value)} aria-label={`Shares to sell for ${holding.symbol}`} /><span>of {holding.shares}</span><button className="btn btn-danger btn-sm" onClick={submit} disabled={order.isPending} aria-label={`Sell shares of ${holding.symbol}`}>{order.isPending ? 'Selling…' : 'Sell'}</button></div><span className="holding-sell-estimate">Est. proceeds {money(estimatedProceeds || 0)}</span></div></div>;
}

function HoldingsTable({ holdings }: { holdings: Portfolio['holdings'] }) {
  if (!holdings.length) return <div className="empty"><BriefcaseBusiness size={23} /><div>No open positions.</div><p>Your paper cash is waiting for an idea.</p><Link href="/stocks" className="btn btn-secondary btn-sm" data-testid="link-empty-portfolio">Explore stocks</Link></div>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Position</th><th>Shares</th><th>Avg. price</th><th>Value</th><th>P / L</th><th>Sell</th></tr></thead><tbody>{holdings.map(holding => <tr key={holding.symbol}><td><Link href={`/stocks/${holding.symbol}`} style={{ textDecoration: 'none', color: 'inherit' }} data-testid={`link-holding-${holding.symbol}`}><div className="stock-symbol">{holding.symbol}</div><div className="stock-company">{holding.name}</div></Link></td><td className="font-mono">{holding.shares}</td><td className="font-mono">{money(holding.averagePrice)}</td><td className="font-mono">{money(holding.value)}</td><td><span className={`chip ${holding.profitLoss >= 0 ? 'chip-green' : 'chip-red'}`}>{signed(holding.profitLossPercent)}%</span></td><td><SellHoldingAction holding={holding} /></td></tr>)}</tbody></table></div>;
}

function OrdersTable({ orders, loading, error, retry }: { orders: Array<{ id: number; symbol: string; name: string; type: string; quantity: number; price: number; total: number; createdAt: string }>; loading: boolean; error: unknown; retry: () => void }) {
  return <QueryState loading={loading} error={error} retry={retry}>{orders.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Side</th><th>Quantity</th><th>Total</th><th>Placed</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><div className="stock-symbol">{order.symbol}</div><div className="stock-company">{order.name}</div></td><td><span className={`chip ${order.type === 'BUY' ? 'chip-green' : 'chip-red'}`}>{order.type}</span></td><td className="font-mono">{order.quantity} @ {money(order.price)}</td><td className="font-mono">{money(order.total)}</td><td className="neutral">{formatTime(order.createdAt)}</td></tr>)}</tbody></table></div> : <div className="empty"><Clock3 size={23} /><div>No trades yet.</div><p>Your completed paper orders will appear here.</p></div>}</QueryState>;
}

function AlertsPage() {
  const alerts = useListAlerts();
  const create = useCreateAlert();
  const remove = useDeleteAlert();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [target, setTarget] = useState('');
  const [feedback, setFeedback] = useState('');
  const submit = () => {
    if (!symbol.trim() || !target || Number(target) < 0) { setFeedback('Add a symbol and valid target price.'); return; }
    create.mutate({ data: { symbol: symbol.trim().toUpperCase(), condition: condition === 'ABOVE' ? AlertInputCondition.ABOVE : AlertInputCondition.BELOW, targetPrice: Number(target) } }, { onSuccess: () => { setModal(false); setSymbol(''); setTarget(''); setFeedback('Alert created'); void qc.invalidateQueries({ queryKey: getListAlertsQueryKey() }); }, onError: () => setFeedback('Could not create this alert.') });
  };
  const deleteAlert = (alert: Alert) => remove.mutate({ id: alert.id }, { onSuccess: () => { setFeedback(`${alert.symbol} alert deleted`); void qc.invalidateQueries({ queryKey: getListAlertsQueryKey() }); } });
  return <div className="page fade-in"><div className="page-heading"><div><div className="eyebrow">Stay intentional</div><h1 className="page-title">Price alerts</h1><p className="page-subtitle">Set a level, then let your future self know when the market gets interesting.</p></div><button className="btn btn-primary" onClick={() => setModal(true)} data-testid="button-new-alert"><Plus size={14} /> New alert</button></div>{feedback && <div className="toast-inline" data-testid="status-alert-feedback">{feedback}</div>}<div className="card card-pad"><SectionTitle title={`${alerts.data?.length ?? 0} active rules`} /><QueryState loading={alerts.isLoading} error={alerts.error} retry={() => void alerts.refetch()}>{alerts.data?.length ? alerts.data.map(alert => <div className="alert-row" key={alert.id} data-testid={`row-alert-${alert.id}`}><div><div className="stock-symbol"><span className={`alert-status ${alert.triggered ? 'triggered' : ''}`} />{alert.symbol} <span className="stock-company" style={{ display: 'inline' }}>· {alert.name}</span></div><div className="news-meta" style={{ marginTop: 7 }}>{alert.condition === 'ABOVE' ? 'Crosses above' : 'Falls below'} {money(alert.targetPrice)} · current {money(alert.currentPrice)}</div></div><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span className={`chip ${alert.triggered ? 'chip-amber' : 'chip-green'}`}>{alert.triggered ? 'Triggered' : 'Watching'}</span><button className="icon-btn" onClick={() => deleteAlert(alert)} disabled={remove.isPending} aria-label={`Delete ${alert.symbol} alert`} data-testid={`button-delete-alert-${alert.id}`}><X size={14} /></button></div></div>) : <div className="empty"><Target size={25} /><div>No alerts set yet.</div><p>Use alerts to practise making a plan before price moves.</p><button className="btn btn-secondary btn-sm" onClick={() => setModal(true)} data-testid="button-empty-alert">Create an alert</button></div>}</QueryState></div>{modal && <div className="modal-backdrop" onClick={() => setModal(false)}><div className="modal" onClick={event => event.stopPropagation()}><div className="modal-head"><div><div className="eyebrow">New rule</div><h2 className="modal-title">Watch a price level</h2></div><button className="icon-btn" onClick={() => setModal(false)} data-testid="button-close-alert"><X size={16} /></button></div><div className="modal-form"><div><label className="field-label" htmlFor="alert-symbol">Symbol</label><input id="alert-symbol" className="input" value={symbol} onChange={event => setSymbol(event.target.value)} placeholder="e.g. INFY" data-testid="input-alert-symbol" /></div><div><label className="field-label" htmlFor="alert-condition">Condition</label><select id="alert-condition" className="select" value={condition} onChange={event => setCondition(event.target.value as 'ABOVE' | 'BELOW')} data-testid="select-alert-condition"><option value="ABOVE">Price moves above</option><option value="BELOW">Price falls below</option></select></div><div><label className="field-label" htmlFor="alert-target">Target price</label><input id="alert-target" className="input" type="number" min="0" value={target} onChange={event => setTarget(event.target.value)} placeholder="₹ 0.00" data-testid="input-alert-target" /></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setModal(false)} data-testid="button-cancel-alert">Cancel</button><button className="btn btn-primary" onClick={submit} disabled={create.isPending} data-testid="button-submit-alert">{create.isPending ? 'Saving…' : 'Create alert'}</button></div></div></div></div>}</div>;
}

function NewsPage() {
  const [symbol, setSymbol] = useState('');
  const params = useMemo(() => symbol ? { symbol } : undefined, [symbol]);
  const news = useListNews(params);
  return <div className="page fade-in"><div className="page-heading"><div><div className="eyebrow">The market, in context</div><h1 className="page-title">Market news</h1><p className="page-subtitle">Short reads for the names and themes on your radar. Read first, trade second.</p></div><div className="notice"><BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Research, not advice</div></div><div className="card card-pad"><div className="search-row"><div className="search-wrap"><Search size={15} /><input className="input" value={symbol} onChange={event => setSymbol(event.target.value.toUpperCase())} placeholder="Filter by symbol, e.g. TCS" data-testid="input-news-symbol" /></div><button className="btn btn-secondary" onClick={() => setSymbol('')} data-testid="button-clear-news-filter">Clear filter</button></div><QueryState loading={news.isLoading} error={news.error} retry={() => void news.refetch()}>{news.data?.length ? <div className="news-list">{news.data.map(item => <NewsRow item={item} key={item.id} />)}</div> : <div className="empty"><Newspaper size={25} /><div>No stories for this filter.</div><p>Try another symbol or clear the filter.</p></div>}</QueryState></div><div className="footer-note"><ShieldCheck size={13} /> Headlines are provided for educational research and should not be treated as financial advice.</div></div>;
}

function LeaderboardPage() {
  const leaderboard = useGetLeaderboard();
  return <div className="page fade-in"><div className="page-heading"><div><div className="eyebrow">Learn in public</div><h1 className="page-title">Paper-trading leaderboard</h1><p className="page-subtitle">A little friendly competition for the classroom. Returns are simulated, the lessons are real.</p></div><div className="notice"><Trophy size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Monthly snapshot</div></div><div className="card card-pad"><div className="section-head"><div><div className="eyebrow">Ranked by return</div><h2 className="section-title" style={{ marginTop: 5 }}>The practice floor</h2></div><div className="chip chip-amber">Paper only</div></div><QueryState loading={leaderboard.isLoading} error={leaderboard.error} retry={() => void leaderboard.refetch()}>{leaderboard.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Trader</th><th>Return</th><th>Portfolio value</th></tr></thead><tbody>{leaderboard.data.map(entry => <tr key={`${entry.rank}-${entry.name}`} data-testid={`row-leader-${entry.rank}`}><td className="rank">{entry.rank <= 3 ? <span className="rank-top">{entry.rank}</span> : entry.rank}</td><td><div className="leader-name"><span className="leader-avatar">{entry.initials}</span>{entry.name}</div></td><td><span className={`chip ${entry.returnPercent >= 0 ? 'chip-green' : 'chip-red'}`}>{signed(entry.returnPercent)}%</span></td><td className="font-mono">{money(entry.portfolioValue)}</td></tr>)}</tbody></table></div> : <div className="empty"><Trophy size={25} /><div>No leaderboard entries yet.</div><p>Make a practice trade to start your story.</p></div>}</QueryState></div><div className="footer-note"><ShieldCheck size={13} /> Leaderboard rankings are for motivation, not a measure of financial skill.</div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={Dashboard} /><Route path="/stocks" component={StocksPage} /><Route path="/stocks/:symbol" component={StockDetailPage} /><Route path="/portfolio" component={PortfolioPage} /><Route path="/alerts" component={AlertsPage} /><Route path="/news" component={NewsPage} /><Route path="/leaderboard" component={LeaderboardPage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function AuthGate() {
  const [state, setState] = useState<'checking' | 'authenticated' | 'signed-out'>(getToken() ? 'checking' : 'signed-out');
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    if (!getToken()) return;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => { if (!r.ok) throw new Error('expired'); return r.json() as Promise<AuthUser>; }).then(authenticatedUser => { setUser(authenticatedUser); setState('authenticated'); }).catch(() => { clearToken(); setState('signed-out'); });
  }, []);
  if (state === 'checking') return <div className="modal-backdrop" style={{ position: 'fixed', inset: 0 }}><div className="modal"><div className="eyebrow">StockSphere</div><h2 className="modal-title">Checking your session…</h2></div></div>;
  if (state === 'signed-out') return <AuthPage onAuthenticated={authenticatedUser => { setUser(authenticatedUser); setState('authenticated'); }} />;
  return <AuthUserContext.Provider value={user}><Router /></AuthUserContext.Provider>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AuthGate /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;