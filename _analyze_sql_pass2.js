const fs = require("fs");
const readline = require("readline");
const path = require("path");

const sqlPath = path.join(__dirname, "brassleaf_wp416_cornerstone.sql");
const rl = readline.createInterface({
  input: fs.createReadStream(sqlPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

const postTypes = {};
const orderStatuses = {};
const orderTypes = {};
const paymentMethods = {};
const itemTypes = {};
const taxonomies = {};
const capabilityRoles = {};
const wcOrdersMetaKeys = {};
const interestingPostMeta = new Set();
const indexes = {};
const autoIncCols = {};
const stockStatuses = {};
const termRows = [];

let currentAlter = null;
let currentTable = null;
let inPosts = false;
let inPostmeta = false;
let inUsers = false;
let inUsermeta = false;
let inTerms = false;
let inTermTax = false;
let inWcOrders = false;
let inWcOrdersMeta = false;
let inOrderItems = false;
let inProductLookup = false;
let inPaytm = false;
let inCouponLookup = false;
let inPaymentTokens = false;
let inWcApiKeys = false;
let inComments = false;
let inOrderAddresses = false;

let posts = 0;
let postmeta = 0;
let users = 0;
let comments = 0;
let wcOrders = 0;
let orderItems = 0;
let productLookup = 0;
let paytm = 0;
let couponLookup = 0;
let paymentTokens = 0;
let apiKeys = 0;
let thumbnailCount = 0;
let galleryCount = 0;
let attachedFileCount = 0;
let addressRows = 0;

function setTable(name) {
  currentTable = name;
  inPosts = name === "wpwd_posts";
  inPostmeta = name === "wpwd_postmeta";
  inUsers = name === "wpwd_users";
  inUsermeta = name === "wpwd_usermeta";
  inTerms = name === "wpwd_terms";
  inTermTax = name === "wpwd_term_taxonomy";
  inComments = name === "wpwd_comments";
  inWcOrders = name === "wpwd_wc_orders";
  inWcOrdersMeta = name === "wpwd_wc_orders_meta";
  inOrderItems = name === "wpwd_woocommerce_order_items";
  inProductLookup = name === "wpwd_wc_product_meta_lookup";
  inPaytm = name === "wpwd_paytm_order_data";
  inCouponLookup = name === "wpwd_wc_order_coupon_lookup";
  inPaymentTokens = name === "wpwd_woocommerce_payment_tokens";
  inWcApiKeys = name === "wpwd_woocommerce_api_keys";
  inOrderAddresses = name === "wpwd_wc_order_addresses";
}

function countTuples(line) {
  let c = 0;
  for (let i = 0; i < line.length - 1; i++) {
    if (line[i] === ")" && (line[i + 1] === "," || line[i + 1] === ";")) c++;
  }
  return c;
}

const POST_TYPES = [
  "product",
  "product_variation",
  "attachment",
  "page",
  "post",
  "revision",
  "nav_menu_item",
  "shop_order",
  "shop_order_placehold",
  "shop_coupon",
  "shop_order_refund",
  "elementor_library",
  "wp_navigation",
  "wpcf7_contact_form",
  "custom_css",
  "oembed_cache",
  "wp_global_styles",
];

(async () => {
  for await (const line of rl) {
    const t = line.trim();
    if (t.startsWith("INSERT INTO")) {
      const m = t.match(/INSERT INTO `([^`]+)`/);
      if (m) setTable(m[1]);
    }
    if (t.startsWith("ALTER TABLE")) {
      const m = t.match(/ALTER TABLE `([^`]+)`/);
      currentAlter = m ? m[1] : null;
      if (currentAlter && !indexes[currentAlter]) indexes[currentAlter] = [];
    }
    if (currentAlter && (t.includes("ADD PRIMARY KEY") || t.includes("ADD KEY") || t.includes("ADD UNIQUE"))) {
      indexes[currentAlter].push(t.replace(/,$/, "").trim());
    }
    if (currentAlter && t.startsWith("MODIFY") && t.includes("AUTO_INCREMENT")) {
      const mm = t.match(/MODIFY `([^`]+)`/);
      if (mm) {
        autoIncCols[currentAlter] = autoIncCols[currentAlter] || [];
        autoIncCols[currentAlter].push(mm[1]);
      }
    }

    const tuples = countTuples(t);

    if (inPosts) {
      posts += tuples;
      for (const pt of POST_TYPES) {
        if (t.includes(", '" + pt + "', '")) {
          postTypes[pt] = (postTypes[pt] || 0) + 1;
        }
      }
    }
    if (inPostmeta) {
      postmeta += tuples;
      const keys = [
        "_sku",
        "_price",
        "_regular_price",
        "_sale_price",
        "_stock",
        "_stock_status",
        "_manage_stock",
        "_thumbnail_id",
        "_product_image_gallery",
        "_product_attributes",
        "_variation_description",
        "_virtual",
        "_downloadable",
        "_weight",
        "_length",
        "_width",
        "_height",
        "_tax_status",
        "_tax_class",
        "_wp_attached_file",
        "_wp_attachment_metadata",
        "total_sales",
        "_children",
        "_default_attributes",
        "attribute_pa_size",
        "_backorders",
        "_sold_individually",
        "_low_stock_amount",
        "_downloadable_files",
        "_sale_price_dates_from",
        "_sale_price_dates_to",
        "_min_variation_price",
        "_max_variation_price",
        "_coupon_amount",
        "discount_type",
        "_elementor_data",
      ];
      for (const k of keys) {
        if (t.includes("'" + k + "'")) {
          interestingPostMeta.add(k);
          if (k === "_thumbnail_id") thumbnailCount += tuples;
          if (k === "_product_image_gallery") galleryCount += tuples;
          if (k === "_wp_attached_file") attachedFileCount += tuples;
        }
      }
      if (t.includes("'_stock_status'")) {
        if (t.includes("'instock'")) stockStatuses.instock = (stockStatuses.instock || 0) + 1;
        if (t.includes("'outofstock'")) stockStatuses.outofstock = (stockStatuses.outofstock || 0) + 1;
        if (t.includes("'onbackorder'")) stockStatuses.onbackorder = (stockStatuses.onbackorder || 0) + 1;
      }
    }
    if (inUsers) users += tuples;
    if (inUsermeta && t.includes("'wpwd_capabilities'")) {
      const m = t.match(/s:\d+:\\"([a-zA-Z0-9_-]+)\\";b:1/);
      const m2 = t.match(/s:\d+:"([a-zA-Z0-9_-]+)";b:1/);
      const role = (m && m[1]) || (m2 && m2[1]);
      if (role) capabilityRoles[role] = (capabilityRoles[role] || 0) + 1;
    }
    if (inComments) comments += tuples;
    if (inWcOrders) {
      wcOrders += tuples;
      for (const st of [
        "wc-pending",
        "wc-processing",
        "wc-on-hold",
        "wc-completed",
        "wc-cancelled",
        "wc-refunded",
        "wc-failed",
        "wc-checkout-draft",
      ]) {
        if (t.includes("'" + st + "'")) orderStatuses[st] = (orderStatuses[st] || 0) + 1;
      }
      if (t.includes("'shop_order'")) orderTypes.shop_order = (orderTypes.shop_order || 0) + 1;
      if (t.includes("'shop_order_refund'")) orderTypes.shop_order_refund = (orderTypes.shop_order_refund || 0) + 1;
      if (t.includes("'paytm'")) paymentMethods.paytm = (paymentMethods.paytm || 0) + 1;
      if (t.includes("'cod'")) paymentMethods.cod = (paymentMethods.cod || 0) + 1;
    }
    if (inWcOrdersMeta) {
      const keys = [
        "is_vat_exempt",
        "_billing_address_index",
        "_shipping_address_index",
        "_wcpdf_invoice_number",
        "_wcpdf_invoice_date",
        "_paytm_txn_id",
        "_transaction_id",
        "_paid_date",
        "_date_paid",
        "partial_shipped",
        "_wc_shipment",
      ];
      for (const k of keys) {
        if (t.includes("'" + k + "'")) wcOrdersMetaKeys[k] = (wcOrdersMetaKeys[k] || 0) + 1;
      }
      if (t.includes("_wcpdf_")) wcOrdersMetaKeys["_wcpdf_*"] = (wcOrdersMetaKeys["_wcpdf_*"] || 0) + 1;
      if (t.includes("_wc_order_attribution_"))
        wcOrdersMetaKeys["_wc_order_attribution_*"] = (wcOrdersMetaKeys["_wc_order_attribution_*"] || 0) + 1;
      if (t.includes("paytm")) wcOrdersMetaKeys["*paytm*"] = (wcOrdersMetaKeys["*paytm*"] || 0) + 1;
    }
    if (inOrderItems) {
      orderItems += tuples;
      for (const it of ["line_item", "shipping", "fee", "tax", "coupon"]) {
        if (t.includes("'" + it + "'")) itemTypes[it] = (itemTypes[it] || 0) + 1;
      }
    }
    if (inProductLookup) productLookup += tuples;
    if (inPaytm) paytm += tuples;
    if (inCouponLookup) couponLookup += tuples;
    if (inPaymentTokens) paymentTokens += tuples;
    if (inWcApiKeys) apiKeys += tuples;
    if (inOrderAddresses) addressRows += tuples;
    if (inTermTax) {
      for (const q of [
        "product_cat",
        "product_tag",
        "product_type",
        "product_visibility",
        "product_shipping_class",
        "pa_size",
        "category",
        "post_tag",
        "nav_menu",
        "elementor_library_type",
        "wp_theme",
      ]) {
        if (t.includes("'" + q + "'")) taxonomies[q] = (taxonomies[q] || 0) + 1;
      }
    }
    if (inTerms) {
      const m = t.match(/^\((\d+), '([^']*)', '([^']*)',/);
      if (m) termRows.push({ id: m[1], name: m[2], slug: m[3] });
    }
  }

  const out = {
    counts: {
      posts,
      postmeta,
      users,
      comments,
      wcOrders,
      orderItems,
      productLookup,
      paytm,
      couponLookup,
      paymentTokens,
      apiKeys,
      thumbnailCount,
      galleryCount,
      attachedFileCount,
      addressRows,
    },
    postTypes,
    orderStatuses,
    orderTypes,
    paymentMethods,
    itemTypes,
    taxonomies,
    capabilityRoles,
    wcOrdersMetaKeys,
    interestingPostMeta: [...interestingPostMeta].sort(),
    stockStatuses,
    autoIncCols,
    indexSample: Object.fromEntries(
      Object.entries(indexes)
        .filter(([k]) =>
          [
            "wpwd_posts",
            "wpwd_postmeta",
            "wpwd_users",
            "wpwd_usermeta",
            "wpwd_wc_orders",
            "wpwd_wc_orders_meta",
            "wpwd_woocommerce_order_items",
            "wpwd_woocommerce_order_itemmeta",
            "wpwd_terms",
            "wpwd_term_taxonomy",
            "wpwd_term_relationships",
          ].includes(k)
        )
        .map(([k, v]) => [k, v])
    ),
    termCount: termRows.length,
    terms: termRows,
  };
  fs.writeFileSync(path.join(__dirname, "_analysis_tmp", "pass2.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ...out, terms: termRows.map((x) => x.name + " (" + x.slug + ")") }, null, 2));
})();
