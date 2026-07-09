const fs = require('fs');
const path = require('path');

class TopupCatalogService {
  constructor() {
    this.catalogs = [];
    this.offersMap = new Map();
    this.loadCatalogs();
  }

  loadCatalogs() {
    try {
      const dataDir = path.join(__dirname, '../data');
      const files = fs.readdirSync(dataDir);
      
      this.catalogs = [];
      this.offersMap.clear();

      files.forEach(file => {
        if (file.endsWith('_offers.json')) {
          const jsonPath = path.join(dataDir, file);
          const data = fs.readFileSync(jsonPath, 'utf8');
          const catalogData = JSON.parse(data);
          
          this.catalogs.push(catalogData);

          catalogData.offers.forEach(offer => {
            // Attach category_id so we know where it came from
            const enrichedOffer = {
              ...offer,
              category_id: catalogData.category_id
            };
            this.offersMap.set(offer.offer_id, enrichedOffer);
          });
          
          console.log(`Loaded ${catalogData.offers.length} offers from ${catalogData.name} catalog.`);
        }
      });
    } catch (err) {
      console.error('Failed to load Topup Catalogs:', err.message);
    }
  }

  getCatalogs() {
    if (this.catalogs.length === 0) this.loadCatalogs();
    return this.catalogs;
  }

  getOfferDetails(offerId) {
    if (this.catalogs.length === 0) this.loadCatalogs();
    return this.offersMap.get(offerId);
  }
}

module.exports = new TopupCatalogService();
