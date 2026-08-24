const fs = require("fs");
const readline = require("readline");
const path = require("path");

const sqlPath = path.join(__dirname, "brassleaf_wp416_cornerstone.sql");
const outDir = path.join(__dirname, "_analysis_tmp");
fs.mkdirSync(outDir, { recursive: true });

const tables = [];
let currentTable = null;
let collectingCreate = false;
let createBuf = [];
let collectingAlter = false;
let alterBuf = [];
let alterTableName = null;
const alters = {};

const insertCounts = {};
const postTypes = {};
const taxonomies = {};
const productMetaKeys = new Set();
const variationMetaKeys = new Set();
const userMetaKeys = new Set();
const orderMetaKeys = new Set();
const wcOrdersMetaKeys = new Set();
const orderItemMetaKeys = new Set();
const termMetaKeys = new Set();
const optionNames = new Set();
const couponMetaKeys = new Set();
const paymentMethods = {};
const orderStatuses = {};
const orderTypes = {};
const paytmColsSample = [];
const commentsTypes = {};
const itemTypes = {};
const addressTypes = {};
const hposEnabledHints = [];
const siteurlHints = [];
let usersCreate = "";
let wcOrdersCreate = "";
let wcCustomerCreate = "";
let productMetaLookupCreate = "";
let orderItemsCreate = "";
let orderItemmetaCreate = "";
let postsCreate = "";
let postmetaCreate = "";
let ordersMetaCreate = "";
let orderAddressesCreate = "";
let orderOperationalCreate = "";
let paytmCreate = "";
let paymentTokensCreate = "";
let termsCreate = "";
let termTaxCreate = "";
let usersSchema = "";

let inPostsInsert = false;
let inPostmetaInsert = false;
let inTermTaxInsert = false;
let inUsermetaInsert = false;
let inWcOrdersInsert = false;
let inWcOrdersMetaInsert = false;
let inOrderItemmetaInsert = false;
let inOrderItemsInsert = false;
let inTermmetaInsert = false;
let inOptionsInsert = false;
let inCustomerLookupInsert = false;
let inCommentsInsert = false;
let inOrderAddressesInsert = false;
let inPaytmInsert = false;
let currentInsertTable = null;

let postsRowCount = 0;
let postmetaRowCount = 0;
let usersRowCount = 0;
let customerLookupCount = 0;
let wcOrdersCount = 0;
let orderItemsCount = 0;
let attachmentsCount = 0;
let productCount = 0;
let variationCount = 0;
let shopOrderPostCount = 0;
let couponPostCount = 0;
let pageCount = 0;
let revisionCount = 0;

function setInsertTable(name) {
  currentInsertTable = name;
  inPostsInsert = name === "wpwd_posts";
  inPostmetaInsert = name === "wpwd_postmeta";
  inTermTaxInsert = name === "wpwd_term_taxonomy";
  inUsermetaInsert = name === "wpwd_usermeta";
  inWcOrdersInsert = name === "wpwd_wc_orders";
  inWcOrdersMetaInsert = name === "wpwd_wc_orders_meta";
  inOrderItemmetaInsert = name === "wpwd_woocommerce_order_itemmeta";
  inOrderItemsInsert = name === "wpwd_woocommerce_order_items";
  inTermmetaInsert = name === "wpwd_termmeta";
  inOptionsInsert = name === "wpwd_options";
  inCustomerLookupInsert = name === "wpwd_wc_customer_lookup";
  inCommentsInsert = name === "wpwd_comments";
  inOrderAddressesInsert = name === "wpwd_wc_order_addresses";
  inPaytmInsert = name === "wpwd_paytm_order_data";
}

function parseSqlTuples(chunk) {
  // Very rough: count '),(' style tuples on INSERT lines
  let count = 0;
  for (let i = 0; i < chunk.length - 1; i++) {
    if (chunk[i] === ")" && chunk[i + 1] === ",") count++;
  }
  if (/\)\s*;\s*$/.test(chunk)) count++;
  return count;
}

function extractQuotedStrings(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "'") {
      let j = i + 1;
      let buf = "";
      while (j < s.length) {
        if (s[j] === "\\" ) {
          buf += s[j] + (s[j + 1] || "");
          j += 2;
          continue;
        }
        if (s[j] === "'") {
          if (s[j + 1] === "'") {
            buf += "'";
            j += 2;
            continue;
          }
          break;
        }
        buf += s[j];
        j++;
      }
      out.push(buf);
      i = j + 1;
    } else i++;
  }
  return out;
}

async function main() {
  const st = fs.statSync(sqlPath);
  console.log("FILE_SIZE_MB", (st.size / 1024 / 1024).toFixed(2));

  const rl = readline.createInterface({
    input: fs.createReadStream(sqlPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const t = line.trim();

    if (t.startsWith("CREATE TABLE")) {
      collectingCreate = true;
      createBuf = [line];
      const m = t.match(/CREATE TABLE `([^`]+)`/);
      currentTable = m ? m[1] : null;
      continue;
    }
    if (collectingCreate) {
      createBuf.push(line);
      if (t.includes("ENGINE=") || (t.endsWith(";") && t.includes("CHARSET"))) {
        const ddl = createBuf.join("\n");
        tables.push({ name: currentTable, ddl });
        if (currentTable === "wpwd_users") usersCreate = ddl;
        if (currentTable === "wpwd_wc_orders") wcOrdersCreate = ddl;
        if (currentTable === "wpwd_wc_customer_lookup") wcCustomerCreate = ddl;
        if (currentTable === "wpwd_wc_product_meta_lookup") productMetaLookupCreate = ddl;
        if (currentTable === "wpwd_woocommerce_order_items") orderItemsCreate = ddl;
        if (currentTable === "wpwd_woocommerce_order_itemmeta") orderItemmetaCreate = ddl;
        if (currentTable === "wpwd_posts") postsCreate = ddl;
        if (currentTable === "wpwd_postmeta") postmetaCreate = ddl;
        if (currentTable === "wpwd_wc_orders_meta") ordersMetaCreate = ddl;
        if (currentTable === "wpwd_wc_order_addresses") orderAddressesCreate = ddl;
        if (currentTable === "wpwd_wc_order_operational_data") orderOperationalCreate = ddl;
        if (currentTable === "wpwd_paytm_order_data") paytmCreate = ddl;
        if (currentTable === "wpwd_woocommerce_payment_tokens") paymentTokensCreate = ddl;
        if (currentTable === "wpwd_terms") termsCreate = ddl;
        if (currentTable === "wpwd_term_taxonomy") termTaxCreate = ddl;
        collectingCreate = false;
        createBuf = [];
      }
      continue;
    }

    if (t.startsWith("ALTER TABLE")) {
      collectingAlter = true;
      alterBuf = [line];
      const m = t.match(/ALTER TABLE `([^`]+)`/);
      alterTableName = m ? m[1] : null;
      continue;
    }
    if (collectingAlter) {
      alterBuf.push(line);
      if (t.endsWith(";")) {
        const ddl = alterBuf.join("\n");
        if (!alters[alterTableName]) alters[alterTableName] = [];
        alters[alterTableName].push(ddl);
        collectingAlter = false;
        alterBuf = [];
      }
      continue;
    }

    if (t.startsWith("INSERT INTO")) {
      const m = t.match(/INSERT INTO `([^`]+)`/);
      if (m) {
        setInsertTable(m[1]);
        insertCounts[m[1]] = (insertCounts[m[1]] || 0) + 1;
      }
    }

    if (currentInsertTable) {
      // Count approximate rows from tuple closings
      if (t.includes("(") && (t.includes("),") || t.endsWith(");") || t.endsWith("),"))) {
        const c = parseSqlTuples(t);
        if (inPostsInsert) postsRowCount += c;
        if (inPostmetaInsert) postmetaRowCount += c;
        if (currentInsertTable === "wpwd_users") usersRowCount += c;
        if (inCustomerLookupInsert) customerLookupCount += c;
        if (inWcOrdersInsert) wcOrdersCount += c;
        if (inOrderItemsInsert) orderItemsCount += c;
      }
    }

    if (inPostsInsert) {
      // post_type is a quoted field; count known types if present as standalone quoted values
      const types = [
        "product",
        "product_variation",
        "shop_order",
        "shop_coupon",
        "shop_order_placehold",
        "attachment",
        "page",
        "post",
        "revision",
        "nav_menu_item",
        "elementor_library",
        "wp_navigation",
        "wp_global_styles",
        "custom_css",
        "oembed_cache",
        "shop_webhook",
        "shop_order_refund",
      ];
      for (const pt of types) {
        // count occurrences of ,'post_type' pattern is hard; count ,'product',
        const re = new RegExp(`,'${pt}',`, "g");
        const matches = t.match(re);
        if (matches) {
          postTypes[pt] = (postTypes[pt] || 0) + matches.length;
        }
      }
    }

    if (inTermTaxInsert) {
      const qs = extractQuotedStrings(t);
      // taxonomy is typically a quoted string among fields
      for (const q of qs) {
        if (
          q === "product_cat" ||
          q === "product_tag" ||
          q === "product_type" ||
          q === "product_visibility" ||
          q === "product_shipping_class" ||
          q === "pa_color" ||
          q.startsWith("pa_") ||
          q === "category" ||
          q === "post_tag" ||
          q === "nav_menu" ||
          q === "wp_theme" ||
          q === "wp_template_part_area" ||
          q === "elementor_library_type" ||
          q === "coupon_cat"
        ) {
          taxonomies[q] = (taxonomies[q] || 0) + 1;
        }
      }
    }

    if (inPostmetaInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q.startsWith("_") ||
          q.startsWith("attribute_") ||
          q.includes("price") ||
          q.includes("sku") ||
          q.includes("stock") ||
          q.includes("gallery") ||
          q.includes("thumbnail")
        ) {
          if (
            q === "_sku" ||
            q === "_price" ||
            q === "_regular_price" ||
            q === "_sale_price" ||
            q === "_stock" ||
            q === "_stock_status" ||
            q === "_manage_stock" ||
            q === "_thumbnail_id" ||
            q === "_product_image_gallery" ||
            q === "_product_attributes" ||
            q === "_variation_description" ||
            q === "_virtual" ||
            q === "_downloadable" ||
            q === "_weight" ||
            q === "_length" ||
            q === "_width" ||
            q === "_height" ||
            q === "_tax_status" ||
            q === "_tax_class" ||
            q === "_sold_individually" ||
            q === "_backorders" ||
            q === "_low_stock_amount" ||
            q === "total_sales" ||
            q === "_product_version" ||
            q === "_wc_average_rating" ||
            q === "_wc_review_count" ||
            q === "_wp_attached_file" ||
            q === "_wp_attachment_metadata" ||
            q === "_wp_attached_file" ||
            q.startsWith("attribute_") ||
            q === "_downloadable_files" ||
            q === "_sale_price_dates_from" ||
            q === "_sale_price_dates_to" ||
            q === "_default_attributes" ||
            q === "_children" ||
            q === "_min_variation_price" ||
            q === "_max_variation_price" ||
            q === "_min_price_variation_id" ||
            q === "_max_price_variation_id" ||
            q === "_coupon_amount" ||
            q === "discount_type" ||
            q === "_elementor_data" ||
            q === "_wp_page_template"
          ) {
            productMetaKeys.add(q);
          }
        }
      }
    }

    if (inUsermetaInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q === "wpwd_capabilities" ||
          q === "wpwd_user_level" ||
          q === "nickname" ||
          q === "first_name" ||
          q === "last_name" ||
          q === "billing_first_name" ||
          q === "billing_last_name" ||
          q === "billing_email" ||
          q === "billing_phone" ||
          q === "billing_address_1" ||
          q === "billing_city" ||
          q === "billing_state" ||
          q === "billing_postcode" ||
          q === "billing_country" ||
          q === "shipping_first_name" ||
          q === "shipping_last_name" ||
          q === "shipping_address_1" ||
          q === "shipping_city" ||
          q === "shipping_state" ||
          q === "shipping_postcode" ||
          q === "shipping_country" ||
          q === "session_tokens" ||
          q === "rich_editing" ||
          q === "admin_color" ||
          q === "description" ||
          q === "last_update" ||
          q === "paying_customer" ||
          q === "_woocommerce_tracks_anon_id" ||
          q.startsWith("wpwd_") ||
          q.includes("capabilities")
        ) {
          userMetaKeys.add(q);
        }
      }
    }

    if (inWcOrdersInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (q.startsWith("wc-") || q === "pending" || q === "checkout-draft") {
          orderStatuses[q] = (orderStatuses[q] || 0) + 1;
        }
        if (q === "shop_order" || q === "shop_order_refund") {
          orderTypes[q] = (orderTypes[q] || 0) + 1;
        }
        if (
          q === "paytm" ||
          q === "cod" ||
          q === "bacs" ||
          q === "cheque" ||
          q === "paypal" ||
          q === "razorpay" ||
          q === "stripe" ||
          q === "ppcp-gateway" ||
          q.includes("paytm") ||
          q === "other"
        ) {
          paymentMethods[q] = (paymentMethods[q] || 0) + 1;
        }
      }
    }

    if (inWcOrdersMetaInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (q.startsWith("_") || q.includes("paytm") || q.includes("coupon") || q.includes("shipping")) {
          wcOrdersMetaKeys.add(q);
        }
      }
    }

    if (inOrderItemmetaInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q === "_product_id" ||
          q === "_variation_id" ||
          q === "_qty" ||
          q === "_tax_class" ||
          q === "_line_subtotal" ||
          q === "_line_subtotal_tax" ||
          q === "_line_total" ||
          q === "_line_tax" ||
          q === "_line_tax_data" ||
          q === "method_id" ||
          q === "instance_id" ||
          q === "cost" ||
          q === "total_tax" ||
          q === "taxes" ||
          q === "discount_amount" ||
          q === "discount_amount_tax" ||
          q === "coupon_info" ||
          q === "_reduced_stock" ||
          q.startsWith("pa_") ||
          q.startsWith("attribute_")
        ) {
          orderItemMetaKeys.add(q);
        }
      }
    }

    if (inOrderItemsInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q === "line_item" ||
          q === "shipping" ||
          q === "fee" ||
          q === "tax" ||
          q === "coupon"
        ) {
          itemTypes[q] = (itemTypes[q] || 0) + 1;
        }
      }
    }

    if (inTermmetaInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q === "order" ||
          q === "display_type" ||
          q === "thumbnail_id" ||
          q === "product_count_product_cat"
        ) {
          termMetaKeys.add(q);
        }
      }
    }

    if (inOptionsInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (
          q.includes("woocommerce") ||
          q.includes("hpos") ||
          q.includes("custom_orders") ||
          q === "siteurl" ||
          q === "home" ||
          q === "permalink_structure" ||
          q === "template" ||
          q === "stylesheet" ||
          q.includes("paytm") ||
          q.includes("custom_orders_table")
        ) {
          optionNames.add(q);
          if (q.includes("custom_orders") || q.includes("hpos") || q.includes("data_sync")) {
            hposEnabledHints.push(q);
          }
        }
      }
    }

    if (inOrderAddressesInsert) {
      const qs = extractQuotedStrings(t);
      for (const q of qs) {
        if (q === "billing" || q === "shipping") {
          addressTypes[q] = (addressTypes[q] || 0) + 1;
        }
      }
    }

    if (t.includes("woocommerce_custom_orders_table") || t.includes("hpos") || t.includes("custom_orders_table_enabled")) {
      if (t.length < 500) hposEnabledHints.push(t.slice(0, 400));
    }
  }

  const result = {
    tableCount: tables.length,
    tableNames: tables.map((t) => t.name),
    create: Object.fromEntries(tables.map((t) => [t.name, t.ddl])),
    alters,
    insertStatementCounts: insertCounts,
    approx: {
      postsRowCount,
      postmetaRowCount,
      usersRowCount,
      customerLookupCount,
      wcOrdersCount,
      orderItemsCount,
    },
    postTypes,
    taxonomies,
    productMetaKeys: [...productMetaKeys].sort(),
    userMetaKeys: [...userMetaKeys].sort(),
    wcOrdersMetaKeys: [...wcOrdersMetaKeys].sort().slice(0, 200),
    orderItemMetaKeys: [...orderItemMetaKeys].sort(),
    termMetaKeys: [...termMetaKeys].sort(),
    optionNames: [...optionNames].sort(),
    paymentMethods,
    orderStatuses,
    orderTypes,
    itemTypes,
    addressTypes,
    hposEnabledHints: hposEnabledHints.slice(0, 50),
  };

  fs.writeFileSync(path.join(outDir, "analysis.json"), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(outDir, "tables.txt"), tables.map((t) => t.name).join("\n"));
  console.log("TABLES", tables.length);
  console.log("POST_TYPES", JSON.stringify(postTypes, null, 2));
  console.log("TAXONOMIES", JSON.stringify(taxonomies, null, 2));
  console.log("ORDER_STATUSES", JSON.stringify(orderStatuses, null, 2));
  console.log("ORDER_TYPES", JSON.stringify(orderTypes, null, 2));
  console.log("PAYMENT_METHODS", JSON.stringify(paymentMethods, null, 2));
  console.log("ITEM_TYPES", JSON.stringify(itemTypes, null, 2));
  console.log("ADDRESS_TYPES", JSON.stringify(addressTypes, null, 2));
  console.log("APPROX", JSON.stringify(result.approx, null, 2));
  console.log("META_KEYS_COUNT", result.productMetaKeys.length);
  console.log("USER_META", result.userMetaKeys);
  console.log("ITEM_META", result.orderItemMetaKeys);
  console.log("TERM_META", result.termMetaKeys);
  console.log("OPTIONS sample", result.optionNames.slice(0, 80));
  console.log("HPOS HINTS", result.hposEnabledHints);
  console.log("WC_ORDERS_META sample", result.wcOrdersMetaKeys.slice(0, 80));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
