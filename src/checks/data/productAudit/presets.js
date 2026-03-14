/* =========================================================
   PRODUCT EXPORT PRESETS
   ========================================================= */

const PRESETS = {
  importQueue: {
    label: "Import → Amazon Listing Queue",
    predicate: {
      type: "and",
      predicates: [
        {
          property: "storeProductStatus",
          type: "eq",
          value: "IN_LISTING_QUEUE",
        },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  productDiscoveryQueue: {
    label: "Product Discovery Queue",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "NO_DATA" },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "QUEUED",
        },
      ],
    },
  },

  noData: {
    label: "No Data (Not Found)",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "NO_DATA" },
      ],
    },
  },

  criteriaQueue: {
    label: "Criteria Evaluation Queue",
    predicate: {
      type: "and",
      predicates: [
        {
          property: "storeProductStatus",
          type: "eq",
          value: "IN_CRITERIA_QUEUE",
        },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  outOfCriteria: {
    label: "Out of Criteria",
    predicate: {
      type: "and",
      predicates: [
        {
          property: "storeProductStatus",
          type: "eq",
          value: "OUT_OF_CRITERIA",
        },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  pendingApproval: {
    label: "Pending Approval",
    predicate: {
      type: "and",
      predicates: [
        {
          property: "storeProductStatus",
          type: "eq",
          value: "PENDING_APPROVE",
        },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  accepted: {
    label: "Accepted (Ready for Activation)",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "ACCEPTED" },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  active: {
    label: "Active Products",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "ACTIVE" },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  buyable: {
    label: "Amazon BUYABLE Listings",
    predicate: {
      type: "and",
      predicates: [
        { property: "amazonListingsItemStatus", type: "eq", value: "BUYABLE" },
      ],
    },
  },

  discoverable: {
    label: "Amazon DISCOVERABLE Listings",
    predicate: {
      type: "and",
      predicates: [
        {
          property: "amazonListingsItemStatus",
          type: "eq",
          value: "DISCOVERABLE",
        },
      ],
    },
  },

  inactive: {
    label: "Store INACTIVE Products",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "INACTIVE" },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },

  incomplete: {
    label: "Incomplete Products",
    predicate: {
      type: "and",
      predicates: [
        { property: "storeProductStatus", type: "eq", value: "INCOMPLETE" },
        {
          property: "marketplaceProduct.marketplaceProductStatus",
          type: "eq",
          value: "ACTIVE",
        },
      ],
    },
  },
};

module.exports = { PRESETS };
