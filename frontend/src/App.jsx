import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { SearchProducts } from './components/SearchProducts';
import { TrackedProducts } from './components/TrackedProducts';
import { ProductDetails } from './components/ProductDetails';
import { PriceHistoryChart } from './components/PriceHistoryChart';
import { HistoryTable } from './components/HistoryTable';
import { ScrapeLogs } from './components/ScrapeLogs';
import './index.css';

export default function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  const [loadingTracked, setLoadingTracked] = useState(true);
  const [trackedError, setTrackedError] = useState(null);

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [scrapeSuccess, setScrapeSuccess] = useState(null);

  // 1. Select Product & Load Details (History + Logs)
  const handleSelectProduct = useCallback(async (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setLoadingDetails(true);
    setDetailsError(null);
    setScrapeError(null);
    setScrapeSuccess(null);

    try {
      const [historyRes, logsRes] = await Promise.all([
        api.getProductHistory(product.id).catch(() => ({ history: [] })),
        api.getScrapeLogs(product.id).catch(() => ({ logs: [] }))
      ]);

      setHistory(historyRes.history || []);
      setLogs(logsRes.logs || []);
    } catch (err) {
      setDetailsError(err.message || 'Failed to load details for product.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // 2. Load Tracked Products on mount or after tracking a new product
  const loadTrackedProducts = useCallback(async (selectId = null) => {
    setLoadingTracked(true);
    setTrackedError(null);
    try {
      const data = await api.getTrackedProducts();
      const list = data.products || [];
      setTrackedProducts(list);

      if (list.length > 0) {
        if (selectId) {
          const target = list.find(p => p.id === selectId);
          if (target) handleSelectProduct(target);
        } else {
          // Auto-select first item on initial load if none selected
          setSelectedProduct(current => {
            if (!current) {
              handleSelectProduct(list[0]);
              return list[0];
            }
            return current;
          });
        }
      }
    } catch (err) {
      setTrackedError(err.message || 'Failed to load tracked products.');
    } finally {
      setLoadingTracked(false);
    }
  }, [handleSelectProduct]);

  useEffect(() => {
    loadTrackedProducts();
  }, [loadTrackedProducts]);

  // 3. Trigger Manual Scrape
  const handleManualScrape = async (productId) => {
    if (!productId || scraping) return;

    setScraping(true);
    setScrapeError(null);
    setScrapeSuccess(null);

    try {
      const res = await api.manualScrape(productId);
      setScrapeSuccess(`Scrape completed! Price: ₹${res.data.price} (${res.data.stock})`);
      
      // Refresh history & logs
      if (selectedProduct) {
        const [historyRes, logsRes] = await Promise.all([
          api.getProductHistory(selectedProduct.id),
          api.getScrapeLogs(selectedProduct.id)
        ]);
        setHistory(historyRes.history || []);
        setLogs(logsRes.logs || []);
      }
    } catch (err) {
      setScrapeError(err.message || 'Manual scrape failed after retries.');
      
      // Refresh logs to show failure log
      if (selectedProduct) {
        const logsRes = await api.getScrapeLogs(selectedProduct.id).catch(() => ({ logs: [] }));
        setLogs(logsRes.logs || []);
      }
    } finally {
      setScraping(false);
    }
  };

  const latestHistoryRecord = history.length > 0 ? history[0] : null;

  return (
    <div className="app-layout">
      <Navbar activeCount={trackedProducts.length} />

      <main className="dashboard-container">
        {/* Top Search Section */}
        <SearchProducts onProductTracked={(newProd) => loadTrackedProducts(newProd.id)} />

        {/* Main 2-Column Dashboard Body */}
        <div className="dashboard-grid">
          {/* Left Column: Tracked Products Sidebar */}
          <aside className="sidebar-col">
            <TrackedProducts
              products={trackedProducts}
              selectedId={selectedProduct?.id}
              onSelectProduct={handleSelectProduct}
              loading={loadingTracked}
              error={trackedError}
            />
          </aside>

          {/* Right Column: Selected Product Details & Telemetry */}
          <section className="main-content-col">
            <ProductDetails
              product={selectedProduct}
              latestHistory={latestHistoryRecord}
              onScrapeNow={handleManualScrape}
              scraping={scraping}
              scrapeError={scrapeError}
              scrapeSuccess={scrapeSuccess}
            />

            {selectedProduct && (
              <>
                <PriceHistoryChart history={history} />
                
                <div className="tables-grid">
                  <HistoryTable history={history} loading={loadingDetails} error={detailsError} />
                  <ScrapeLogs logs={logs} loading={loadingDetails} error={detailsError} />
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
