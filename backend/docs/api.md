# INE Product Price Tracker — REST API Specification

This document details all available REST API endpoints exposed by the Node.js/Express backend.

---

## Base URL
`http://localhost:5000/api/products`

---

## 1. Search Products
Search the INE mock storefront product catalog by query keyword.

- **Method**: `GET`
- **Path**: `/api/products/search?q=<query>`
- **Query Parameters**:
  - `q` (required, string): Search term (e.g. `basecamp`, `audio`, `watch`).
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "products": [
      {
        "name": "Basecamp Bridge Hub Lite",
        "url": "https://demo.inelabteamdev.com/product/376",
        "externalProductId": "376"
      }
    ]
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Search query parameter `q` is missing or empty string.

---

## 2. Track Product
Save a product to the database for price tracking.

- **Method**: `POST`
- **Path**: `/api/products/track`
- **Body**:
  ```json
  {
    "productName": "Basecamp Bridge Hub Lite",
    "productUrl": "https://demo.inelabteamdev.com/product/376",
    "externalProductId": "376"
  }
  ```
- **Response Success (201 Created)**:
  ```json
  {
    "success": true,
    "product": {
      "id": "8f66bd9b-3a3a-4a64-970f-0d965300afc5",
      "productName": "Basecamp Bridge Hub Lite",
      "productUrl": "https://demo.inelabteamdev.com/product/376",
      "externalProductId": "376",
      "isActive": true,
      "createdAt": "2026-09-19T10:49:44.123Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `productName` or `productUrl` is missing, or `productUrl` does not belong to `demo.inelabteamdev.com`.
  - `409 Conflict`: Product URL is already being tracked (`DUPLICATE_PRODUCT`).

---

## 3. Get Tracked Products
Retrieve all active tracked products.

- **Method**: `GET`
- **Path**: `/api/products`
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "products": [
      {
        "id": "8f66bd9b-3a3a-4a64-970f-0d965300afc5",
        "productName": "Basecamp Bridge Hub Lite",
        "productUrl": "https://demo.inelabteamdev.com/product/376",
        "externalProductId": "376",
        "isActive": true,
        "createdAt": "2026-09-19T10:49:44.123Z"
      }
    ]
  }
  ```

---

## 4. Get Product Price History
Retrieve historical price and stock data points for a tracked product.

- **Method**: `GET`
- **Path**: `/api/products/:id/history`
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "product": {
      "id": "8f66bd9b-3a3a-4a64-970f-0d965300afc5",
      "productName": "Basecamp Bridge Hub Lite"
    },
    "history": [
      {
        "price": 8969,
        "stock": "Only 91 left",
        "scrapedAt": "2026-09-19T10:49:44.123Z"
      }
    ]
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Tracked product ID does not exist (`PRODUCT_NOT_FOUND`).

---

## 5. Get Scrape Logs
Retrieve historical scrape attempt logs for a tracked product.

- **Method**: `GET`
- **Path**: `/api/products/:id/logs`
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "product": {
      "id": "8f66bd9b-3a3a-4a64-970f-0d965300afc5",
      "productName": "Basecamp Bridge Hub Lite"
    },
    "logs": [
      {
        "status": "success",
        "attemptNumber": 2,
        "errorMessage": null,
        "durationMs": 4550,
        "createdAt": "2026-09-19T10:49:44.123Z"
      },
      {
        "status": "retrying",
        "attemptNumber": 1,
        "errorMessage": "VALIDATION_ERROR: Price could not be extracted",
        "durationMs": 1200,
        "createdAt": "2026-09-19T10:49:38.123Z"
      }
    ]
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Tracked product ID does not exist (`PRODUCT_NOT_FOUND`).

---

## 6. Manual Scrape
Trigger an immediate, manual scrape for an existing tracked product.

- **Method**: `POST`
- **Path**: `/api/products/:id/scrape`
- **Response Success (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "price": 8969,
      "stock": "Only 91 left",
      "scrapedAt": "2026-09-19T10:50:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Product ID not found.
  - `502 Bad Gateway`: Scraper failed after 3 attempts (`SCRAPE_FAILED`).
