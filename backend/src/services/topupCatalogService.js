const fs = require('fs');
const path = require('path');

class TopupCatalogService {
  constructor() {
    this.catalogData = null;
    this.offersMap = new Map();
    this.loadCatalog();
  }

  loadCatalog() {
    try {
      // Load the single source of truth JSON file from the project root
      const jsonPath = path.resolve(__dirname, '../../../../free_fire_mena_offers.json');
      const data = fs.readFileSync(jsonPath, 'utf8');
      this.catalogData = JSON.parse(data);

      this.catalogData.offers.forEach(offer => {
        this.offersMap.set(offer.offer_id, offer);
      });
      console.log(`Loaded ${this.catalogData.offers.length} offers from Free Fire MENA catalog.`);
    } catch (err) {
      console.error('Failed to load Topup Catalog JSON:', err.message);
    }
  }

  getCatalog() {
    if (!this.catalogData) this.loadCatalog();
    return this.catalogData;
  }

  getOfferDetails(offerId) {
    if (!this.catalogData) this.loadCatalog();
    return this.offersMap.get(offerId);
  }

  getDynamicFields() {
    if (!this.catalogData) this.loadCatalog();
    return this.catalogData.fields || [];
  }
}

module.exports = new TopupCatalogService();
